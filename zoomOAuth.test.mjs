import test from "node:test";
import assert from "node:assert/strict";
import { createZoomOAuth } from "./zoomOAuth.mjs";

function fixture() {
  const sent = [];
  const socket = { readyState: 1, voxEntitlements: { zoom: true },
    send: (raw) => sent.push(JSON.parse(raw)) };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({
      access_token: "access", refresh_token: "refresh-next", expires_in: 3600 }) };
  };
  return { socket, sent, calls, oauth: createZoomOAuth({ clientId: "client", clientSecret: "secret", fetcher }) };
}

test("Zoom callback binds to authenticated installation and transfers tokens only through its socket", async () => {
  const { oauth, socket, sent, calls } = fixture();
  oauth.start(socket, "customer-one", "a".repeat(36));
  const link = new URL(sent[0].url);
  assert.equal(link.origin, "https://zoom.us");
  assert.equal(link.searchParams.get("redirect_uri"), "https://connect.voxordia.com/oauth/zoom/callback");
  const state = link.searchParams.get("state");
  assert.equal(await oauth.callback(state, "code", () => null), false);
  assert.equal(calls.length, 0);
  oauth.start(socket, "customer-one", "b".repeat(36));
  const state2 = new URL(sent.at(-1).url).searchParams.get("state");
  const completion = oauth.callback(state2, "code", () => socket);
  await new Promise((resolve) => setImmediate(resolve));
  const authorized = sent.at(-1);
  assert.equal(authorized.type, "zoom-oauth-authorized");
  assert.equal(authorized.userId, "me");
  oauth.ack(socket, authorized.id, true);
  assert.equal(await completion, true);
  assert.equal(await oauth.callback(state2, "code", () => socket), false);
});

test("Zoom refresh returns rotated token to authorized socket", async () => {
  const { oauth, socket, sent } = fixture();
  await oauth.refresh(socket, "request", "old-refresh");
  assert.deepEqual({ type: sent[0].type, ok: sent[0].ok, refreshToken: sent[0].refreshToken },
    { type: "zoom-oauth-result", ok: true, refreshToken: "refresh-next" });
  socket.voxEntitlements.zoom = false;
  await oauth.refresh(socket, "denied", "old-refresh");
  assert.equal(sent.at(-1).ok, false);
});
