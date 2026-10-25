export function createWaitingRoom({ escapeHtml, openDocumentViewer, connectWithProfile, connectError,
  onConnected, onLeave }) {
  const $ = (selector) => document.querySelector(selector);
  let timer = null;
  let polling = false;
  let profile = null;
  let api = null;
  let documents = [];

  function stop() {
    clearInterval(timer);
    timer = null;
    profile = null;
    api = null;
    documents = [];
  }

  function render(meeting, visibleDocuments) {
    $("#connectView .connect-card").classList.add("is-waiting");
    $("#connectTitle").textContent = "Ожидание начала конференции";
    $("#connectLead").hidden = true;
    $("#connectEntryLink").hidden = true;
    $("#waitingPanel").hidden = false;
    $("#waitingTitle").textContent = meeting.title;
    const date = Date.parse(meeting.scheduledAt);
    $("#waitingTime").textContent = Number.isFinite(date)
      ? `Планируемое начало: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date)}`
      : "Время начала уточняется";
    $("#waitingStatus").textContent = "Ожидаем запуска организатором. Подключение начнётся автоматически.";
    const agenda = (meeting.agenda ?? []).filter((item) => item.kind !== "intermission");
    $("#waitingAgenda").innerHTML = agenda.length
      ? agenda.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("")
      : `<li class="waiting-empty">Вопросы повестки пока не добавлены.</li>`;
    documents = visibleDocuments.filter((item) => item.availableImmediately === true);
    $("#waitingMaterials").innerHTML = documents.length
      ? documents.map((item) => `<button class="waiting-material" type="button" data-document-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.fileName)}</span><span>Открыть</span></button>`).join("")
      : `<p class="waiting-empty">Доступных до начала материалов пока нет.</p>`;
  }

  async function poll() {
    if (!api || !profile || polling) return;
    polling = true;
    try {
      const meetingId = encodeURIComponent(profile.meetingId);
      const meeting = await api.get(`/meetings/${meetingId}`);
      if (meeting.status === "active") {
        $("#waitingStatus").textContent = "Конференция началась. Подключаемся…";
        if (await connectWithProfile(profile)) { stop(); onConnected(); }
      } else if (meeting.status === "ready") {
        render(meeting, await api.get(`/meetings/${meetingId}/documents`));
      } else {
        stop();
        $("#waitingStatus").textContent = "Подготовка конференции завершена. Вернитесь на страницу входа.";
      }
    } catch (error) {
      $("#waitingStatus").textContent = `Не удалось подключиться: ${error.message}. Повторяем попытку автоматически.`;
    } finally { polling = false; }
  }

  async function show(nextProfile, nextApi, meeting) {
    stop();
    profile = nextProfile;
    api = nextApi;
    render(meeting, await api.get(`/meetings/${encodeURIComponent(profile.meetingId)}/documents`).catch(() => []));
    timer = setInterval(() => { void poll(); }, 4000);
  }

  $("#waitingLeave").addEventListener("click", () => { stop(); onLeave(); });
  $("#waitingMaterials").addEventListener("click", (event) => {
    const button = event.target.closest("[data-document-id]");
    const item = documents.find((document) => document.id === button?.dataset.documentId);
    if (!item || !api || !profile) return;
    void openDocumentViewer({ api, document: item, userId: profile.userId })
      .catch((error) => connectError(`Материал недоступен: ${error.message}`));
  });
  return { show, stop };
}
