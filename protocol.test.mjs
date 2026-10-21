import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRemoteCode } from "./protocol.mjs";

test("human-entered invite codes normalize without broadening the alphabet", () => {
  assert.equal(normalizeRemoteCode(" ab-cd 2345 "), "ABCD2345");
  assert.equal(normalizeRemoteCode("АВС"), "ABC");
});
