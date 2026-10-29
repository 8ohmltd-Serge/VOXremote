import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60_000;
export const zoomUserHash = (userId) => createHash("sha256").update(`zoom-user:${userId}`).digest("hex");

/** The Zoom user ID carried in a Zoom OAuth access token (a JWT issued by Zoom over TLS). */
export function zoomUserIdFromAccessToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.uid === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(payload.uid) ? payload.uid : null;
  } catch { return null; }
}

/**
 * Zoom app webhooks: endpoint validation and app_deauthorized. Every request
 * must carry a valid x-zm-signature for one of the configured secret tokens
 * (development and production apps have their own).
 */
export function createZoomWebhook({ secretTokens = [], now = Date.now } = {}) {
  const secrets = secretTokens.filter(Boolean);
  const sign = (secret, value) => createHmac("sha256", secret).update(value).digest("hex");
  function verified(raw, headers) {
    const timestamp = String(headers["x-zm-request-timestamp"] ?? "");
    const signature = String(headers["x-zm-signature"] ?? "");
    if (!/^\d{10}$/.test(timestamp) || Math.abs(now() - Number(timestamp) * 1000) > MAX_SKEW_MS) return null;
    const expected = Buffer.from(signature);
    for (const secret of secrets) {
      const candidate = Buffer.from(`v0=${sign(secret, `v0:${timestamp}:${raw}`)}`);
      if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return secret;
    }
    return null;
  }
  /** Returns the HTTP reply and, for a deauthorization, the Zoom user whose tokens must be deleted. */
  function handle(raw, headers) {
    if (!secrets.length) return { status: 503, body: { error: "webhook_not_configured" } };
    const secret = verified(raw, headers);
    if (!secret) return { status: 401, body: { error: "invalid_signature" } };
    let event;
    try { event = JSON.parse(raw); } catch { return { status: 400, body: { error: "invalid_json" } }; }
    if (event.event === "endpoint.url_validation") {
      const plainToken = String(event.payload?.plainToken ?? "");
      if (!plainToken || plainToken.length > 256) return { status: 400, body: { error: "invalid_token" } };
      return { status: 200, body: { plainToken, encryptedToken: sign(secret, plainToken) } };
    }
    if (event.event === "app_deauthorized") {
      const userId = String(event.payload?.user_id ?? "");
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(userId)) return { status: 400, body: { error: "invalid_user" } };
      return { status: 200, body: { ok: true }, revoke: { userHash: zoomUserHash(userId) } };
    }
    return { status: 200, body: { ignored: true } };
  }
  return { handle, configured: secrets.length > 0 };
}
