// Licence issuer keys for Connect (ADR-124).
//
// Built-in: the key(s) from VENDOR_PUBLIC_KEY_BASE64 / VENDOR_PUBLIC_KEY_PATH.
// Accepted: voxordia.trust-bundle.v1 documents of purpose "license-issuer",
// fetched from Remote (/api/trust.php) and kept in Postgres. A bundle with a
// greater sequence is accepted only if an active or retiring key of the current
// bundle signed it (the first one: a built-in key). Revoked keys verify nothing.
import { createHash, createPublicKey, verify } from "node:crypto";
import { canonicalJson } from "./protocol.mjs";

export const TRUST_BUNDLE_SCHEMA = "voxordia.trust-bundle.v1";
export const TRUST_PURPOSE = "license-issuer";
const STATUSES = new Set(["active", "retiring", "revoked"]);
const MAX_BUNDLE_BYTES = 64 * 1024;

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const time = (value) => typeof value === "string" ? Date.parse(value) : Number.NaN;

/** SHA-256 hex of the DER SPKI of an Ed25519 public key. */
export function trustKeyId(publicKey) {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("not an Ed25519 key");
  return createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex");
}

export function trustFingerprint(keyId) {
  if (!/^[a-f0-9]{64}$/.test(keyId ?? "")) return "—";
  const hex = keyId.toUpperCase();
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} … ${hex.slice(-8, -4)} ${hex.slice(-4)}`;
}

export function bundleStructureErrors(bundle) {
  if (!isObject(bundle) || bundle.schema !== TRUST_BUNDLE_SCHEMA || !Number.isInteger(bundle.sequence) || bundle.sequence < 1 ||
      typeof bundle.purpose !== "string" || !Number.isFinite(time(bundle.issuedAt)) || !Array.isArray(bundle.keys) ||
      bundle.keys.length < 1 || bundle.keys.length > 16 || !Array.isArray(bundle.signatures) ||
      bundle.signatures.length < 1 || bundle.signatures.length > 4) return ["trust-schema-invalid"];
  const seen = new Set();
  let active = 0;
  for (const key of bundle.keys) {
    let keyId = null;
    try { keyId = trustKeyId(key?.publicKey); } catch { keyId = null; }
    if (!isObject(key) || keyId === null || key.keyId !== keyId || seen.has(keyId) || !STATUSES.has(key.status) ||
        !Number.isFinite(time(key.notBefore)) ||
        !(key.notAfter === null || key.notAfter === undefined || Number.isFinite(time(key.notAfter)))) return ["trust-schema-invalid"];
    seen.add(keyId);
    if (key.status === "active") active += 1;
  }
  if (!active || bundle.signatures.some((signature) => !isObject(signature) || signature.algorithm !== "Ed25519" ||
      !/^[a-f0-9]{64}$/.test(signature.keyId ?? "") || typeof signature.value !== "string")) return ["trust-schema-invalid"];
  return [];
}

function signedBy(bundle, signers) {
  const { signatures, ...payload } = bundle;
  const message = Buffer.from(canonicalJson(payload));
  return signatures.some((signature) => {
    const publicKey = signers.get(signature.keyId);
    if (!publicKey) return false;
    try { return verify(null, message, publicKey, Buffer.from(signature.value, "base64")); } catch { return false; }
  });
}

export class IssuerTrust {
  /** builtinPems: PEM strings from the environment. */
  constructor(builtinPems) {
    this.builtin = [];
    for (const publicKey of builtinPems) {
      try { this.builtin.push({ keyId: trustKeyId(publicKey), publicKey, status: "active" }); } catch { /* not Ed25519 */ }
    }
    this.chain = [];
    this.checkedAt = null;
    this.lastError = null;
  }

  current() { return this.chain.at(-1) ?? null; }
  sequence() { return this.current()?.sequence ?? 0; }

  check(bundle) {
    if (Buffer.byteLength(JSON.stringify(bundle ?? null)) > MAX_BUNDLE_BYTES) return ["trust-schema-invalid"];
    const structure = bundleStructureErrors(bundle);
    if (structure.length) return structure;
    if (bundle.purpose !== TRUST_PURPOSE) return ["trust-purpose-unused"];
    const current = this.current();
    if (current && bundle.sequence <= current.sequence) return ["trust-sequence-stale"];
    const list = current ? current.keys.filter((key) => key.status === "active" || key.status === "retiring") : this.builtin;
    if (!signedBy(bundle, new Map(list.map((key) => [key.keyId, key.publicKey])))) return ["trust-chain-invalid"];
    return [];
  }

  /** Adds the bundle when the chain rule holds; returns the errors (empty when accepted). */
  accept(bundle) {
    const errors = this.check(bundle);
    if (!errors.length) this.chain.push(structuredClone(bundle));
    return errors;
  }

  /** Keys that verify licences: built-in ∪ current bundle (its status wins), revoked excluded. */
  publicKeys() { return this.keys().filter((key) => key.status !== "revoked").map((key) => key.publicKey); }

  keys() {
    const merged = new Map(this.builtin.map((key) => [key.keyId, { ...key, source: "builtin" }]));
    const current = this.current();
    for (const key of current?.keys ?? []) {
      merged.set(key.keyId, { keyId: key.keyId, publicKey: key.publicKey, status: key.status,
        source: merged.has(key.keyId) ? `builtin+bundle:${current.sequence}` : `bundle:${current.sequence}` });
    }
    return [...merged.values()];
  }

  /** Public status for the generator's «Ключи» tab and security reviews. */
  status() {
    return { schema: "voxordia.connect-trust-status.v1", purpose: TRUST_PURPOSE, sequence: this.sequence(),
      issuedAt: this.current()?.issuedAt ?? null, checkedAt: this.checkedAt, lastError: this.lastError,
      keys: this.keys().map((key) => ({ keyId: key.keyId, fingerprint: trustFingerprint(key.keyId), status: key.status, source: key.source })) };
  }
}

/**
 * Bundles newer than `after` from Remote. Prefers ?after=N (the whole missing chain:
 * voxordia.trust-bundles.v1), falls back to the single current bundle of older Remote versions.
 */
export async function fetchRemoteBundles({ endpoint, after, fetchImpl = fetch }) {
  const url = new URL(endpoint);
  url.searchParams.set("purpose", TRUST_PURPOSE);
  url.searchParams.set("after", String(after));
  const response = await fetchImpl(url, { method: "GET", redirect: "error", headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000) });
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`Remote trust HTTP ${response.status}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > 16 * MAX_BUNDLE_BYTES) throw new Error("Remote trust response is too large");
  const value = JSON.parse(text);
  const list = value?.schema === "voxordia.trust-bundles.v1" && Array.isArray(value.bundles) ? value.bundles : [value];
  return list.filter((bundle) => bundle?.purpose === TRUST_PURPOSE && Number(bundle.sequence) > after)
    .sort((a, b) => a.sequence - b.sequence);
}

/** Loads stored bundles (re-verified), then refreshes from Remote. Store: { load(), save(bundle) }. */
export async function refreshIssuerTrust(trust, { store, endpoint, fetchImpl = fetch, now = () => new Date() }) {
  if (!trust.chain.length && store) {
    for (const bundle of await store.load()) trust.accept(bundle);
  }
  try {
    const accepted = [];
    for (const bundle of await fetchRemoteBundles({ endpoint, after: trust.sequence(), fetchImpl })) {
      const errors = trust.accept(bundle);
      if (errors.length) throw new Error(`bundle ${bundle.sequence}: ${errors.join(", ")}`);
      if (store) await store.save(bundle);
      accepted.push(bundle.sequence);
    }
    trust.lastError = null;
    return accepted;
  } catch (error) {
    trust.lastError = error.message;
    throw error;
  } finally {
    trust.checkedAt = now().toISOString();
  }
}
