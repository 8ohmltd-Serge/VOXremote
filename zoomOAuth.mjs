import { randomBytes } from "node:crypto";

const REDIRECT = "https://connect.voxordia.com/oauth/zoom/callback";
const TOKEN = "https://zoom.us/oauth/token";
const TTL = 5 * 60_000;

export function createZoomOAuth({ clientId, clientSecret, fetcher = fetch, now = Date.now } = {}) {
  const pending = new Map();
  const awaitingAck = new Map();
  const configured = Boolean(clientId && clientSecret);
  const send = (socket, data) => socket.readyState === 1 && socket.send(JSON.stringify(data));
  async function token(grant) {
    const body = new URLSearchParams({ ...grant, redirect_uri: REDIRECT });
    const response = await fetcher(TOKEN, { method: "POST", redirect: "error",
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded" },
      body, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`zoom_token_http_${response.status}`);
    const result = await response.json();
    if (!result.access_token || !result.refresh_token || !Number.isFinite(Number(result.expires_in))) {
      throw new Error("zoom_token_incomplete");
    }
    return result;
  }
  function start(socket, installationId, id) {
    if (!configured || !socket.voxEntitlements?.zoom || !/^[a-f0-9-]{36}$/.test(id ?? "")) {
      return send(socket, { type: "zoom-oauth-result", id, ok: false, error: "Zoom OAuth не настроен" });
    }
    const state = randomBytes(32).toString("base64url");
    pending.set(state, { socket, installationId, id, expiresAt: now() + TTL });
    const url = new URL("https://zoom.us/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT);
    url.searchParams.set("state", state);
    send(socket, { type: "zoom-oauth-result", id, ok: true, url: url.href });
  }
  async function callback(state, code, socketForInstallation) {
    const item = pending.get(state);
    pending.delete(state);
    if (!item || item.expiresAt < now() || !code ||
        socketForInstallation(item.installationId) !== item.socket || item.socket.readyState !== 1) return false;
    const credentials = await token({ grant_type: "authorization_code", code });
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { awaitingAck.delete(item.id); resolve(false); }, 10_000);
      awaitingAck.set(item.id, { socket: item.socket, resolve: (ok) => {
        clearTimeout(timeout); awaitingAck.delete(item.id); resolve(ok);
      } });
      send(item.socket, { type: "zoom-oauth-authorized", id: item.id,
        accessToken: credentials.access_token, refreshToken: credentials.refresh_token,
        expiresIn: credentials.expires_in, userId: "me" });
    });
  }
  function ack(socket, id, ok) {
    const item = awaitingAck.get(id);
    if (item?.socket === socket) item.resolve(ok === true);
  }
  async function refresh(socket, id, refreshToken) {
    if (!configured || !socket.voxEntitlements?.zoom || typeof refreshToken !== "string" ||
        refreshToken.length > 4096) {
      send(socket, { type: "zoom-oauth-result", id, ok: false, error: "Обновление Zoom недоступно" });
      return;
    }
    try {
      const result = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
      send(socket, { type: "zoom-oauth-result", id, ok: true,
        accessToken: result.access_token, refreshToken: result.refresh_token, expiresIn: result.expires_in });
    } catch {
      send(socket, { type: "zoom-oauth-result", id, ok: false, error: "Zoom отклонил обновление учётной записи" });
    }
  }
  function sweep() { for (const [state, item] of pending) if (item.expiresAt < now()) pending.delete(state); }
  return { start, callback, ack, refresh, sweep, configured };
}
