const match = /^([a-z0-9-]{3,64})\.([A-Za-z0-9_-]{43})$/.exec(location.hash.slice(1));
history.replaceState(null, "", location.pathname);
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const actions = document.querySelector("#actions");
const accept = document.querySelector("#accept");
const decline = document.querySelector("#decline");

async function request(action, response) {
  const result = await fetch(`/api/invitations/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installationId: match[1], token: match[2], ...(response ? { response } : {}) }),
    cache: "no-store", credentials: "omit"
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error || data.message || "Не удалось проверить приглашение");
  return data;
}

function render(data) {
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
if (match) request("lookup").then(render).catch((error) => { status.textContent = error.message; });
else status.textContent = "Ссылка приглашения неполная. Откройте её из сообщения организатора.";
