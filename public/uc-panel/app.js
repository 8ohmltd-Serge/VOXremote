const $ = (selector) => document.querySelector(selector);
const state = { token: sessionStorage.getItem("voxUcOrganizerToken"), busy: false, session: null,
  kind: null, activeDocumentId: null, documentUrl: null, documentSignature: null,
  refreshing: false, documentsCheckedAt: 0, popup: null };
const compact = new URLSearchParams(location.search).get("window") === "1";
document.body.classList.toggle("compact", compact);
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
  if (!state.token || state.busy || state.refreshing) return;
  state.refreshing = true;
  try {
    const body = await request("/api/v1/uc-organizer/session");
    state.session = body.session;
    state.kind = body.kind;
    $("#claim").hidden = true;
    $("#panel").hidden = false;
    $("#identity").textContent = `${body.title} · ${body.organizerName}`;
    $("#heading").textContent = body.kind === "personal" ? "Моя UC-панель" : "Панель организатора удалённого зала";
    const linked = body.session?.state === "connected";
    const muted = linked && body.session.muted;
    $("#status").className = `status ${linked ? muted ? "muted" : "live" : ""}`;
    const subject = body.kind === "personal" ? "вашего UC-подключения" : "удалённого зала";
    $("#status").textContent = body.meetingStatus === "ready" ? "Подготовка завершена. Конференция ещё не началась."
      : !linked ? `Ожидается подключение ${subject} к конференции VOX-S`
        : muted ? `MUTE · звук ${subject} не поступает в конференцию VOX-S`
          : `В эфире VOX-S · звук ${subject} включён`;
    $("#mute").disabled = !linked || body.meetingStatus !== "active";
    $("#mute").textContent = muted ? "Включить звук" : "Отключить звук";
    $("#scope").textContent = body.kind === "personal"
      ? "Управление относится только к вашему UC-подключению в VOX-S. Другие участники внешней встречи не получают эту панель."
      : "Управление относится только к звуку удалённого зала в VOX-S, а не к микрофонам других людей во внешней встрече.";
    $("#documents").hidden = body.kind !== "personal" || body.rights?.documentsView !== true;
    if (!$("#documents").hidden && Date.now() - state.documentsCheckedAt > 15000) {
      await refreshDocuments();
      state.documentsCheckedAt = Date.now();
    }
    error();
  } catch (failure) {
    error(failure.message);
    if (/сессия|токен|истекла|отозвана|недействительна/i.test(failure.message)) {
      state.token = null;
      sessionStorage.removeItem("voxUcOrganizerToken");
      $("#panel").hidden = true;
      $("#claim").hidden = false;
    }
  } finally { state.refreshing = false; }
}

async function refreshDocuments() {
  const result = await request("/api/v1/uc-organizer/documents");
  const signature = JSON.stringify({ canEdit: result.canEdit,
    documents: result.documents.map((item) => [item.id, item.fileName, item.presentationId]) });
  if (signature === state.documentSignature) return;
  state.documentSignature = signature;
  const list = $("#documentList");
  list.replaceChildren();
  $("#documentStatus").textContent = result.documents.length ? "Доступны опубликованные материалы конференции."
    : "Опубликованных документов пока нет.";
  for (const documentRecord of result.documents) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = documentRecord.fileName;
    button.addEventListener("click", () => openDocument(documentRecord, result.canEdit).catch((failure) => error(failure.message)));
    list.append(button);
  }
  if (state.activeDocumentId && !result.documents.some((item) => item.id === state.activeDocumentId)) closeDocument();
}

function closeDocument() {
  if (state.documentUrl) URL.revokeObjectURL(state.documentUrl);
  state.documentUrl = null;
  state.activeDocumentId = null;
  $("#documentViewer").removeAttribute("src");
  $("#documentDetail").hidden = true;
}

async function refreshNotes(documentId) {
  const scene = await request(`/api/v1/uc-organizer/documents/${encodeURIComponent(documentId)}/scene`);
  const list = $("#noteList");
  list.replaceChildren();
  for (const annotation of scene?.annotations ?? []) {
    if (annotation.tool !== "text") continue;
    const item = document.createElement("li");
    item.textContent = `Страница ${annotation.page}: ${annotation.text} — ${annotation.authorName}`;
    list.append(item);
  }
  return Boolean(scene);
}

async function openDocument(documentRecord, canEdit) {
  closeDocument();
  const chunks = [];
  let mediaType = "application/pdf";
  for (let index = 0, total = 1; index < total; index += 1) {
    const chunk = await request(`/api/v1/uc-organizer/documents/${encodeURIComponent(documentRecord.id)}/chunks/${index}`);
    total = chunk.total;
    mediaType = chunk.mediaType;
    const raw = atob(chunk.data);
    chunks.push(Uint8Array.from(raw, (character) => character.charCodeAt(0)));
  }
  state.documentUrl = URL.createObjectURL(new Blob(chunks, { type: mediaType }));
  state.activeDocumentId = documentRecord.id;
  $("#documentTitle").textContent = documentRecord.fileName;
  $("#documentViewer").src = state.documentUrl;
  $("#documentDetail").hidden = false;
  $("#noteForm").hidden = !canEdit || !await refreshNotes(documentRecord.id);
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
$("#openWindow").addEventListener("click", () => {
  // Open synchronously from the click so a popup blocker need not be disabled.
  // The portal cookie is shared; sessionStorage is copied by the browser to a
  // same-origin popup, and the popup severs its opener immediately on load.
  const popup = window.open(`${location.pathname}?window=1`, "voxUcPanel",
    "popup=yes,width=500,height=680,resizable=yes,scrollbars=yes");
  if (!popup) { error("Браузер заблокировал отдельное окно. Панель остаётся доступной здесь."); return; }
  state.popup = popup;
  popup.focus();
});
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
$("#noteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.activeDocumentId) return;
  const button = $("#noteForm button");
  button.disabled = true;
  try {
    await request(`/api/v1/uc-organizer/documents/${encodeURIComponent(state.activeDocumentId)}/notes`, {
      method: "POST", body: JSON.stringify({ page: Number($("#notePage").value), text: $("#noteText").value })
    });
    $("#noteText").value = "";
    await refreshNotes(state.activeDocumentId);
    error();
  } catch (failure) { error(failure.message); }
  finally { button.disabled = false; }
});

const fragmentCode = new URLSearchParams(location.hash.slice(1)).get("code");
if (compact && window.opener) window.opener = null;
if (fragmentCode) claim(fragmentCode).catch((failure) => error(failure.message));
else if (state.token) refresh();
setInterval(refresh, 3000);
