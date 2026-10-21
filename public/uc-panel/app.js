const $ = (selector) => document.querySelector(selector);
const state = { token: sessionStorage.getItem("voxUcOrganizerToken"), busy: false, session: null };
const error = (message = "") => { $("#error").textContent = message; $("#error").hidden = !message; };

async function request(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...options,
    headers: { "content-type": "application/json", ...(state.token ? { "x-vox-uc-session": state.token } : {}),
      ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Ошибка ${response.status}`);
  return body;
}

async function refresh() {
  if (!state.token || state.busy) return;
  try {
    const body = await request("/api/v1/uc-organizer/session");
    state.session = body.session;
    $("#claim").hidden = true;
    $("#panel").hidden = false;
    $("#identity").textContent = `${body.title} · ${body.organizerName}`;
    const linked = body.session?.state === "connected";
    const muted = linked && body.session.muted;
    $("#status").className = `status ${linked ? muted ? "muted" : "live" : ""}`;
    $("#status").textContent = !linked ? "Ожидается подключение удалённого зала к конференции VOX-S"
      : muted ? "MUTE · звук этого зала не поступает в конференцию VOX-S" : "В эфире VOX-S · звук удалённого зала включён";
    $("#mute").disabled = !linked;
    $("#mute").textContent = muted ? "Включить звук зала" : "Отключить звук зала";
    error();
  } catch (failure) {
    error(failure.message);
    if (/сессия|токен|истекла|отозвана|недействительна/i.test(failure.message)) {
      state.token = null;
      sessionStorage.removeItem("voxUcOrganizerToken");
      $("#panel").hidden = true;
      $("#claim").hidden = false;
    }
  }
}

async function claim(code) {
  error();
  const body = await request("/api/uc/claim", { method: "POST", body: JSON.stringify({ code }) });
  state.token = body.token;
  sessionStorage.setItem("voxUcOrganizerToken", body.token);
  history.replaceState(null, "", location.pathname);
  await refresh();
}

$("#claim").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await claim($("#code").value); } catch (failure) { error(failure.message); }
});
$("#refresh").addEventListener("click", refresh);
$("#mute").addEventListener("click", async () => {
  if (!state.session || state.busy) return;
  state.busy = true;
  $("#mute").disabled = true;
  try {
    await request("/api/v1/uc-organizer/mute", { method: "PATCH",
      body: JSON.stringify({ muted: !state.session.muted }) });
  } catch (failure) { error(failure.message); }
  finally { state.busy = false; await refresh(); }
});

const fragmentCode = new URLSearchParams(location.hash.slice(1)).get("code");
if (fragmentCode) claim(fragmentCode).catch((failure) => error(failure.message));
else if (state.token) refresh();
setInterval(refresh, 3000);
