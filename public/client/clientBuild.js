// Run before joining/rendering so a stale portal bundle cannot show a second
// entry animation after the conference interface has already appeared.
export async function clientBuildReady(api, clientBuild, reloadKey, knownStatus = null) {
  const status = knownStatus ?? await api.get("/status").catch(() => null);
  if (!status?.build || status.build === clientBuild) {
    sessionStorage.removeItem(reloadKey);
    return true;
  }
  if (sessionStorage.getItem(reloadKey) === status.build) {
    console.error(`Client build ${clientBuild} does not match server ${status.build}`);
    return true;
  }
  sessionStorage.setItem(reloadKey, status.build);
  location.reload();
  return false;
}
