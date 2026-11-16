// ADR-124: Connect learns new licence issuer keys from Remote by the chain rule.
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { canonicalJson } from "./protocol.mjs";
import { IssuerTrust, fetchRemoteBundles, refreshIssuerTrust, trustKeyId } from "./trust.mjs";

const pair = () => generateKeyPairSync("ed25519", { privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" } });
const entry = (key, status = "active") => ({ keyId: trustKeyId(key.publicKey), publicKey: key.publicKey, status,
  notBefore: "2026-11-01T00:00:00Z", notAfter: null });
function bundle(sequence, keys, signer, purpose = "license-issuer") {
  const payload = { schema: "voxordia.trust-bundle.v1", purpose, sequence, issuedAt: "2026-11-16T12:00:00Z", keys };
  return { ...payload, signatures: [{ keyId: trustKeyId(signer.publicKey), algorithm: "Ed25519",
    value: sign(null, Buffer.from(canonicalJson(payload)), signer.privateKey).toString("base64") }] };
}

test("a chain of bundles adds issuer keys; stale, foreign and revoked signers are refused", () => {
  const k0 = pair(), k1 = pair(), k2 = pair(), stranger = pair();
  const trust = new IssuerTrust([k0.publicKey]);
  assert.deepEqual(trust.accept(bundle(1, [entry(stranger)], stranger)), ["trust-chain-invalid"]);
  assert.deepEqual(trust.accept(bundle(1, [entry(stranger)], k0, "update")), ["trust-purpose-unused"]);
  assert.deepEqual(trust.accept(bundle(1, [entry(k1), entry(k0, "retiring")], k0)), []);
  assert.deepEqual(trust.accept(bundle(1, [entry(stranger)], k1)), ["trust-sequence-stale"]);
  assert.deepEqual(trust.accept(bundle(2, [entry(stranger)], k0)), [], "k0 is retiring: it may still sign");
  assert.equal(trust.sequence(), 2);
  const revoking = new IssuerTrust([k0.publicKey]);
  revoking.accept(bundle(1, [entry(k1), entry(k0, "revoked")], k0));
  assert.ok(!revoking.publicKeys().includes(k0.publicKey), "a revoked built-in key verifies nothing");
  assert.deepEqual(revoking.accept(bundle(2, [entry(k2)], k0)), ["trust-chain-invalid"]);
  assert.equal(revoking.status().keys.find((key) => key.keyId === trustKeyId(k0.publicKey)).status, "revoked");
});

test("the key list used for licences grows with an accepted bundle", () => {
  const k0 = pair(), k1 = pair();
  const trust = new IssuerTrust([k0.publicKey]);
  assert.deepEqual(trust.publicKeys(), [k0.publicKey]);
  trust.accept(bundle(1, [entry(k1)], k0));
  assert.deepEqual(trust.publicKeys().sort(), [k0.publicKey, k1.publicKey].sort(), "the built-in key stays unless revoked");
});

test("refresh fetches the missing chain with ?after=N, stores it and survives a restart", async () => {
  const k0 = pair(), k1 = pair(), k2 = pair();
  const remote = [bundle(1, [entry(k1)], k0), bundle(2, [entry(k2), entry(k1, "retiring")], k1)];
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const after = Number(new URL(url).searchParams.get("after"));
    const bundles = remote.filter((item) => item.sequence > after);
    return bundles.length ? { ok: true, status: 200, text: async () => JSON.stringify({ schema: "voxordia.trust-bundles.v1", bundles }) }
      : { ok: true, status: 204, text: async () => "" };
  };
  const saved = [];
  const store = { load: async () => saved.map((item) => structuredClone(item)), save: async (item) => { saved.push(item); } };
  const trust = new IssuerTrust([k0.publicKey]);
  assert.deepEqual(await refreshIssuerTrust(trust, { store, endpoint: "https://remote.example/api/trust.php", fetchImpl }), [1, 2]);
  assert.equal(urls[0], "https://remote.example/api/trust.php?purpose=license-issuer&after=0");
  assert.equal(trust.status().sequence, 2);
  assert.equal(trust.status().lastError, null);
  const restarted = new IssuerTrust([k0.publicKey]);
  assert.deepEqual(await refreshIssuerTrust(restarted, { store, endpoint: "https://remote.example/api/trust.php", fetchImpl }), []);
  assert.equal(restarted.sequence(), 2, "stored bundles are re-verified from the built-in key");
  // A tampered stored bundle breaks the chain at that point.
  saved[1].keys.push(entry(pair()));
  const third = new IssuerTrust([k0.publicKey]);
  await refreshIssuerTrust(third, { store: { ...store, save: async () => {} }, endpoint: "https://remote.example/api/trust.php", fetchImpl });
  assert.equal(third.sequence(), 2, "the genuine bundle 2 is fetched again from Remote");
});

test("an older Remote that returns only the current bundle still works; errors are reported", async () => {
  const k0 = pair(), k1 = pair();
  const single = bundle(1, [entry(k1)], k0);
  const fetched = await fetchRemoteBundles({ endpoint: "https://remote.example/api/trust.php", after: 0,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify(single) }) });
  assert.deepEqual(fetched.map((item) => item.sequence), [1]);
  const trust = new IssuerTrust([k0.publicKey]);
  await assert.rejects(refreshIssuerTrust(trust, { endpoint: "https://remote.example/api/trust.php",
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => "" }) }), /HTTP 503/);
  assert.equal(trust.status().lastError, "Remote trust HTTP 503");
});

test("the gateway verifies hellos with the live key list and publishes /api/trust-status", async () => {
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(source, /validateTunnelHello\(message, issuerTrust\.publicKeys\(\)\)/);
  assert.match(source, /url\.pathname === "\/api\/trust-status"/);
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS trust_bundles/);
});
