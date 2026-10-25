const match = /^([a-z0-9-]{3,64})\.([A-Za-z0-9_-]{43})$/.exec(location.hash.slice(1));
history.replaceState(null, "", location.pathname);
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const actions = document.querySelector("#actions");
const accept = document.querySelector("#accept");
const decline = document.querySelector("#decline");
const retryLookup = document.querySelector("#retryLookup");

async function request(action, response) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const result = await fetch(`/api/invitations/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId: match[1], token: match[2], ...(response ? { response } : {}) }),
      cache: "no-store", credentials: "omit", signal: controller.signal
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(data.error || data.message || "Не удалось проверить приглашение");
    if (!data || typeof data !== "object" ||
        typeof data.meetingTitle !== "string" || !data.meetingTitle.trim() ||
        typeof data.participantName !== "string" || !data.participantName.trim() ||
        !Number.isFinite(Date.parse(data.scheduledAt))) {
      throw new Error("Сервер вернул неполные сведения о приглашении. Обновите страницу или попросите организатора проверить ссылку.");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Ответ сервера задерживается. Проверьте соединение и попробуйте ещё раз.");
    if (error instanceof TypeError) throw new Error("Нет соединения с сервером. Проверьте интернет и повторите попытку.");
    throw error;
  } finally { clearTimeout(timer); }
}

function render(data) {
  retryLookup.hidden = true;
  document.querySelector("#meetingTitle").textContent = data.meetingTitle;
  document.querySelector("#meetingTime").textContent = new Date(data.scheduledAt).toLocaleString("ru-RU", {
    dateStyle: "long", timeStyle: "short"
  });
  const roomName = document.querySelector("#roomName");
  const roomAddress = document.querySelector("#roomAddress");
  roomName.hidden = roomAddress.hidden = data.uc === true;
  roomName.textContent = data.uc ? "" : `Зал: ${data.roomName}`;
  roomAddress.textContent = data.uc ? "" : `Адрес: ${data.roomAddress || "не указан"}`;
  document.querySelector("#participationFormat").textContent = data.uc
    ? `Подключение через ${data.ucProvider || "UC-платформу"}`
    : `Участие: ${data.remote ? "дистанционно" : "очно"}`;
  const ucMeeting = document.querySelector("#ucMeeting");
  ucMeeting.replaceChildren();
  ucMeeting.hidden = !data.ucMeetingUrl;
  if (data.ucMeetingUrl) {
    const link = document.createElement("a");
    link.href = data.ucMeetingUrl;
    link.rel = "noopener noreferrer";
    link.textContent = "Открыть UC-комнату";
    ucMeeting.append(link);
  }
  document.querySelector("#participantName").textContent = `Участник: ${data.participantName}`;
  details.hidden = false;
  actions.hidden = Boolean(data.response);
  status.textContent = data.response === "accepted" ? "Участие подтверждено." :
    data.response === "declined" ? "Вы сообщили, что не сможете участвовать." :
      "Сообщите организатору, сможете ли вы участвовать.";
}

async function answer(response) {
  accept.disabled = true;
  decline.disabled = true;
  status.textContent = "Сохраняем ответ…";
  try { render(await request("respond", response)); }
  catch (error) { status.textContent = error.message; accept.disabled = false; decline.disabled = false; }
}

accept.addEventListener("click", () => answer("accepted"));
decline.addEventListener("click", () => answer("declined"));
async function loadInvitation() {
  retryLookup.disabled = true;
  status.textContent = "Проверяем приглашение…";
  try { render(await request("lookup")); }
  catch (error) {
    status.textContent = error.message;
    retryLookup.hidden = false;
  } finally { retryLookup.disabled = false; }
}
retryLookup.addEventListener("click", loadInvitation);
if (match) loadInvitation();
else status.textContent = "Ссылка приглашения неполная. Откройте её из сообщения организатора.";
