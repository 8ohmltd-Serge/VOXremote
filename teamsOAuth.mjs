import { createHash, randomBytes } from "node:crypto";

const REDIRECT = "https://connect.voxordia.com/oauth/teams/callback";
const AUTHORITY = "https://login.microsoftonline.com/organizations/oauth2/v2.0";
// Calendar events create Teams meetings in the organizer's Outlook calendar.
// OnlineMeetings.ReadWrite is unnecessary for this delegated path.
const SCOPES = "openid profile offline_access User.Read Calendars.ReadWrite";
const TTL = 5 * 60_000;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const send = (socket, data) => socket.readyState === 1 && socket.send(JSON.stringify(data));
const claim = (token, name) => {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))[name]; }
  catch { return null; }
};

/** One VOXORDIA multitenant Entra app; no tenant app secret enters VOX-S. */
export function createTeamsOAuth({ clientId, clientSecret, fetcher = fetch, now = Date.now } = {}) {
  const configured = Boolean(GUID.test(clientId ?? "") && clientSecret);
  const pending = new Map();
  const awaitingAck = new Map();

  async function token(grant) {
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
      scope: SCOPES, ...grant });
    const response = await fetcher(`${AUTHORITY}/token`, { method: "POST", redirect: "error",
      headers: { "content-type": "application/x-www-form-urlencoded" }, body,
      signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`teams_token_http_${response.status}`);
    const result = await response.json();
    if (typeof result.access_token !== "string" || typeof result.refresh_token !== "string" ||
        !Number.isFinite(Number(result.expires_in))) throw new Error("teams_token_incomplete");
    return result;
  }

  function start(socket, installationId, id) {
    if (!configured || !socket.voxEntitlements?.teams || !GUID.test(id ?? "")) {
      send(socket, { type: "teams-oauth-result", id, ok: false, error: "Teams OAuth недоступен" });
      return;
    }
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(24).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    pending.set(state, { socket, installationId, id, verifier, nonce, expiresAt: now() + TTL });
    const url = new URL(`${AUTHORITY}/authorize`);
    for (const [key, value] of Object.entries({ client_id: clientId, response_type: "code",
      redirect_uri: REDIRECT, response_mode: "query", scope: SCOPES, state, nonce,
      code_challenge: challenge, code_challenge_method: "S256" })) url.searchParams.set(key, value);
    send(socket, { type: "teams-oauth-result", id, ok: true, url: url.href });
  }

  async function callback(state, code, socketForInstallation) {
    const item = pending.get(state);
    pending.delete(state);
    if (!item || item.expiresAt < now() || !code ||
        socketForInstallation(item.installationId) !== item.socket || item.socket.readyState !== 1) return false;
    const credentials = await token({ grant_type: "authorization_code", code,
      redirect_uri: REDIRECT, code_verifier: item.verifier });
    // Graph access tokens belong to Graph and must be treated as opaque here.
    // The ID token is returned to our confidential client by this code exchange.
    const tenantId = claim(credentials.id_token ?? "", "tid");
    if (!GUID.test(tenantId ?? "") || claim(credentials.id_token ?? "", "aud") !== clientId ||
        claim(credentials.id_token ?? "", "nonce") !== item.nonce) {
      throw new Error("teams_identity_invalid");
    }
    const profileResponse = await fetcher("https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName", {
      redirect: "error", headers: { authorization: `Bearer ${credentials.access_token}` },
      signal: AbortSignal.timeout(10_000) });
    if (!profileResponse.ok) throw new Error(`teams_profile_http_${profileResponse.status}`);
    const profile = await profileResponse.json();
    if (!GUID.test(profile?.id ?? "")) throw new Error("teams_profile_invalid");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { awaitingAck.delete(item.id); resolve(false); }, 10_000);
      awaitingAck.set(item.id, { socket: item.socket, resolve: (ok) => {
        clearTimeout(timeout); awaitingAck.delete(item.id); resolve(ok);
      } });
      send(item.socket, { type: "teams-oauth-authorized", id: item.id,
        accessToken: credentials.access_token, refreshToken: credentials.refresh_token,
        expiresIn: credentials.expires_in, tenantId, userId: profile.id,
        displayName: String(profile.displayName ?? "").slice(0, 160),
        email: String(profile.userPrincipalName ?? "").slice(0, 320) });
    });
  }

  function ack(socket, id, ok) {
    const item = awaitingAck.get(id);
    if (item?.socket === socket) item.resolve(ok === true);
  }

  async function refresh(socket, id, refreshToken) {
    if (!configured || !socket.voxEntitlements?.teams || typeof refreshToken !== "string" ||
        !refreshToken || refreshToken.length > 4096) {
      send(socket, { type: "teams-oauth-result", id, ok: false, error: "Обновление Teams недоступно" });
      return;
    }
    try {
      const result = await token({ grant_type: "refresh_token", refresh_token: refreshToken });
      send(socket, { type: "teams-oauth-result", id, ok: true,
        accessToken: result.access_token, refreshToken: result.refresh_token,
        expiresIn: result.expires_in });
    } catch {
      send(socket, { type: "teams-oauth-result", id, ok: false,
        error: "Microsoft отклонил обновление. Подключите учётную запись снова" });
    }
  }

  function sweep() {
    for (const [state, item] of pending) if (item.expiresAt < now()) pending.delete(state);
  }
  return { configured, start, callback, ack, refresh, sweep };
}
