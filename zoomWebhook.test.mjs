import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createZoomWebhook, zoomUserHash, zoomUserIdFromAccessToken } from "./zoomWebhook.mjs";

const NOW = 1_793_300_000_000;
const signed = (secret, raw, at = NOW) => {
  const timestamp = String(Math.floor(at / 1000));
  return { "x-zm-request-timestamp": timestamp,
    "x-zm-signature": `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${raw}`).digest("hex")}` };
};

test("Zoom webhook answers endpoint validation with either configured secret", () => {
  const hook = createZoomWebhook({ secretTokens: ["dev-secret", "prod-secret"], now: () => NOW });
  const raw = JSON.stringify({ event: "endpoint.url_validation", payload: { plainToken: "abc" } });
  const result = hook.handle(raw, signed("prod-secret", raw));
  assert.equal(result.status, 200);
  assert.equal(result.body.encryptedToken, createHmac("sha256", "prod-secret").update("abc").digest("hex"));
});

test("Zoom deauthorization names the user to revoke; forged, stale or unconfigured requests do not", () => {
  const hook = createZoomWebhook({ secretTokens: ["dev-secret"], now: () => NOW });
  const raw = JSON.stringify({ event: "app_deauthorized", payload: { user_id: "AbCdEf123", account_id: "acc" } });
  assert.deepEqual(hook.handle(raw, signed("dev-secret", raw)).revoke, { userHash: zoomUserHash("AbCdEf123") });
  assert.equal(hook.handle(raw, signed("other", raw)).status, 401);
  assert.equal(hook.handle(raw, signed("dev-secret", raw, NOW - 10 * 60_000)).status, 401);
  assert.equal(hook.handle(raw + " ", signed("dev-secret", raw)).status, 401);
  assert.equal(createZoomWebhook({ secretTokens: [""] }).handle(raw, signed("dev-secret", raw)).status, 503);
});

test("the Zoom user ID is read from the access token payload", () => {
  const token = `x.${Buffer.from(JSON.stringify({ uid: "AbCdEf123", aid: "acc" })).toString("base64url")}.y`;
  assert.equal(zoomUserIdFromAccessToken(token), "AbCdEf123");
  assert.equal(zoomUserIdFromAccessToken("not-a-jwt"), null);
});
