import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { codeTableForPurpose, sessionTableForPath } from "./codePurpose.mjs";
import { GATEWAY_CAPABILITIES } from "./protocol.mjs";
import { detachPendingRequestsForSocket } from "./pendingRequests.mjs";

test("gateway advertises explicit remote and organizer capabilities", async () => {
  assert.deepEqual(GATEWAY_CAPABILITIES, ["remote-participant.v1", "uc-organizer.v1"]);
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(source, /type: "welcome", installationId, capabilities: GATEWAY_CAPABILITIES/);
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
  assert.match(source, /if \(message\.type === "response-start"\)\s*\{\s*armTimeout\(item\)/);
  assert.match(source, /else if \(message\.type === "response-chunk"\)\s*\{\s*armTimeout\(item\)/);
  assert.match(source, /if \(item\.started\)\s*\{[\s\S]*?response\.destroy\(/);
  assert.match(source, /clearTimeout\(item\.timer\);\s*item\.response\.end\(\);/);
});

test("closing a replaced connector socket leaves new socket requests pending", () => {
  const oldSocket = {};
  const currentSocket = {};
  const oldRequest = { socket: oldSocket, timer: setTimeout(() => {}, 60_000) };
  const currentRequest = { socket: currentSocket, timer: setTimeout(() => {}, 60_000) };
  const pending = new Map([["old-request", oldRequest], ["current-request", currentRequest]]);

  assert.deepEqual(detachPendingRequestsForSocket(pending, oldSocket), [oldRequest]);
  assert.deepEqual([...pending], [["current-request", currentRequest]]);
  clearTimeout(currentRequest.timer);
});
