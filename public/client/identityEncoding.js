export function encodeIdentityHeader(value) {
  return `utf8:${encodeURIComponent(String(value ?? ""))}`;
}



