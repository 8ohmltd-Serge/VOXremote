import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { WebSocketServer } from "ws";
import { normalizeRemoteCode, validateTunnelHello } from "./protocol.mjs";
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
  const id = randomUUID();
  const timer = setTimeout(() => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    json(response, 504, { error: "Сервер конференции не ответил вовремя" });
    if (socket.readyState === 1) socket.send(JSON.stringify({ type: "cancel", id }));
  }, 30_000);
  timer.unref?.();
  pending.set(id, { response, installationId, started: false, timer });
  response.on("close", () => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    clearTimeout(item.timer);
    if (socket.readyState === 1) socket.send(JSON.stringify({ type: "cancel", id }));
  });
  socket.send(JSON.stringify({ type: "request", id, ...input }));
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
    task.then(() => socket.send(JSON.stringify({ type: "ack", id: message.id, ok: true })))
      .catch(() => socket.send(JSON.stringify({ type: "ack", id: message.id, ok: false })));
    return;
  }
  if (!["response-start", "response-chunk", "response-end"].includes(message.type)) return;
  const item = pending.get(message.id);
  if (!item || item.installationId !== installationId) return;
  if (message.type === "response-start") {
    clearTimeout(item.timer);
    const headers = {};
    for (const [name, value] of Object.entries(message.headers ?? {})) {
      if (["content-type", "cache-control", "etag", "last-event-id"].includes(name.toLowerCase())) headers[name] = value;
    }
    item.response.writeHead(Number(message.status) || 502, headers);
    item.started = true;
  } else if (message.type === "response-chunk") {
    if (typeof message.data === "string") item.response.write(Buffer.from(message.data, "base64"));
  } else {
    pending.delete(message.id);
    clearTimeout(item.timer);
    item.response.end();
  }
}

const handleHttp = async (request, response) => {
  securityHeaders(response);
  const url = new URL(request.url, "https://connect.voxordia.com");
  if (request.method === "GET" && url.pathname === "/health") {
    return json(response, 200, { service: "voxordia-remote-gateway", ready: true });
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
      socket.send(JSON.stringify({ type: "welcome", installationId }));
      return;
    }
    handleConnectorFrame(socket, installationId, message);
  };
  socket.on("message", (raw) => processFrame(raw).catch(() => socket.close(1011, "gateway error")));
  socket.on("close", () => {
    clearTimeout(timeout);
    if (installationId && live.get(installationId) === socket) live.delete(installationId);
    for (const [id, item] of pending) if (item.installationId === installationId) {
      pending.delete(id);
      clearTimeout(item.timer);
      if (!item.response.headersSent) json(item.response, 503, { error: "Связь с сервером конференции потеряна" });
      else item.response.end();
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

