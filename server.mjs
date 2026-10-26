import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { WebSocketServer } from "ws";
import { recoverPendingRequestsForSocketClose } from "./pendingRequests.mjs";
import { GATEWAY_CAPABILITIES, normalizeRemoteCode, validateTunnelHello } from "./protocol.mjs";
import { codeTableForPurpose, sessionTableForPath } from "./codePurpose.mjs";
import { resolveStaticPath } from "./staticPath.mjs";

const base = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8080);
const databaseUrl = process.env.DATABASE_URL;
const vendorKeyPath = process.env.VENDOR_PUBLIC_KEY_PATH;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const vendorKeyText = process.env.VENDOR_PUBLIC_KEY_BASE64
  ? Buffer.from(process.env.VENDOR_PUBLIC_KEY_BASE64, "base64").toString("utf8")
  : vendorKeyPath && existsSync(vendorKeyPath) ? readFileSync(vendorKeyPath, "utf8") : "";
if (!vendorKeyText.includes("-----BEGIN PUBLIC KEY-----")) {
  throw new Error("VENDOR_PUBLIC_KEY_BASE64 or VENDOR_PUBLIC_KEY_PATH is required");
}
const vendorPublicKeys = vendorKeyText.split(/(?=-----BEGIN PUBLIC KEY-----)/)
  .map((value) => value.trim()).filter(Boolean);
const pool = new pg.Pool({ connectionString: databaseUrl, ssl: process.env.PGSSL === "disable" ? false :
  process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined });
await pool.query(readFileSync(path.join(base, "schema.sql"), "utf8"));

const live = new Map();
const pending = new Map();
const MAX_INVITATION_RESPONSE_BYTES = 64 * 1024;
const attempts = new Map();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (response, status, body, headers = {}) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(body));
};
const securityHeaders = (response) => {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("permissions-policy", "camera=(self), microphone=(self), display-capture=(self)");
  response.setHeader("content-security-policy", "default-src 'self'; connect-src 'self' wss:; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:");
};

