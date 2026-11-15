// Run before joining/rendering so a stale portal bundle cannot show a second
// entry animation after the conference interface has already appeared.
// A mismatch is reported once per page, not on every 30-second refresh.
const reportedMismatches = new Set();

export async function clientBuildReady(api, clientBuild, reloadKey, knownStatus = null) {
  // Without a known client build (a development URL without ?v=) there is
  // nothing to compare; reloading would only loop.
  if (!clientBuild) return true;
  const status = knownStatus ?? await api.get("/status").catch(() => null);
  if (!status?.build || status.build === clientBuild) {
    sessionStorage.removeItem(reloadKey);
    if (typeof document !== "undefined") document.getElementById("clientBuildMismatch")?.remove();
    return true;
  }
  if (sessionStorage.getItem(reloadKey) === status.build) {
    const key = `${clientBuild}->${status.build}`;
    if (!reportedMismatches.has(key)) {
      reportedMismatches.add(key);
      console.warn(`Client build ${clientBuild} does not match server ${status.build}`);
    }
    if (typeof document !== "undefined" && !document.getElementById("clientBuildMismatch")) {
      const notice = document.createElement("section");
      notice.id = "clientBuildMismatch";
      notice.setAttribute("role", "alert");
      notice.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f6f3f0;color:#171717;font:16px/1.5 system-ui,sans-serif";
      const card = document.createElement("div");
      card.style.cssText = "max-width:520px;padding:24px;border:1px solid #d8d0c8;border-radius:12px;background:white";
      const heading = document.createElement("h1");
      heading.textContent = "Интерфейс участника обновляется";
      heading.style.cssText = "margin:0 0 10px;font-size:24px";
      const detail = document.createElement("p");
      detail.textContent = `Версия интерфейса ${clientBuild} не совпадает с версией сервера ${status.build}. Повторите загрузку через несколько минут. Если сообщение остаётся, администратору нужно обновить клиент на Connect.`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Повторить загрузку";
      retry.style.cssText = "min-height:42px;padding:8px 16px;border:0;border-radius:8px;background:#111;color:white;font:inherit;cursor:pointer";
      retry.addEventListener("click", () => location.reload());
      card.append(heading, detail, retry);
      notice.append(card);
      document.body.append(notice);
    }
    return false;
  }
  sessionStorage.setItem(reloadKey, status.build);
  location.reload();
  return false;
}
