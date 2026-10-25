import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveStaticPath } from "./staticPath.mjs";

const portal = path.resolve("public");
const client = path.join(portal, "client");

test("the organizer URL serves its actual index in the gateway", () => {
  const expected = path.join(portal, "uc-panel", "index.html");
  assert.equal(resolveStaticPath("/uc-panel/", portal, client), expected);
  assert.equal(resolveStaticPath("/uc-panel", portal, client), expected);
  assert.equal(resolveStaticPath("/", portal, client), path.join(portal, "index.html"));
  assert.equal(resolveStaticPath("/invitation/", portal, client), path.join(portal, "invitation", "index.html"));
});

test("static routing keeps client assets in their own root", () => {
  assert.equal(resolveStaticPath("/client", portal, client), path.join(client, "index.html"));
  assert.equal(resolveStaticPath("/client/", portal, client), path.join(client, "index.html"));
  assert.equal(resolveStaticPath("/client/icon.svg", portal, client), path.join(client, "icon.svg"));
  assert.equal(resolveStaticPath("/../schema.sql", portal, client), null);
  assert.equal(resolveStaticPath("/client/../../schema.sql", portal, client), null);
});
