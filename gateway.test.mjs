import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { codeTableForPurpose, sessionTableForPath } from "./codePurpose.mjs";
import { GATEWAY_CAPABILITIES } from "./protocol.mjs";
import { recoverPendingRequestsForSocketClose } from "./pendingRequests.mjs";
import { clientIp, closeAtLicenseExpiry, rateAllowed } from "./gatewayLimits.mjs";

test("gateway advertises scoped remote, organizer and Zoom OAuth capabilities", async () => {
  assert.deepEqual(GATEWAY_CAPABILITIES, ["remote-participant.v1", "uc-organizer.v1", "zoom-oauth.v1", "zoom-sdk.v1"]);
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(source, /type: "welcome", installationId,[\s\S]*capabilities: GATEWAY_CAPABILITIES\.filter/);
  assert.match(source, /type: "ack", id: message\.id, purpose: message\.purpose, ok: true/);
});

test("UC organizer and remote delegate codes use distinct allowlisted tables", () => {
  assert.equal(codeTableForPurpose(undefined), "remote_codes");
  assert.equal(codeTableForPurpose("remote-participant"), "remote_codes");
  assert.equal(codeTableForPurpose("uc-organizer"), "uc_organizer_codes");
  assert.equal(codeTableForPurpose("uc-participant"), null);
  assert.equal(codeTableForPurpose("uc-organizer; DROP TABLE remote_codes"), null);
});

test("UC organizer API cannot resolve a remote delegate session table", () => {
  assert.equal(sessionTableForPath("/api/v1/uc-organizer/session"), "uc_organizer_sessions");
  assert.equal(sessionTableForPath("/api/v1/meetings/one"), "remote_sessions");
  assert.equal(sessionTableForPath("/api/uc/claim"), null);
});

test("gateway migration contains separate credential and session tables", async () => {
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  for (const name of ["remote_codes", "remote_sessions", "uc_organizer_codes", "uc_organizer_sessions"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${name}\\b`));
  }
});

test("RSVP gateway exposes only a bounded invitation proxy without a customer listener", async () => {
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(source, /\["\/api\/invitations\/lookup", "\/api\/invitations\/respond"\]/);
  assert.match(source, /sendRequest\(installationId, \{ method: "POST", path: `\/api\/v1\/invitations\/\$\{action\}`/);
  assert.doesNotMatch(source, /url\.pathname\.startsWith\("\/api\/invitations\/"\)/);
});

test("RSVP proxy keeps its inactivity deadline through response headers and chunks", async () => {
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  // The per-item method keeps the deadline in scope of the frame handler (fix 4965f82).
  assert.match(source, /if \(message\.type === "response-start"\)\s*\{\s*item\.armTimeout\(\)/);
  assert.match(source, /else if \(message\.type === "response-chunk"\)\s*\{\s*item\.armTimeout\(\)/);
  assert.match(source, /if \(item\.started\)\s*\{[\s\S]*?response\.destroy\(/);
  assert.match(source, /clearTimeout\(item\.timer\);[\s\S]*?item\.response\.end\(\);/);
  assert.match(source, /item\.responseBytes \+= chunk\.length/);
  assert.match(source, /item\.response\.end\(Buffer\.concat\(item\.responseChunks\)\)/);
  assert.match(source, /item\.awaitingReconnect\) item\.retryWithSocket\(socket\)/);
  assert.match(source, /event: "invitation_proxy_response"[\s\S]*?bytes: item\.responseBytes/);
});

test("closing a connector retries invitation requests but leaves new socket requests pending", () => {
  const oldSocket = {};
  const currentSocket = {};
  const oldRequest = { socket: oldSocket, timer: setTimeout(() => {}, 60_000),
    retryOnReconnect: true, retries: 0, maxRetries: 1, responseChunks: [Buffer.from("stale")], responseBytes: 5 };
  const currentRequest = { socket: currentSocket, timer: setTimeout(() => {}, 60_000),
    retryOnReconnect: true, retries: 0, maxRetries: 1 };
  const pending = new Map([["old-request", oldRequest], ["current-request", currentRequest]]);

  const result = recoverPendingRequestsForSocketClose(pending, oldSocket);
  assert.equal(result.retry.length, 1);
  assert.deepEqual(result.retry[0], { id: "old-request", item: oldRequest });
  assert.deepEqual(result.failed, []);
  assert.equal(oldRequest.socket, null);
  assert.equal(oldRequest.awaitingReconnect, true);
  assert.equal(oldRequest.responseBytes, 0);
  assert.deepEqual(oldRequest.responseChunks, []);
  assert.deepEqual([...pending], [["old-request", oldRequest], ["current-request", currentRequest]]);
  clearTimeout(oldRequest.timer);
  clearTimeout(currentRequest.timer);
});

test("audit F-20: client address is the proxy-appended X-Forwarded-For entry, not the spoofable left one", () => {
  const request = (xff, remoteAddress = "10.0.0.2") => ({ headers: { "x-forwarded-for": xff }, socket: { remoteAddress } });
  assert.equal(clientIp(request("6.6.6.6, 203.0.113.7"), "1"), "203.0.113.7");
  assert.equal(clientIp(request("203.0.113.7"), "1"), "203.0.113.7");
  assert.equal(clientIp(request("1.1.1.1, 203.0.113.7, 10.1.1.1"), "2"), "203.0.113.7");
  assert.equal(clientIp(request(""), "1"), "10.0.0.2");
  assert.equal(clientIp(request("6.6.6.6"), undefined), "10.0.0.2");
  const attempts = new Map();
  for (let index = 0; index < 10; index += 1) assert.equal(rateAllowed(attempts, "a", { now: 1000 }), true);
  assert.equal(rateAllowed(attempts, "a", { now: 1000 }), false);
  for (let index = 0; index < 50; index += 1) rateAllowed(attempts, `ip-${index}`, { now: 1000, maxAddresses: 20 });
  assert.equal(attempts.size, 20);
  const source = readFileSync(new URL("./server.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /split\(","\)\[0\]/);
});

test("audit F-15: a connector tunnel is closed when its licence expires", () => {
  const closed = []; const timers = [];
  let clock = 0;
  const socket = { close: (code, reason) => closed.push([code, reason]) };
  closeAtLicenseExpiry(socket, new Date(5_000).toISOString(),
    { now: () => clock, setTimer: (fn, ms) => { timers.push([fn, ms]); return null; } });
  assert.equal(timers[0][1], 5_000);
  clock = 5_000; timers[0][0]();
  assert.deepEqual(closed, [[1008, "license_expired"]]);
  assert.equal(closeAtLicenseExpiry(socket, null), null);
});
