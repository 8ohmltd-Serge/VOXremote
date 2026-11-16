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

const FAR_FUTURE = "9999-12-31T23:59:59Z";

/** Remote binding key id (ADR-117): "rb-" + first 16 hex of SHA-256 over the trimmed PEM text. */
export function legacyBindingKeyId(publicKey) {
  return `rb-${createHash("sha256").update(String(publicKey).replace(/\r/g, "").trim()).digest("hex").slice(0, 16)}`;
}

/**
 * Built-in Remote binding key (ADR-117), the same as the server's src/licensing/trust/binding.json.
 * Newer binding keys arrive as "binding" trust bundles signed by this one.
 */
export const BUILTIN_BINDING_KEYS = Object.freeze([{
  publicKey: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA2bhNDwp01r7r/o5ownXGjZ3h2Bk/Zatf0JkdaViOoD4=\n-----END PUBLIC KEY-----\n",
  notBefore: "2026-11-15T18:14:41Z", notAfter: "2028-11-15T18:14:41Z"
}]);

/** One purpose: built-in keys plus a chain of accepted bundles. */
export class TrustChain {
  /** builtinEntries: [{ publicKey, notBefore?, notAfter? }]. */
  constructor(purpose, builtinEntries) {
    this.purpose = purpose;
    this.builtin = [];
    for (const item of builtinEntries) {
      try {
        this.builtin.push({ keyId: trustKeyId(item.publicKey), publicKey: item.publicKey, status: "active",
          notBefore: item.notBefore ?? null, notAfter: item.notAfter ?? null });
      } catch { /* not Ed25519 */ }
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
    if (bundle.purpose !== this.purpose) return ["trust-purpose-unused"];
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

  /** Built-in ∪ current bundle (its status wins). firstNotBefore: earliest known start of the key. */
  keys() {
    const merged = new Map(this.builtin.map((key) => [key.keyId, { ...key, source: "builtin" }]));
    const current = this.current();
    for (const key of current?.keys ?? []) {
      merged.set(key.keyId, { keyId: key.keyId, publicKey: key.publicKey, status: key.status,
        notBefore: key.notBefore ?? null, notAfter: key.notAfter ?? null,
        source: merged.has(key.keyId) ? `builtin+bundle:${current.sequence}` : `bundle:${current.sequence}` });
    }
    for (const key of merged.values()) {
      const starts = [...this.builtin, ...this.chain.flatMap((bundle) => bundle.keys)]
        .filter((item) => item.keyId === key.keyId).map((item) => item.notBefore).filter((value) => Number.isFinite(time(value)));
      key.firstNotBefore = starts.length ? starts.reduce((a, b) => (time(a) <= time(b) ? a : b)) : null;
    }
    return [...merged.values()];
  }

  /** PEMs that verify documents; revoked keys never do. */
  publicKeys() { return this.keys().filter((key) => key.status !== "revoked").map((key) => key.publicKey); }

  /** Binding keys reachable by their rb-… id and by keyId, with the window the binding must fall into. */
  bindingKeys() {
    return this.keys().filter((key) => key.status !== "revoked").flatMap((key) => {
      const window = { publicKey: key.publicKey, validFrom: key.firstNotBefore ?? "1970-01-01T00:00:00Z",
        validUntil: key.notAfter ?? FAR_FUTURE };
      return [{ keyId: legacyBindingKeyId(key.publicKey), ...window }, { keyId: key.keyId, ...window }];
    });
  }

  /** Public status for the generator's «Ключи» tab and security reviews. */
  status() {
    return { purpose: this.purpose, sequence: this.sequence(), issuedAt: this.current()?.issuedAt ?? null,
      checkedAt: this.checkedAt, lastError: this.lastError,
      keys: this.keys().map((key) => ({ keyId: key.keyId, fingerprint: trustFingerprint(key.keyId), status: key.status, source: key.source })) };
  }
}

/** Licence issuer keys: the environment keys are built in. */
export class IssuerTrust extends TrustChain {
  constructor(builtinPems) { super(TRUST_PURPOSE, builtinPems.map((publicKey) => ({ publicKey }))); }
  status() { return { schema: "voxordia.connect-trust-status.v1", ...super.status() }; }
}

/**
 * Bundles newer than `after` from Remote. Prefers ?after=N (the whole missing chain:
 * voxordia.trust-bundles.v1), falls back to the single current bundle of older Remote versions.
 */
export async function fetchRemoteBundles({ endpoint, after, purpose = TRUST_PURPOSE, fetchImpl = fetch }) {
  const url = new URL(endpoint);
  url.searchParams.set("purpose", purpose);
  url.searchParams.set("after", String(after));
  const response = await fetchImpl(url, { method: "GET", redirect: "error", headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000) });
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`Remote trust HTTP ${response.status}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > 16 * MAX_BUNDLE_BYTES) throw new Error("Remote trust response is too large");
  const value = JSON.parse(text);
  const list = value?.schema === "voxordia.trust-bundles.v1" && Array.isArray(value.bundles) ? value.bundles : [value];
  return list.filter((bundle) => bundle?.purpose === purpose && Number(bundle.sequence) > after)
    .sort((a, b) => a.sequence - b.sequence);
}

/** Loads stored bundles (re-verified), then refreshes from Remote. Store: { load(purpose), save(bundle) }. */
export async function refreshTrust(trust, { store, endpoint, fetchImpl = fetch, now = () => new Date() }) {
  if (!trust.chain.length && store) {
    for (const bundle of await store.load(trust.purpose)) trust.accept(bundle);
  }
  try {
    const accepted = [];
    for (const bundle of await fetchRemoteBundles({ endpoint, after: trust.sequence(), purpose: trust.purpose, fetchImpl })) {
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

export const refreshIssuerTrust = refreshTrust;
