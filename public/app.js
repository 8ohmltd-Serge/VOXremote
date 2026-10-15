const form = document.querySelector("#codeForm");
const state = document.querySelector("#state");
const deviceId = () => {
  let value = localStorage.getItem("edge-s-device-id");
  if (!value) { value = `web-${crypto.randomUUID()}`; localStorage.setItem("edge-s-device-id", value); }
  return value;
};

const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
const linkedCode = fragment.get("code");
if (linkedCode) {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  form.code.value = linkedCode;
  queueMicrotask(() => form.requestSubmit());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  state.textContent = "Проверяем код и соединяемся с сервером…";
  try {
    const response = await fetch("/api/remote/claim", { method: "POST", cache: "no-store",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.code.value }) });
    const identity = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(identity.error || "Не удалось войти");
    const handoff = {
      serverUrl: location.origin, meetingId: identity.meetingId, userId: identity.participantId,
      displayName: identity.displayName, role: identity.role, permissions: identity.permissions,
      entitlementId: `conference-seat:${identity.participantId}`, deviceId: deviceId(),
      remote: true, authToken: identity.token
    };
    const payload = JSON.stringify(handoff);
    sessionStorage.setItem("edge-conference-handoff-v1", payload);
    localStorage.setItem("edge-conference-handoff-v1", payload);
    location.replace(`/client/?handoff=${Date.now()}`);
  } catch (error) {
    state.textContent = error.message;
    button.disabled = false;
  }
});
