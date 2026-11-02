import test from "node:test";
import assert from "node:assert/strict";
import { createTeamsOAuth } from "./teamsOAuth.mjs";

const guid = "11111111-2222-4333-8444-555555555555";
const person = "22222222-3333-4444-8555-666666666666";
const accessToken = "opaque-graph-access";

function fixture() {
  const sent = [];
  const calls = [];
  let nonce = "";
  const socket = { readyState: 1, voxEntitlements: { teams: true },
    send: (raw) => sent.push(JSON.parse(raw)) };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.includes("/me?") ?
      { id: person, displayName: "Test User", userPrincipalName: "test@example.org" } :
      { access_token: accessToken, refresh_token: "rotated", expires_in: 3600,
        id_token: `x.${Buffer.from(JSON.stringify({ tid: guid, aud: guid, nonce })).toString("base64url")}.x` } };
  };
  return { sent, calls, socket, setNonce: (value) => { nonce = value; },
    oauth: createTeamsOAuth({ clientId: guid, clientSecret: "test-secret", fetcher }) };
}

test("Teams OAuth accepts an organization account only through the live installation socket", async () => {
  const { sent, calls, socket, oauth, setNonce } = fixture();
  oauth.start(socket, "installation", guid);
  const url = new URL(sent[0].url);
  assert.equal(url.pathname, "/organizations/oauth2/v2.0/authorize");
  assert.equal(url.searchParams.get("redirect_uri"), "https://connect.voxordia.com/oauth/teams/callback");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.match(url.searchParams.get("scope"), /OnlineMeetings\.ReadWrite/);
  const state = url.searchParams.get("state");
  assert.equal(await oauth.callback(state, "code", () => null), false);
  assert.equal(calls.length, 0);
  oauth.start(socket, "installation", guid);
  const nextState = new URL(sent.at(-1).url).searchParams.get("state");
  setNonce(new URL(sent.at(-1).url).searchParams.get("nonce"));
  const completion = oauth.callback(nextState, "code", () => socket);
  await new Promise((resolve) => setImmediate(resolve));
  const delivered = sent.at(-1);
  assert.equal(delivered.type, "teams-oauth-authorized");
  assert.equal(delivered.tenantId, guid);
  assert.equal(delivered.userId, person);
  assert.equal(delivered.refreshToken, "rotated");
  assert.equal(calls[0].options.body.get("code_verifier")?.length > 20, true);
  oauth.ack(socket, delivered.id, true);
  assert.equal(await completion, true);
  assert.equal(await oauth.callback(nextState, "code", () => socket), false);
  assert.ok(!JSON.stringify(sent).includes("test-secret"));
});

test("Teams refresh requires the licensed installation", async () => {
  const { sent, socket, oauth } = fixture();
  await oauth.refresh(socket, "request", "old");
  assert.equal(sent.at(-1).refreshToken, "rotated");
  socket.voxEntitlements.teams = false;
  await oauth.refresh(socket, "denied", "old");
  assert.equal(sent.at(-1).ok, false);
});
