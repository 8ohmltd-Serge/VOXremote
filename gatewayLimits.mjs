// Client address and rate-limit helpers for the public gateway (audit F-20),
// and the licence-expiry timer for connector tunnels (audit F-15).

// TRUST_PROXY is the number of reverse proxies in front of the gateway
// ("1" on Railway). Each proxy appends the address it received the request
// from, so the client address is the N-th entry from the right. The left
// entries are supplied by the client and must not be trusted.
export function clientIp(request, trustProxy = process.env.TRUST_PROXY) {
  const hops = Number.parseInt(String(trustProxy ?? "0"), 10);
  const socketAddress = request.socket?.remoteAddress ?? "unknown";
  if (!Number.isInteger(hops) || hops < 1) return socketAddress;
  const chain = String(request.headers?.["x-forwarded-for"] ?? "").split(",")
    .map((value) => value.trim()).filter(Boolean);
  return chain.length >= hops ? chain[chain.length - hops] : socketAddress;
}

export const MAX_TRACKED_ADDRESSES = 20_000;

// Sliding one-minute window per address. The table is bounded so that a
// flood of distinct addresses cannot exhaust memory.
export function rateAllowed(attempts, ip, { now = Date.now(), limit = 10, windowMs = 60_000,
  maxAddresses = MAX_TRACKED_ADDRESSES } = {}) {
  const recent = (attempts.get(ip) ?? []).filter((at) => now - at < windowMs);
  recent.push(now);
  attempts.delete(ip);
  attempts.set(ip, recent);
  while (attempts.size > maxAddresses) attempts.delete(attempts.keys().next().value);
  return recent.length <= limit;
}

const MAX_TIMER_MS = 2 ** 31 - 1;

// Closes a connector tunnel when the licence presented in its hello expires;
// the tunnel no longer lives past expiresAt until the next reconnect.
export function closeAtLicenseExpiry(socket, expiresAt, { now = Date.now, setTimer = setTimeout } = {}) {
  const expiry = Date.parse(String(expiresAt ?? ""));
  if (!Number.isFinite(expiry)) return null;
  let timer = null;
  const arm = () => {
    const remaining = expiry - now();
    if (remaining <= 0) { socket.close(1008, "license_expired"); return; }
    timer = setTimer(arm, Math.min(remaining, MAX_TIMER_MS));
    timer?.unref?.();
  };
  arm();
  return { cancel: () => clearTimeout(timer) };
}
