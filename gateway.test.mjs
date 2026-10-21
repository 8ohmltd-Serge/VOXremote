import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { codeTableForPurpose, sessionTableForPath } from "./codePurpose.mjs";

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