function clientIp(request) {
  if (process.env.TRUST_PROXY === "1") return String(request.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || request.socket.remoteAddress;
  return request.socket.remoteAddress;
}

function rateAllowed(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((at) => now - at < 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length <= 10;
}

async function readBody(request, maximum = 2 * 1024 * 1024) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maximum) throw Object.assign(new Error("request_too_large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function cookie(request, name) {
  return String(request.headers.cookie ?? "").split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

function sendRequest(installationId, input, response) {
  const socket = live.get(installationId);
  if (!socket || socket.readyState !== 1) {
    json(response, 503, { error: "Сервер конференции временно недоступен" });
    return;
  }
  const timeoutMs = Math.min(60_000, Math.max(5_000, Number(input.timeoutMs) || 30_000));
  const armTimeout = (item) => {
    clearTimeout(item.timer);
    const requestId = item.id;
    item.timer = setTimeout(() => {
      if (pending.get(requestId) !== item) return;
      pending.delete(requestId);
      if (item.started) {
        // Headers may already have been sent. Destroy the stalled response
        // instead of trying to write a second JSON response after commitment.
        response.destroy(new Error("Сервер конференции не завершил ответ вовремя"));
      } else json(response, 504, { error: "Сервер конференции не завершил ответ вовремя" });
      if (item.socket?.readyState === 1) item.socket.send(JSON.stringify({ type: "cancel", id: requestId }));
    }, timeoutMs);
    item.timer.unref?.();
  };
  const bufferResponse = /^\/api\/v1\/invitations\/(?:lookup|respond)$/.test(input.path ?? "");
  const item = { id: randomUUID(), response, installationId, socket, input, path: input.path, started: false, timer: null, timeoutMs,
    bufferResponse, retryOnReconnect: bufferResponse, maxRetries: bufferResponse ? 1 : 0, retries: 0,
    awaitingReconnect: false, upstreamStatus: null, upstreamHeaders: {}, responseChunks: [], responseBytes: 0 };
  const sendWithSocket = (nextSocket, retry = false) => {
    if (retry) {
      if (pending.get(item.id) === item) pending.delete(item.id);
      // A retried request gets a fresh ID so delayed frames from the failed
      // tunnel attempt cannot complete or cancel the new attempt.
      item.id = randomUUID();
      pending.set(item.id, item);
    }
    item.socket = nextSocket;
    item.awaitingReconnect = false;
    item.started = false;
    item.upstreamStatus = null;
    item.upstreamHeaders = {};
    item.responseChunks = [];
    item.responseBytes = 0;
    armTimeout(item);
    try {
      if (nextSocket?.readyState !== 1) throw new Error("connector_not_ready");
      nextSocket.send(JSON.stringify({ type: "request", id: item.id, ...input }));
    } catch {
      item.socket = null;
      item.awaitingReconnect = true;
    }
  };
  item.retryWithSocket = (nextSocket) => sendWithSocket(nextSocket, true);
  item.armTimeout = () => armTimeout(item);
  pending.set(item.id, item);
  armTimeout(item);
  response.on("close", () => {
    const pendingItem = pending.get(item.id);
    if (!pendingItem) return;
    pending.delete(pendingItem.id);
    clearTimeout(pendingItem.timer);
    if (pendingItem.socket?.readyState === 1) {
      pendingItem.socket.send(JSON.stringify({ type: "cancel", id: pendingItem.id }));
    }
  });
  sendWithSocket(socket);
}

function handleConnectorFrame(socket, installationId, message) {
  if (message.type === "keepalive") {
    socket.send(JSON.stringify({ type: "keepalive-ack", at: new Date().toISOString() }));
    return;
  }
  if (message.type === "code-sync") {
    const validDigest = /^[a-f0-9]{64}$/.test(message.codeDigest ?? "");
    const table = codeTableForPurpose(message.purpose);
    const expires = Date.parse(message.expiresAt);
    const validExpiry = Number.isFinite(expires) && expires > Date.now() && expires < Date.now() + 48 * 60 * 60 * 1000;
    const task = message.action === "revoke" && validDigest && table
      ? pool.query(`DELETE FROM ${table} WHERE code_digest=$1 AND installation_id=$2`, [message.codeDigest, installationId])
      : message.action === "publish" && validDigest && validExpiry && table
        ? pool.query(`INSERT INTO ${table}(code_digest,installation_id,expires_at) VALUES($1,$2,$3)
          ON CONFLICT(code_digest) DO UPDATE SET installation_id=excluded.installation_id,
          expires_at=excluded.expires_at,updated_at=now()`, [message.codeDigest, installationId, message.expiresAt])
        : Promise.reject(new Error("invalid_code_sync"));
    task.then(() => socket.send(JSON.stringify({ type: "ack", id: message.id, purpose: message.purpose, ok: true })))
      .catch(() => socket.send(JSON.stringify({ type: "ack", id: message.id, purpose: message.purpose, ok: false })));
    return;
  }
  if (!["response-start", "response-chunk", "response-end"].includes(message.type)) return;
  const item = pending.get(message.id);
  if (!item || item.installationId !== installationId || item.socket !== socket) return;
  if (message.type === "response-start") {
    item.armTimeout();
    item.upstreamStatus = Number(message.status) || 502;
    const headers = {};
    for (const [name, value] of Object.entries(message.headers ?? {})) {
      if (["content-type", "cache-control", "etag", "last-event-id"].includes(name.toLowerCase())) headers[name] = value;
    }
    item.upstreamHeaders = headers;
    if (!item.bufferResponse) {
      item.response.writeHead(item.upstreamStatus, headers);
      item.started = true;
    }
  } else if (message.type === "response-chunk") {
    item.armTimeout();
    if (typeof message.data === "string") {
      const chunk = Buffer.from(message.data, "base64");
      item.responseBytes += chunk.length;
      if (item.bufferResponse) {
        if (item.responseBytes <= MAX_INVITATION_RESPONSE_BYTES) item.responseChunks.push(chunk);
      } else item.response.write(chunk);
    }
  } else {
    if (item.bufferResponse && item.responseBytes === 0 &&
        (item.upstreamStatus === null || (item.upstreamStatus >= 200 && item.upstreamStatus < 300)) &&
        item.retries < item.maxRetries) {
      item.retries += 1;
      console.warn(JSON.stringify({ event: "invitation_proxy_retry", path: item.path,
        reason: item.upstreamStatus === null ? "response_ended_without_start" : "empty_response" }));
      item.retryWithSocket(socket);
      return;
    }
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (/^\/api\/v1\/invitations\/(?:lookup|respond)$/.test(item.path ?? "")) {
      console.log(JSON.stringify({ event: "invitation_proxy_response", path: item.path,
        status: item.upstreamStatus, bytes: item.responseBytes, retries: item.retries }));
    }
    if (item.bufferResponse) {
      if (item.responseBytes > MAX_INVITATION_RESPONSE_BYTES ||
          (item.responseBytes === 0 && (item.upstreamStatus === null ||
            (item.upstreamStatus >= 200 && item.upstreamStatus < 300)))) {
        return json(item.response, 502, { error: "Не удалось проверить приглашение" });
      }
      item.response.writeHead(item.upstreamStatus ?? 502, item.upstreamHeaders);
      item.started = true;
      item.response.end(Buffer.concat(item.responseChunks));
      return;
    }
    item.response.end();
  }
}

const handleHttp = async (request, response) => {
  securityHeaders(response);
  const url = new URL(request.url, "https://connect.voxordia.com");
  if (request.method === "GET" && url.pathname === "/health") {
    return json(response, 200, { service: "voxordia-remote-gateway", ready: true });
  }
  if (request.method === "POST" && ["/api/invitations/lookup", "/api/invitations/respond"].includes(url.pathname)) {
    if (!rateAllowed(clientIp(request))) return json(response, 429, { error: "Слишком много попыток. Повторите позже." });
    try {
      const body = JSON.parse((await readBody(request, 4096)).toString("utf8"));
      const installationId = String(body.installationId ?? "");
      const token = String(body.token ?? "");
      if (!/^[a-z0-9-]{3,64}$/.test(installationId) || !/^[A-Za-z0-9_-]{43}$/.test(token) ||
          (url.pathname.endsWith("/respond") && !["accepted", "declined"].includes(body.response))) {
        return json(response, 400, { error: "Ссылка приглашения недействительна" });
      }
      if (!live.has(installationId)) return json(response, 503, { error: "Сервер конференции временно недоступен" });
      const action = url.pathname.endsWith("/respond") ? "respond" : "lookup";
      sendRequest(installationId, { method: "POST", path: `/api/v1/invitations/${action}`,
        headers: { "content-type": "application/json" },
        bodyBase64: Buffer.from(JSON.stringify(action === "respond"
          ? { token, response: body.response } : { token })).toString("base64") }, response);
    } catch (error) {
      return json(response, error.status ?? 400, { error: "Не удалось проверить приглашение" });
    }
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/uc/claim") {
    if (!rateAllowed(clientIp(request))) return json(response, 429, { error: "Слишком много попыток. Повторите позже." });
    try {
      const body = JSON.parse((await readBody(request, 4096)).toString("utf8"));
      const code = normalizeRemoteCode(body.code);
      if (!/^[2-9A-HJ-NP-Z]{12}$/.test(code)) return json(response, 401, { error: "Недействительный код организатора" });
      const found = await pool.query("SELECT installation_id FROM uc_organizer_codes WHERE code_digest=$1 AND expires_at>now()", [sha256(code)]);
      if (found.rowCount !== 1) return json(response, 401, { error: "Код организатора не найден или отозван" });
      const installationId = found.rows[0].installation_id;
      if (!live.has(installationId)) return json(response, 503, { error: "Сервер конференции временно недоступен" });
      const proxyResponse = {
        headers: {}, statusCode: 200, chunks: [], headersSent: false,
        setHeader(name, value) { this.headers[name] = value; },
        writeHead(status, headers = {}) { this.statusCode = status; this.headersSent = true; Object.assign(this.headers, headers); },
        write(chunk) { this.chunks.push(Buffer.from(chunk)); },
        async end(chunk) {
          if (chunk) this.write(chunk);
          let result;
          try { result = JSON.parse(Buffer.concat(this.chunks).toString("utf8")); }
          catch { result = { error: "Некорректный ответ сервера конференции" }; }
          if (this.statusCode >= 200 && this.statusCode < 300 && typeof result.token === "string") {
            const session = randomBytes(32).toString("base64url");
            try {
              await pool.query("INSERT INTO uc_organizer_sessions(session_digest,installation_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
                [sha256(session), installationId]);
            } catch { return json(response, 503, { error: "Не удалось создать защищённую сессию организатора" }); }
            response.setHeader("set-cookie", `vox_uc_session=${session}; Path=/api/v1/uc-organizer/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);
          }
          json(response, this.statusCode, result);
        }, on() {}
      };
      sendRequest(installationId, { method: "POST", path: "/api/v1/uc-organizer/code-login",
        headers: { "content-type": "application/json" },
        bodyBase64: Buffer.from(JSON.stringify({ code })).toString("base64") }, proxyResponse);
    } catch (error) { return json(response, error.status ?? 400, { error: "Не удалось обработать код организатора" }); }
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/remote/claim") {
    const ip = clientIp(request);
    if (!rateAllowed(ip)) return json(response, 429, { error: "Слишком много попыток. Повторите позже." });
    try {
      const body = JSON.parse((await readBody(request, 4096)).toString("utf8"));
      const code = normalizeRemoteCode(body.code);
      if (!/^[2-9A-HJ-NP-Z]{10}$/.test(code)) {
        return json(response, 401, { error: "Код должен содержать 10 латинских букв или цифр" });
      }
      const found = await pool.query("SELECT installation_id FROM remote_codes WHERE code_digest=$1 AND expires_at>now()", [sha256(code)]);
      if (found.rowCount !== 1) return json(response, 401, { error: "Код не найден или отозван" });
      if (!live.has(found.rows[0].installation_id)) {
        return json(response, 503, { error: "Сервер конференции временно недоступен. Повторите через несколько секунд." });
      }
      const installationId = found.rows[0].installation_id;
      const proxyResponse = {
        headers: {}, statusCode: 200, chunks: [], headersSent: false,
        setHeader(name, value) { this.headers[name] = value; },
        writeHead(status, headers = {}) { this.statusCode = status; this.headersSent = true; Object.assign(this.headers, headers); },
        write(chunk) { this.chunks.push(Buffer.from(chunk)); },
        async end(chunk) {
          if (chunk) this.write(chunk);
          const raw = Buffer.concat(this.chunks);
          let result;
          try { result = JSON.parse(raw.toString("utf8")); } catch { result = { error: "Некорректный ответ сервера конференции" }; }
          if (this.statusCode >= 200 && this.statusCode < 300 && typeof result.token === "string") {
            const session = randomBytes(32).toString("base64url");
            try {
              await pool.query("INSERT INTO remote_sessions(session_digest,installation_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",
                [sha256(session), installationId]);
            } catch {
              json(response, 503, { error: "Не удалось создать защищённую удалённую сессию" });
              return;
            }
            response.setHeader("set-cookie", `vox_remote_session=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
          }
          json(response, this.statusCode, result);
        },
        on() {}
      };
      sendRequest(installationId, { method: "POST", path: "/api/v1/remote-access/code-login",
        headers: { "content-type": "application/json" }, bodyBase64: Buffer.from(JSON.stringify({ code })).toString("base64") }, proxyResponse);
    } catch (error) { return json(response, error.status ?? 400, { error: "Не удалось обработать код" }); }
    return;
  }
  if (url.pathname.startsWith("/api/v1/uc-organizer/")) {
    if (sessionTableForPath(url.pathname) !== "uc_organizer_sessions") return json(response, 404, { error: "Некорректный путь панели" });
    if (url.pathname === "/api/v1/uc-organizer/code-login") return json(response, 404, { error: "Используйте страницу приглашения" });
    const session = cookie(request, "vox_uc_session");
    if (!session) return json(response, 401, { error: "Требуется сессия организатора" });
    const found = await pool.query("SELECT installation_id FROM uc_organizer_sessions WHERE session_digest=$1 AND expires_at>now()", [sha256(session)]);
    if (found.rowCount !== 1) return json(response, 401, { error: "Сессия организатора истекла" });
    try {
      const body = await readBody(request, 8_192);
      const token = request.headers["x-vox-uc-session"];
      if (typeof token !== "string" || token.length < 32 || token.length > 256) {
        return json(response, 401, { error: "Требуется токен организатора" });
      }
      sendRequest(found.rows[0].installation_id, { method: request.method, path: url.pathname,
        headers: { "x-vox-uc-session": token, "content-type": "application/json" },
        bodyBase64: body.toString("base64") }, response);
    } catch (error) { json(response, error.status ?? 400, { error: error.message }); }
    return;
  }
  if (url.pathname.startsWith("/api/v1/")) {
    if (sessionTableForPath(url.pathname) !== "remote_sessions") return json(response, 404, { error: "Некорректный удалённый путь" });
    const session = cookie(request, "vox_remote_session");
    if (!session) return json(response, 401, { error: "Требуется удалённая сессия" });
    const found = await pool.query("SELECT installation_id FROM remote_sessions WHERE session_digest=$1 AND expires_at>now()", [sha256(session)]);
    if (found.rowCount !== 1) return json(response, 401, { error: "Удалённая сессия истекла" });
    try {
      const body = await readBody(request);
      const headers = {};
      for (const name of ["authorization", "content-type", "accept", "last-event-id", "if-none-match"]) {
        if (typeof request.headers[name] === "string") headers[name] = request.headers[name];
      }
      sendRequest(found.rows[0].installation_id, { method: request.method, path: `${url.pathname}${url.search}`,
        headers, bodyBase64: body.toString("base64") }, response);
    } catch (error) { json(response, error.status ?? 400, { error: error.message }); }
    return;
  }
  if (url.pathname === "/conference/" || url.pathname === "/conference") {
    response.writeHead(302, { location: "/" }); response.end(); return;
  }
  const portalRoot = path.join(base, "public");
  const clientRoot = existsSync(path.join(portalRoot, "client")) ? path.join(portalRoot, "client") :
    path.resolve(base, "../../v0.7.0/public/client");
  const target = resolveStaticPath(url.pathname, portalRoot, clientRoot);
  if (!target || !existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404); response.end("Not found"); return;
  }
  const type = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".mjs": "text/javascript; charset=utf-8" }[path.extname(target)] ?? "application/octet-stream";
  response.writeHead(200, { "content-type": type, "cache-control": target.endsWith("index.html") ? "no-store" : "public,max-age=300" });
  createReadStream(target).pipe(response);
};
const server = createServer((request, response) => {
  handleHttp(request, response).catch(() => {
    if (!response.headersSent) json(response, 503, { error: "Сервис Remote временно недоступен" });
    else response.destroy();
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 3 * 1024 * 1024 });
server.on("upgrade", (request, socket, head) => {
  if (new URL(request.url, "https://connect.voxordia.com").pathname !== "/gateway/connect") return socket.destroy();
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws));
});
wss.on("connection", (socket) => {
  let installationId = null;
  const timeout = setTimeout(() => socket.close(1008, "hello required"), 10_000);
  const processFrame = async (raw) => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); } catch { socket.close(1003, "invalid json"); return; }
    if (!installationId) {
      const result = validateTunnelHello(message, vendorPublicKeys);
      if (!result.ok) { socket.close(1008, result.reason); return; }
      installationId = result.installationId;
      clearTimeout(timeout);
      const registered = await pool.query(`INSERT INTO remote_installations(installation_id,public_key,public_key_sha256,license_revision,
        license_expires_at,media_public_ip,media_port_min,media_port_max,last_nonce,last_hello_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(installation_id) DO UPDATE SET
        public_key=excluded.public_key,public_key_sha256=excluded.public_key_sha256,
        license_revision=excluded.license_revision,license_expires_at=excluded.license_expires_at,
        media_public_ip=excluded.media_public_ip,media_port_min=excluded.media_port_min,
        media_port_max=excluded.media_port_max,last_nonce=excluded.last_nonce,
        last_hello_at=excluded.last_hello_at,connected_at=now(),updated_at=now()
        WHERE remote_installations.last_hello_at < excluded.last_hello_at
          AND remote_installations.last_nonce <> excluded.last_nonce
        RETURNING installation_id`,
      [installationId, result.installationPublicKey, sha256(result.installationPublicKey.replace(/\r/g, "").trim()),
        result.licenseRevision, result.licenseExpiresAt, result.media.publicIp, result.media.portMin,
        result.media.portMax, result.nonce, new Date(result.issuedAt).toISOString()]);
      if (registered.rowCount !== 1) { socket.close(1008, "replayed_hello"); return; }
      const previous = live.get(installationId);
      if (previous && previous !== socket) previous.close(1012, "replaced");
      live.set(installationId, socket);
      socket.send(JSON.stringify({ type: "welcome", installationId, capabilities: GATEWAY_CAPABILITIES }));
      for (const [id, item] of pending) {
        if (item.installationId === installationId && item.awaitingReconnect) item.retryWithSocket(socket);
      }
      return;
    }
    handleConnectorFrame(socket, installationId, message);
  };
  socket.on("message", (raw) => processFrame(raw).catch(() => socket.close(1011, "gateway error")));
  socket.on("close", () => {
    clearTimeout(timeout);
    if (installationId && live.get(installationId) === socket) live.delete(installationId);
    const recovered = recoverPendingRequestsForSocketClose(pending, socket);
    for (const { item } of recovered.retry) {
      console.warn(JSON.stringify({ event: "invitation_proxy_retry", path: item.path, reason: "connector_reconnected" }));
      const currentSocket = live.get(installationId);
      if (currentSocket && currentSocket !== socket) item.retryWithSocket(currentSocket);
      else item.armTimeout();
    }
    for (const item of recovered.failed) {
      if (!item.response.headersSent) json(item.response, 503, { error: "Связь с сервером конференции потеряна" });
      else item.response.destroy(new Error("Связь с сервером конференции потеряна"));
    }
  });
});

setInterval(() => {
  pool.query("DELETE FROM remote_codes WHERE expires_at<=now(); DELETE FROM remote_sessions WHERE expires_at<=now(); DELETE FROM uc_organizer_codes WHERE expires_at<=now(); DELETE FROM uc_organizer_sessions WHERE expires_at<=now()")
    .catch(() => {});
  const cutoff = Date.now() - 60_000;
  for (const [ip, values] of attempts) {
    const current = values.filter((at) => at >= cutoff);
    if (current.length) attempts.set(ip, current); else attempts.delete(ip);
  }
}, 60_000).unref();
server.listen(port, "0.0.0.0", () => console.log(`VOXORDIA Remote gateway listening on :${port}`));

