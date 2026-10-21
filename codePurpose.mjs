export function codeTableForPurpose(value) {
  if (value === undefined || value === "remote-participant") return "remote_codes";
  if (value === "uc-organizer") return "uc_organizer_codes";
  return null;
}

export function sessionTableForPath(pathname) {
  return pathname.startsWith("/api/v1/uc-organizer/") ? "uc_organizer_sessions" :
    pathname.startsWith("/api/v1/") ? "remote_sessions" : null;
}
