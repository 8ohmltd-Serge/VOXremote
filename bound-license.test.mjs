// A preliminary Demo (ADR-117) reaches Connect as an unsigned v2 view with `bound`: the
// gateway trusts only the vendor-signed entitlement and the Remote-signed binding.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { canonicalJson, unsignedDocument, validateTunnelHello, verifiedLicense } from "./protocol.mjs";
import { BUILTIN_BINDING_KEYS, TrustChain, legacyBindingKeyId, trustKeyId } from "./trust.mjs";

const pair = () => generateKeyPairSync("ed25519", { privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" } });
const signed = (payload, privateKey, keyId) => ({ ...payload, signature: { algorithm: "Ed25519", keyId,
  value: sign(null, Buffer.from(canonicalJson(payload)), privateKey).toString("base64") } });
const sha = (text) => createHash("sha256").update(text).digest("hex");
const NOW = Date.parse("2026-11-20T09:00:00Z");
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

function demo({ vendor, binder, installation, keyId = legacyBindingKeyId(binder.publicKey), entitlementPatch = {} }) {
  const entitlement = signed({ schema: "vox-s.license-entitlement.v1", licenseId: "demo-VX-1", revision: 1, licenseClass: "demo",
    profile: "demo-standard", projectId: "VX-1", issuedAt: "2026-11-15T10:00:00Z", customer: { name: "T" },
    entitlements: { core: { enabled: true }, remoteAccessCore: { enabled: true } }, capacities: { remoteSeats: 2 },
    termDays: 30, activateBy: "2027-01-01T00:00:00Z", binding: { authority: "remote.voxordia.com", keyIds: [keyId] },
    ...entitlementPatch }, vendor.privateKey, "vendor");
  const binding = signed({ schema: "vox-s.license-binding.v1", bindingId: "LB-1", entitlementSha256: sha(canonicalJson(entitlement)),
    licenseId: entitlement.licenseId, projectId: entitlement.projectId,
    installation: { id: "inst-0001", publicKeySha256: sha(installation.publicKey.replace(/\r/g, "").trim()) },
    activatedAt: iso(NOW), notBefore: iso(NOW - 300_000), expiresAt: iso(NOW + 30 * 86_400_000) }, binder.privateKey, keyId);
  const { signature: _s, binding: _b, termDays: _t, activateBy: _a, ...body } = entitlement;
  // What the server sends: the effective view (no vendor signature) plus the signed parts.
  return { ...body, schema: "vox-s.license.v2", installation: binding.installation, notBefore: binding.notBefore,
    expiresAt: binding.expiresAt, bound: { schema: "vox-s.license-bound.v1", entitlement, binding } };
}

function hello(license, installation) {
  const payload = { schema: "voxordia.remote-tunnel.hello.v1", type: "hello", issuedAt: new Date(NOW).toISOString(),
    nonce: "ab".repeat(24), installationPublicKey: installation.publicKey, license,
    media: { publicIp: "8.8.8.8", portMin: 40000, portMax: 40100 } };
  return { ...payload, signature: { algorithm: "Ed25519",
    value: sign(null, Buffer.from(canonicalJson(unsignedDocument(payload))), installation.privateKey).toString("base64") } };
}

const window = (key) => ({ keyId: legacyBindingKeyId(key.publicKey), publicKey: key.publicKey,
  validFrom: "2026-11-01T00:00:00Z", validUntil: "2027-11-01T00:00:00Z" });

test("a bound Demo opens the tunnel with rights and dates from its signed parts", () => {
  const vendor = pair(), binder = pair(), installation = pair();
  const license = demo({ vendor, binder, installation });
  const result = validateTunnelHello(hello(license, installation), [vendor.publicKey], NOW, [window(binder)]);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.remoteAllowed, true);
  assert.equal(result.licenseExpiresAt, iso(NOW + 30 * 86_400_000));
});

test("forged outer fields do not widen a bound Demo", () => {
  const vendor = pair(), binder = pair(), installation = pair();
  // As received over the wire: outer fields are separate copies of the signed parts.
  const license = JSON.parse(JSON.stringify(demo({ vendor, binder, installation })));
  license.entitlements.ucCore = { enabled: true };
  license.entitlements["ucAdapter.zoom"] = { enabled: true };
  license.expiresAt = "2099-01-01T00:00:00Z";
  const effective = verifiedLicense(license, [vendor.publicKey], [window(binder)]);
  assert.equal(effective.expiresAt, iso(NOW + 30 * 86_400_000));
  assert.equal(effective.entitlements.ucCore, undefined);
});

test("a bound Demo is refused without the vendor key, the binding key, or the right entitlement", () => {
  const vendor = pair(), binder = pair(), installation = pair(), rogue = pair();
  const license = demo({ vendor, binder, installation });
  const check = (vendorKeys, bindingKeys, value = license) =>
    validateTunnelHello(hello(value, installation), vendorKeys, NOW, bindingKeys).reason ?? "ok";
  assert.equal(check([rogue.publicKey], [window(binder)]), "license_invalid");
  assert.equal(check([vendor.publicKey], []), "license_invalid");
  assert.equal(check([vendor.publicKey], [window(rogue)]), "license_invalid");
  assert.equal(check([vendor.publicKey], [{ ...window(binder), validUntil: "2026-11-19T00:00:00Z" }]), "license_invalid",
    "activation outside the binding key window");
  const swapped = structuredClone(license);
  swapped.bound.binding.entitlementSha256 = "0".repeat(64);
  assert.equal(check([vendor.publicKey], [window(binder)], swapped), "license_invalid");
  const pilot = demo({ vendor, binder, installation, entitlementPatch: { licenseClass: "pilot" } });
  assert.equal(check([vendor.publicKey], [window(binder)], pilot), "license_invalid", "only Demo is bound online");
});

test("the built-in binding key matches the server's rb- id and new binding keys come by the chain", () => {
  const trust = new TrustChain("binding", BUILTIN_BINDING_KEYS);
  assert.ok(trust.bindingKeys().some((key) => key.keyId === "rb-940fd62ab96f4db3"));
  // Rotation on Remote: new key active, old retiring with notBefore = rotation time, signed by the old one.
  const builtin = BUILTIN_BINDING_KEYS[0];
  assert.equal(trust.keys()[0].keyId, trustKeyId(builtin.publicKey));
  assert.equal(trust.bindingKeys()[0].validFrom, "2026-11-15T18:14:41Z");
});
