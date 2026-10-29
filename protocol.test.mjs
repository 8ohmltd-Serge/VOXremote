import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import { canonicalJson, normalizeRemoteCode, validateTunnelHello } from "./protocol.mjs";

test("human-entered invite codes normalize without broadening the alphabet", () => {
  assert.equal(normalizeRemoteCode(" ab-cd 2345 "), "ABCD2345");
  assert.equal(normalizeRemoteCode("АВС"), "ABC");
});

test("Zoom UC installation authenticates without Remote entitlement or public media address", () => {
  const vendor = generateKeyPairSync("ed25519");
  const installation = generateKeyPairSync("ed25519");
  const publicKey = installation.publicKey.export({ format: "pem", type: "spki" });
  const vendorKey = vendor.publicKey.export({ format: "pem", type: "spki" });
  const license = { schema: "edge-s.license.v1", installation: { id: "customer-one",
    publicKeySha256: createHash("sha256").update(publicKey.replace(/\r/g, "").trim()).digest("hex") },
    entitlements: { ucCore: true, "ucAdapter.zoom": true } };
  license.signature = { algorithm: "Ed25519", value: sign(null, Buffer.from(canonicalJson(license)), vendor.privateKey).toString("base64") };
  const hello = { schema: "voxordia.remote-tunnel.hello.v1", type: "hello",
    issuedAt: new Date().toISOString(), nonce: "a".repeat(48), media: null,
    license, installationPublicKey: publicKey };
  hello.signature = { algorithm: "Ed25519", value: sign(null, Buffer.from(canonicalJson(hello)), installation.privateKey).toString("base64") };
  const verified = validateTunnelHello(hello, [vendorKey]);
  assert.equal(verified.ok, true);
  assert.equal(verified.zoomAllowed, true);
  assert.equal(verified.remoteAllowed, false);
  assert.equal(verified.media, null);
});
