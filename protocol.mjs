import { createHash, timingSafeEqual, verify } from "node:crypto";
import { isIP } from "node:net";

function canonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const canonicalJson = (value) => canonicalValue(value);
export const unsignedDocument = (document) => Object.fromEntries(Object.entries(document)
  .filter(([key]) => key !== "signature"));

export const ENROLL_SCHEMA = "voxordia.remote-gateway-enrollment.v1";
export const TUNNEL_HELLO_SCHEMA = "voxordia.remote-tunnel.hello.v1";
export const PROOF_PURPOSE = "voxordia-remote-connector-proof";
export const GATEWAY_CAPABILITIES = Object.freeze(["remote-participant.v1", "uc-organizer.v1"]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const CYRILLIC_LOOKALIKES = Object.freeze({ А: "A", В: "B", С: "C", Е: "E", Н: "H",
  К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X", У: "Y" });

export function normalizeRemoteCode(value) {
  return String(value ?? "").normalize("NFKC").toUpperCase()
    .replace(/[АВСЕНКМОРТХУ]/g, (letter) => CYRILLIC_LOOKALIKES[letter])
    .replace(/[^0-9A-Z]/g, "");
}

export function isPublicIpv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255) return false;
  return true;
}

function signedBy(document, publicKey) {
  if (!document || typeof document !== "object" || document.signature?.algorithm !== "Ed25519" ||
      typeof document.signature.value !== "string") return false;
  try {
    const signature = Buffer.from(document.signature.value, "base64");
    if (signature.length !== 64) return false;
    return verify(null, Buffer.from(canonicalJson(unsignedDocument(document))), publicKey,
      signature);
  } catch { return false; }
}

function keyDigest(publicKey) {
  return sha256(publicKey.replace(/\r/g, "").trim());
}

/** A customer supplies only an installation-signed public IPv4:TCP port and TLS SPKI pin. */
export function validateEnrollment(document, vendorPublicKeys, now = Date.now()) {
  const fail = (reason) => ({ ok: false, reason });
  if (document?.schema !== ENROLL_SCHEMA || document.action !== "enroll" ||
      typeof document.installationPublicKey !== "string" ||
      !/^[a-f0-9]{64}$/.test(document.tokenSha256 ?? "") ||
      !/^[a-f0-9]{64}$/.test(document.tlsSpkiSha256 ?? "")) return fail("invalid_enrollment");
  const issuedAt = Date.parse(document.issuedAt);
  if (!Number.isFinite(issuedAt) || Math.abs(now - issuedAt) > 600_000) return fail("stale_enrollment");
  const license = document.license;
  if (license?.schema !== "edge-s.license.v1" ||
      !vendorPublicKeys.some((key) => signedBy(license, key))) return fail("license_invalid");
  if (license.notBefore && (!Number.isFinite(Date.parse(license.notBefore)) ||
      Date.parse(license.notBefore) > now)) return fail("license_not_yet_valid");
  if (license.expiresAt && (!Number.isFinite(Date.parse(license.expiresAt)) ||
      Date.parse(license.expiresAt) <= now)) return fail("license_expired");
  const remote = license.entitlements?.remoteAccessCore;
  if (remote !== true && (!remote || typeof remote !== "object" || remote.enabled === false)) {
    return fail("not_entitled");
  }
  const id = String(license.installation?.id ?? "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(id) ||
      license.installation?.publicKeySha256 !== keyDigest(document.installationPublicKey)) {
    return fail("installation_key_mismatch");
  }
  if (!signedBy(document, document.installationPublicKey)) return fail("signature_invalid");
  const ip = document.endpoint?.ip;
  const port = document.endpoint?.port;
  if (!isPublicIpv4(ip) || !Number.isInteger(port) || port < 1 || port > 65535) {
    return fail("endpoint_not_public");
  }
  return { ok: true, installationId: id, endpoint: { ip, port },
    tlsSpkiSha256: document.tlsSpkiSha256, tokenSha256: document.tokenSha256,
    installationPublicKey: document.installationPublicKey,
    licenseRevision: Number(license.revision ?? 1), licenseExpiresAt: license.expiresAt ?? null,
    issuedAt };
}

export function verifyConnectorProof({ challenge, endpoint, response, installationPublicKey }) {
  if (!/^[a-f0-9]{64}$/.test(challenge) || response?.challenge !== challenge ||
      typeof response.signature !== "string") return false;
  const message = canonicalJson({ challenge, endpoint, purpose: PROOF_PURPOSE });
  try { return verify(null, Buffer.from(message), installationPublicKey,
    Buffer.from(response.signature, "base64")); }
  catch { return false; }
}

export function equalDigest(a, b) {
  if (!/^[a-f0-9]{64}$/.test(a ?? "") || !/^[a-f0-9]{64}$/.test(b ?? "")) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Validate an outbound connector hello. No customer DNS name or public TCP listener is required. */
export function validateTunnelHello(document, vendorPublicKeys, now = Date.now()) {
  const fail = (reason) => ({ ok: false, reason });
  if (document?.schema !== TUNNEL_HELLO_SCHEMA || document.type !== "hello" ||
      typeof document.installationPublicKey !== "string" || !/^[a-f0-9]{48}$/.test(document.nonce ?? "")) {
    return fail("invalid_hello");
  }
  const issuedAt = Date.parse(document.issuedAt);
  if (!Number.isFinite(issuedAt) || Math.abs(now - issuedAt) > 600_000) return fail("stale_hello");
  const license = document.license;
  if (license?.schema !== "edge-s.license.v1" || !vendorPublicKeys.some((key) => signedBy(license, key))) {
    return fail("license_invalid");
  }
  if (license.notBefore && (!Number.isFinite(Date.parse(license.notBefore)) ||
      Date.parse(license.notBefore) > now)) return fail("license_not_yet_valid");
  if (license.expiresAt && (!Number.isFinite(Date.parse(license.expiresAt)) ||
      Date.parse(license.expiresAt) <= now)) return fail("license_expired");
  const remote = license.entitlements?.remoteAccessCore;
  if (remote !== true && (!remote || typeof remote !== "object" || remote.enabled === false)) {
    return fail("not_entitled");
  }
  const installationId = String(license.installation?.id ?? "").toLowerCase();
  if (!/^[a-z0-9-]{3,64}$/.test(installationId) ||
      license.installation?.publicKeySha256 !== keyDigest(document.installationPublicKey)) {
    return fail("installation_key_mismatch");
  }
  if (!signedBy(document, document.installationPublicKey)) return fail("signature_invalid");
  const { publicIp, portMin, portMax } = document.media ?? {};
  if (!isPublicIpv4(publicIp) || !Number.isInteger(portMin) || !Number.isInteger(portMax) ||
      portMin < 1024 || portMax > 65535 || portMin > portMax || portMax - portMin > 1000) {
    return fail("media_endpoint_invalid");
  }
  return { ok: true, installationId, installationPublicKey: document.installationPublicKey,
    licenseRevision: Number(license.revision ?? 1), licenseExpiresAt: license.expiresAt ?? null,
    media: { publicIp, portMin, portMax }, issuedAt, nonce: document.nonce };
}

