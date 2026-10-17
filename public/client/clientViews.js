import {
  $, $$, sleep, SESSION_KEY, HANDOFF_KEY, AUTH_TOKEN_KEY, CAMERA_AUTO_KEY, MICROPHONE_AUTO_KEY,
  MEDIA_DEVICE_KEY, TRANSLATION_VOLUME_KEY, CLIENT_BUILD, interfaceLocale, uiText, BUILD_RELOAD_KEY,
  TECHNICAL_CONFERENCE_ROLES, CONFERENCE_ROLE_LABELS, TAB_TITLES, SECRETARY_LAYOUT_DEFAULT, TAB_ID_KEY,
  THUMBNAIL_FPS, RESOURCE_CONSTRAINED_CLIENT, THUMBNAIL_DECODE_BUDGET, PRESENCE_ID, TAB_ID, state,
  EdgeHttpError, EdgeApi, escapeHtml, formatBytes, saveProfile, loadMediaDevicePreferences, saveMediaDevicePreferences,
  refreshMediaDevices, deviceConstraint, mediaDeviceOptions, applyAudioOutputSelection, changeMediaDevice,
  saveActiveSession, clearActiveSession, enterApplication, voteStorageKey, loadVoteSelections,
  saveVoteSelections, connectError, notify, httpForm, voteElectorateCandidates, voteCreationForm,
  formatAgendaTime, agendaTimeline, agendaStatusHtml, openAgendaDialog, confirmDialog, roomSeatScheme,
  offerRoomStation, maybeOfferRoomStation, connectWithProfile, consumeConferenceHandoff, autoPublishOwnCamera,
  queryCapturePermission, installLocalVideoTrack, isAppleMobile, scheduleVideoRecovery, recoverSuspendedVideo,
  enableLocalAv, toggleParticipantVideo, toggleLocalMediaPreference, hasLocalVideo, restoreActiveSession,
  startTimers, clearTimers, schedulePushRefresh, refreshFloorState, updateSourceWallFloorState,
  applyAudioMeters, updateTranslationMeters, setEventConnectionStatus, startEventStream, refreshProgram, refreshAll, updateBuildLabels,
  selectTab, activateStreamsPreview, syncSourceWall, budgetedThumbnailStreams, disconnect, exitClosedConference,
  handleMicrophoneAction, bootstrapClient, inMcu, runAction, requestFloor, applyLocalFloorResult,
  runMicrophoneAction, activateChairMicrophone, grantFloor, releaseFloor, selfRelease, saveMicrophoneLimit,
  toggleFifo, saveDiscussionMode, toggleChairPriority, muteAllMicrophones, activateAgenda, revealAccessPin,
  editAccessPin, changeParticipantRole, toggleIncomingAudio, removeParticipant, confirmRemoveParticipant,
  ensureMicrophone, syncLocalMicrophone, startCamera, stopCamera, startPublishing, ensurePublishedMedia,
  registerSystemCamera, editStream, deleteStream, deleteCamera, refreshMediaRuntime, discoverOnvifCameras,
  addOnvifCamera, quickProbeCamera, probeCamera, attachCamera, startMediaWorker, startMulticast,
  routePreview, takeProgram, resumeAutoDirector, discoverNdiSources, attachNdiSource, saveNdiCamera,
  toggleCameraAutoAttach, receiveNdiSource, receiveNdiStream, toggleNdiOutput, configureNdiOutput,
  startNdiOutput, stopNdiJob, toggleAutoDirector, savePgmMode, resetPgmMode, selectStream, ensureStreamPreview,
  mediaForStream, getMcuDevice, createMcuTransport, publishMediaToMcu, closeMcuTransport, closeMcuPublisher,
  subscribeMcuStream, closeProgramSubscriberEntry, RECEIVE_DISCONNECTED_GRACE_MS, observeReceiveTransport,
  subscriptionHealthy, inboundProgramVideoCounters, checkProgramVideoHealth, closeProgramSubscriber,
  waitForVideoFrame, watchProgramStream, closeMcuSubscriber, watchClientStream, reconcileSelectedStream,
  pollSignaling, closeViewerStream, pruneUnusedViewerPeers, ensureAudioContext, updateAudioUnlock,
  mobileAudioEndpoint, updateHeadphoneWarning, attachAudioMixInput, detachAudioMixInput, syncConferenceAudio,
  reconcileServerAudioMix, watchServerAudioMix, closeServerAudioSubscriber, closeAllPeers, bindChatChannel,
  newChatPeer, startChatOffer, openChat, pollChatSignaling, sendChatMessage, closeAllChats, checkReadiness,
  checkDevice, deviceCommand, publishRoom, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote,
  castAdvancedVote, createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument,
  openDocument, startPresentationBroadcast, shareScreen, stopScreenShare, installPwa, toggleFullscreen,
  encodeIdentityHeader, observeBottomControls, serviceRequestCategoryLabel, serviceRequestStatusLabel,
  serviceRequestCategoryOptions, eventRetryDelay, PARTICIPANT_LANGUAGES, participantLanguageOptions, participantLanguage,
  setParticipantLanguage, participantText, participantFormatTime, openDocumentViewer, closeDocumentViewer, updateDocumentViewerRights,
  documentSceneEvent
} from "./app.js";

function renderPage() {
  if (!state.meeting) return;
  $$(".nav-item[data-tab]").forEach((button) => {
    const tab = button.dataset.tab;
    const title = uiText(`nav.${tab}`);
    const label = button.closest("#mobileNav") ? uiText(`nav.mobile.${tab}`) : title;
    button.classList.toggle("active", tab === state.activeTab);
    const text = button.querySelector("span:last-child");
    if (text) text.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
  });
  const pageTitle = $("#currentPageTitle");
  if (pageTitle) pageTitle.textContent = state.activeTab === "translation" && ["interpreter", "translator"].includes(state.profile.role)
    ? uiText("nav.interpreter") : (Object.hasOwn(TAB_TITLES, state.activeTab) ? uiText(`nav.${state.activeTab}`) : "");
  $("#participantName").textContent = state.profile.displayName;
  $("#participantRole").textContent = CONFERENCE_ROLE_LABELS[state.profile.role] ?? state.profile.role;
  $("#appView").dataset.role = state.profile.role;
  const secretaryLayoutButton = $("#secretaryLayoutBtn");
  const secretaryLayoutActions = $("#secretaryLayoutActions");
  const editableWorkspace = (state.activeTab === "conference" ||
    (state.activeTab === "translation" && ["interpreter", "translator"].includes(state.profile.role))) && canEditWorkspaceLayout();
  if (secretaryLayoutButton) secretaryLayoutButton.hidden = !editableWorkspace || Boolean(state.secretaryLayoutDraft);
  if (secretaryLayoutButton && ["interpreter", "translator"].includes(state.profile.role)) secretaryLayoutButton.title = "Настроить рабочее место переводчика";
  if (secretaryLayoutActions) secretaryLayoutActions.hidden = !editableWorkspace || !state.secretaryLayoutDraft;
  renderMicrophoneDock();
  renderFixedControls();
  const persistentProgramStage = $("#programStage") ?? state.programStageNode;
  persistentProgramStage?.remove();
  if (persistentProgramStage) state.programStageNode = persistentProgramStage;
  const persistentStudioPreview = $("#studioPreviewStage") ?? state.studioPreviewStageNode;
  const persistentStudioProgram = $("#studioProgramStage") ?? state.studioProgramStageNode;
  persistentStudioPreview?.remove(); persistentStudioProgram?.remove();
  if (persistentStudioPreview) state.studioPreviewStageNode = persistentStudioPreview;
  if (persistentStudioProgram) state.studioProgramStageNode = persistentStudioProgram;
  const draftInput = $("#chatMessage");
  let restoreDraftFocus = null;
  if (draftInput?.dataset.sessionId) {
    state.chatDrafts.set(draftInput.dataset.sessionId, draftInput.value);
    if (document.activeElement === draftInput) {
      restoreDraftFocus = { start: draftInput.selectionStart, end: draftInput.selectionEnd };
    }
  }
  const page = $("#pageContent");
  const secretaryInput = $("#secretaryText");
  const secretaryFocus = secretaryInput && document.activeElement === secretaryInput
    ? { start: secretaryInput.selectionStart, end: secretaryInput.selectionEnd } : null;
  const fitConferenceScreen = state.activeTab === "conference" && !TECHNICAL_CONFERENCE_ROLES.has(state.profile.role);
  page.classList.toggle("conference-screen-fit", fitConferenceScreen);
  if (state.activeTab === "conference") page.innerHTML = conferenceHtml();
  if (secretaryFocus && state.activeTab === "conference") {
    const input = $("#secretaryText");
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(Math.min(secretaryFocus.start, input.value.length),
      Math.min(secretaryFocus.end, input.value.length));
  }
  if (state.activeTab === "streams") page.innerHTML = streamsHtml();
  if (state.activeTab === "voting") page.innerHTML = votingHtml();
  if (state.activeTab === "content") {
    page.innerHTML = contentHtml();
    // A push refresh can rerender Materials while the native file chooser is
    // open. Keep each input's own listener so the chosen file still uploads
    // even when that input has since been detached from #pageContent.
    for (const [id, action, notice] of [
      ["documentUpload", uploadDocument, "Файл отправлен"],
      ["agendaDocumentUpload", uploadAgendaDocument, "Документ прикреплён к повестке"]
    ]) {
      page.querySelector(`#${id}`)?.addEventListener("change", (event) => {
        const file = event.currentTarget.files?.[0];
        if (file) void runAction(() => action(file), notice);
      });
    }
  }
  if (state.activeTab === "translation") page.innerHTML = translationHtml();
  if (state.activeTab === "chat") page.innerHTML = chatHtml();
  if (state.activeTab === "operations") page.innerHTML = operationsHtml();
  if (state.activeTab === "settings") page.innerHTML = settingsHtml();
  const addMenu = $("#workspaceAddMenu");
  if (addMenu) {
    const draft = state.secretaryLayoutDraft;
    addMenu.hidden = !draft || state.profile.role === "secretary" || !["conference", "translation"].includes(state.activeTab);
    if (!addMenu.hidden) {
      const addable = workspaceAddablePanels(draft);
      addMenu.querySelector(".workspace-add-options").innerHTML = addable.length
        ? addable.map((id) => `<button type="button" data-action="layout-add" data-panel-id="${id}">${escapeHtml(WORKSPACE_PANEL_LABELS[id])}</button>`).join("")
        : `<small>Все блоки уже размещены</small>`;
    }
  }
  if (["conference", "translation"].includes(state.activeTab) && state.programStageNode) {
    $("#programStage")?.replaceWith(state.programStageNode);
  }
  if (state.activeTab === "streams") {
    if (state.studioPreviewStageNode) $("#studioPreviewStage")?.replaceWith(state.studioPreviewStageNode);
    if (state.studioProgramStageNode) $("#studioProgramStage")?.replaceWith(state.studioProgramStageNode);
    mountStudioMonitors(); mountStreamThumbnails(); mountStreamPreviewModal(); hydrateSlatePreviews();
  }
  if (["conference", "translation"].includes(state.activeTab)) mountProgram();
  if (state.activeTab === "chat" && state.activeChatId) {
    const input = $("#chatMessage");
    if (input && restoreDraftFocus) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(restoreDraftFocus.start, restoreDraftFocus.end);
    }
  }
  updateChatNotice();
  updateNavigationVisibility();
  updateTranslationMeters();
}

function hasConferenceInterpreter() {
  const assignedRole = (person) => ["interpreter", "translator"].includes(person?.role) && !person.excludedAt;
  return (state.meeting?.preparedParticipants ?? []).some(assignedRole) ||
    Object.values(state.meeting?.participants ?? {}).some(assignedRole);
}

function updateNavigationVisibility() {
  const interpreterRole = ["interpreter", "translator"].includes(state.profile.role);
  const visibility = {
    conference: !interpreterRole,
    streams: !interpreterRole,
    voting: !interpreterRole && (state.votes.length > 0 || can("votes.manage")),
    translation: interpreterRole || Boolean(state.translateStatus?.licensed && hasConferenceInterpreter()),
    content: state.documents.length > 0 || state.presentations.length > 0 ||
      canUploadFiles() || can("documents.upload") || can("presentations.control")
  };
  for (const [tab, shown] of Object.entries(visibility)) {
    $$(`.nav-item[data-tab="${tab}"]`).forEach((button) => { button.hidden = !shown; });
    if (!shown && state.activeTab === tab) selectTab(interpreterRole ? "translation" : "conference").catch(() => {});
  }
  const remoteParticipant = state.profile?.remote === true;
  $$(".nav-item[data-tab='operations']").forEach((button) => { button.hidden = interpreterRole || remoteParticipant; });
  $$(".nav-item[data-tab='translation']").forEach((button) => {
    const label = button.querySelector("span:last-child");
    if (interpreterRole && label) label.textContent = button.closest("#mobileNav") ? "Пульт" : "Рабочее место";
  });
}

function translationHtml() {
  const interpreterRole = ["interpreter", "translator"].includes(state.profile.role);
  const translation = state.translateMeeting ?? { channels: [], assignments: {}, selections: {} };
  const channels = translation.channels ?? [];
  const assignment = translation.assignments?.[state.participantId] ?? null;
  const channelName = (id) => id === "floor" ? "Оригинал" : channels.find((item) => item.id === id)?.name ?? id;
  const languageName = (code) => channels.find((item) => item.languageCode === code)?.name ?? code?.toUpperCase() ?? "—";
  const speaking = (state.meeting.activeSpeakerIds ?? []).map((id) => state.meeting.participants?.[id]).filter(Boolean);
  const agendaTitle = state.meeting.agenda?.find((item) => item.id === state.meeting.activeAgendaItemId)?.title;
  const speakerNotice = speaking.length ? speaking.map((speaker) => {
    const native = speaker.nativeLanguage ?? state.meeting.protocolLanguage ?? "ru";
    const expected = assignment?.activeDirection === "reverse" ? assignment.targetLanguageCode : assignment?.sourceLanguageCode;
    return `<div class="translation-speaker"><strong>${escapeHtml(speaker.displayName)}</strong><span>${escapeHtml(languageName(native))}${native !== expected ? " · язык отличается от назначенного входа" : ""}</span></div>`;
  }).join("") : `<p class="empty">Микрофоны выступающих сейчас закрыты.</p>`;
  const translationRecording = (state.translateStatus?.settings?.recordingEnabled && state.meeting.recordingEnabled)
    ? "Запись канала включена вместе с записью конференции" : "Запись канала выключена";
  const microphoneReady = Boolean(state.localMedia?.getAudioTracks().some((track) => track.readyState === "live") &&
    state.publishedStream?.capabilities?.audio);
  const forward = assignment?.activeDirection !== "reverse";
  const inputName = channelName(forward ? assignment?.sourceChannelId : assignment?.channelId);
  const outputName = forward ? channelName(assignment?.channelId) : languageName(assignment?.sourceLanguageCode);
  const interpreterPanels = interpreterRole ? {
    program: `<article class="panel translation-program-panel"><h4 class="panel-title">Трансляция зала</h4><div id="programStage" class="preview-stage translation-program-stage"><div class="preview-empty">Ожидание изображения из зала.</div></div></article>`,
    speakers: `<article class="panel translation-speakers"><h4 class="panel-title">Сейчас говорят</h4>${speakerNotice}</article>`,
    translation: assignment ? `<article class="panel panel-pad translation-workplace-side"><h4 class="panel-title">Управление переводом</h4>
      <div class="translation-route"><div><small>Слушаю</small><strong>${escapeHtml(inputName)}</strong><span>${escapeHtml(languageName(forward ? assignment.sourceLanguageCode : assignment.targetLanguageCode))}</span></div><div><small>Перевожу на</small><strong>${escapeHtml(outputName)}</strong><span>${escapeHtml(languageName(forward ? assignment.targetLanguageCode : assignment.sourceLanguageCode))}</span></div></div>
      <p class="translation-recording-state">${escapeHtml(translationRecording)} · ${assignment.priority === "backup" ? "резервный переводчик" : "основной переводчик"}</p>
      <div class="translation-microphone-status" role="status"><span>${microphoneReady ? "Микрофон устройства подключён" : "Микрофон устройства не подключён"}</span>${microphoneReady ? "" : `<button class="button button-secondary" data-action="translate-enable-microphone">Подключить микрофон</button>`}</div>
      <label class="translation-volume translation-monitor-volume">Громкость входящего звука <input type="range" min="0" max="100" value="${Math.round(state.translationVolume * 100)}" data-translation-volume><output>${Math.round(state.translationVolume * 100)}%</output></label>
      ${assignment.direction === "both" ? `<div class="translation-direction" role="group" aria-label="Направление перевода"><button class="button ${forward ? "button-primary" : "button-secondary"}" data-action="translate-direction" data-direction="forward" aria-pressed="${forward}" ${assignment.status === "on-air" ? "disabled" : ""}>${escapeHtml(languageName(assignment.sourceLanguageCode))} → ${escapeHtml(languageName(assignment.targetLanguageCode))}</button><button class="button ${!forward ? "button-primary" : "button-secondary"}" data-action="translate-direction" data-direction="reverse" aria-pressed="${!forward}" ${assignment.status === "on-air" ? "disabled" : ""}>${escapeHtml(languageName(assignment.targetLanguageCode))} → ${escapeHtml(languageName(assignment.sourceLanguageCode))}</button></div><small>Направление меняется только после выхода из эфира.</small>` : ""}
      <div class="translation-console"><button class="button ${assignment.status === "on-air" ? "button-danger" : "button-primary"}" data-action="translate-state" data-on-air="${assignment.status !== "on-air"}" aria-pressed="${assignment.status === "on-air"}">${assignment.status === "on-air" ? "Завершить перевод" : "Выйти в эфир"}</button><button class="button ${assignment.cough ? "button-danger" : "button-secondary"}" data-action="translate-cough" data-cough="${!assignment.cough}" aria-pressed="${assignment.cough}">${assignment.cough ? "Включить микрофон" : "Заглушить микрофон"}</button>${state.translateStatus?.capabilities?.includes("talkback") && state.translateStatus?.settings?.talkbackEnabled ? `<button class="button ${assignment.talkback ? "button-primary" : "button-secondary"}" data-action="translate-talkback" data-talkback="${!assignment.talkback}" aria-pressed="${assignment.talkback}">Служебная связь</button>` : ""}</div>
      ${translationMonitorHtml(forward ? assignment.sourceChannelId : assignment.channelId, inputName)}</article>`
      : `<article class="panel panel-pad translation-workplace-side"><h4 class="panel-title">Управление переводом</h4><p class="empty">Ожидание назначения языковой пары и входного канала оператором.</p></article>`
  } : null;
  let interpreter = "";
  if (interpreterRole) {
    const allowed = workspaceAllowedPanels();
    const fallback = workspaceLayoutDefault();
    const current = state.secretaryLayoutDraft ?? state.secretaryLayout;
    const fits = Array.isArray(current?.order) && current.order.includes("translation") && current.order.every((id) => allowed.includes(id));
    if (!fits) state.secretaryLayout = structuredClone(fallback);
    const layout = fits ? current : state.secretaryLayout;
    interpreter = `<section class="translation-workplace"><div class="status-row"><h3 class="panel-title">Рабочее место переводчика</h3><span class="chip ${assignment?.status === "on-air" && !assignment.cough && !assignment.talkback ? "translation-live" : ""}" role="status">${assignment?.talkback ? "Служебная связь" : assignment?.cough ? "Микрофон заглушен" : assignment?.status === "on-air" ? "● В эфире" : assignment ? "Готов" : "Ожидание назначения"}</span></div>
      ${agendaTitle ? `<p class="translation-agenda"><span>Текущая тема</span><strong>${escapeHtml(agendaTitle)}</strong></p>` : ""}
      <div class="workspace-area"><div class="secretary-layout-grid workspace-grid translation-workplace-grid${state.secretaryLayoutDraft ? " is-editing" : ""}" style="grid-auto-rows:${WORKSPACE_ROW}px;column-gap:${WORKSPACE_GAP}px">${layout.order.map((id) => secretaryLayoutPanel(id, interpreterPanels[id])).join("")}</div></div></section>`;
  }
  const operator = !interpreterRole && can("conference.participants") ? `<article class="panel panel-pad"><div class="status-row"><h4 class="panel-title">Назначения переводчиков</h4><button class="button button-secondary" data-action="translate-configure">Языки конференции</button></div>${Object.values(state.meeting.participants ?? {}).filter((item) => item.state === "joined" && ["interpreter", "translator"].includes(item.role)).map((item) => {
    const current = translation.assignments?.[item.id];
    return `<div class="translation-assignment" data-translation-participant="${escapeHtml(item.id)}"><strong>${escapeHtml(item.displayName)}</strong><label>Язык входа<select data-translation-source-language>${[state.meeting.protocolLanguage ?? "ru", ...channels.map((channel) => channel.languageCode)].filter((code, index, all) => all.indexOf(code) === index).map((code) => `<option value="${escapeHtml(code)}" ${current?.sourceLanguageCode === code ? "selected" : ""}>${escapeHtml(languageName(code))}</option>`).join("")}</select></label><label>Язык выхода<select data-translation-channel><option value="">Выберите язык</option>${channels.map((channel) => `<option value="${escapeHtml(channel.id)}" ${current?.channelId === channel.id ? "selected" : ""}>${escapeHtml(channel.name)}</option>`).join("")}</select></label><label>Источник звука<select data-translation-source><option value="floor">Оригинал</option>${state.translateStatus?.capabilities?.includes("relay") ? channels.map((channel) => `<option value="${escapeHtml(channel.id)}" ${current?.sourceChannelId === channel.id ? "selected" : ""}>Перевод с канала: ${escapeHtml(channel.name)}</option>`).join("") : ""}</select></label><label>Направление<select data-translation-direction><option value="forward">В одну сторону</option><option value="both" ${current?.direction === "both" ? "selected" : ""}>В обе стороны</option></select></label><label>Режим<select data-translation-priority><option value="primary" ${current?.priority !== "backup" ? "selected" : ""}>Основной</option><option value="backup" ${current?.priority === "backup" ? "selected" : ""}>Резервный</option></select></label><button class="button button-secondary" data-action="translate-assign" data-participant-id="${escapeHtml(item.id)}">Назначить</button></div>`;
  }).join("") || `<p class="empty">Подключённых переводчиков нет. Назначьте участнику роль «Переводчик».</p>`}</article>` : "";
  return `${cameraSetupNoticeHtml()}${pageHead(interpreterRole ? "Рабочее место переводчика" : "Синхроперевод", interpreterRole ? "Звук выступающих и языковой канал" : "Каналы перевода")}${interpreterRole ? "" : translationListenHtml()}${interpreter}${operator}`;
}

// "Язык прослушивания" card: on the Translation tab and as a block of the conference workspace.
function translationListenHtml(extraClass = "") {
  const translation = state.translateMeeting ?? { channels: [], selections: {} };
  const channels = translation.channels ?? [];
  const selected = translation.selections?.[state.participantId]?.channelId ?? "floor";
  const selectedChannel = channels.find((item) => item.id === selected);
  const languageButtons = [{ id: "floor", name: "Оригинал" }, ...channels].map((item) =>
    `<button class="button ${selected === item.id ? "button-primary" : "button-secondary"} translation-channel-choice" data-action="translate-select" data-channel-id="${escapeHtml(item.id)}" aria-pressed="${selected === item.id}" title="${escapeHtml(item.name)}"><span>${escapeHtml(item.name)}</span><span class="translation-channel-status" data-translation-signal="${item.id === "floor" ? "program" : `language:${escapeHtml(item.id)}`}" data-signal-state="unknown"><span data-translation-status>Нет данных</span></span></button>`).join("");
  return `<article class="panel panel-pad translation-listen ${extraClass}"><h4 class="panel-title">Язык прослушивания</h4>${translationMonitorHtml(selectedChannel?.id ?? "floor", selectedChannel?.name ?? "Оригинал")}<p class="translation-listen-note">Если переводчик не в эфире, звучит оригинал</p><div class="translation-channel-choices" role="group" aria-label="Язык прослушивания">${languageButtons}</div><label class="translation-volume">Громкость канала <input type="range" min="0" max="100" value="${Math.round(state.translationVolume * 100)}" data-translation-volume><output>${Math.round(state.translationVolume * 100)}%</output></label></article>`;
}

function translationMonitorHtml(channelId, channelName) {
  const rows = channelId === "floor" ? [{ id: "floor", name: "Оригинал", kind: "Сейчас звучит" }]
    : [{ id: channelId, name: channelName, kind: "Выбранный канал" }, { id: "floor", name: "Оригинал", kind: "Исходный звук" }];
  return `<div class="translation-monitors" aria-label="Уровни звука">${rows.map((row) => {
    const meterId = row.id === "floor" ? "program" : `language:${row.id}`;
    return `<div class="translation-meter-row" data-translation-signal="${escapeHtml(meterId)}" data-signal-state="unknown"><div class="translation-meter-heading"><div><small>${row.kind}</small><strong>${escapeHtml(row.name)}</strong></div><span class="translation-signal-state" data-translation-status>Нет данных</span></div><div class="translation-meter-measure"><meter min="-60" max="0" value="-60" data-translation-peak aria-label="Пиковый уровень: ${escapeHtml(row.name)}"></meter><output data-translation-db>−∞ dBFS</output></div></div>`;
  }).join("")}</div>`;
}

function unreadChatCount() {
  return [...state.chatUnread.values()].reduce((total, count) => total + count, 0);
}

function updateChatNotice() {
  const count = unreadChatCount();
  const badge = $("#chatNoticeBadge");
  if (!badge) return;
  badge.hidden = count === 0;
  badge.textContent = count > 99 ? "99+" : String(count);
  $("#chatNoticeBtn")?.classList.toggle("has-unread", count > 0);
}

function markChatRead(sessionId) {
  if (sessionId) state.chatUnread.delete(sessionId);
  updateChatNotice();
}

function pageHead(title, subtitle, action = "", className = "") {
  return `<header class="page-head ${escapeHtml(className)}"><div><p>${escapeHtml(subtitle)}</p></div>${action}</header>`;
}

const VOTE_OUTCOME_LABELS = {
  accepted: "Решение принято", rejected: "Решение не принято",
  "no-quorum": "Голосование не состоялось: кворум не достигнут",
  tie: "Голоса распределились поровну", determined: "Результат определён", vetoed: "Решение заблокировано правом вето"
};

function advancedBallot(vote) {
  if (vote.ballotType === "single") return "";
  const name = `ballot-${vote.id}`;
  const fields = vote.options.map((option, index) => {
    if (vote.ballotType === "cumulative") return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="number" min="0" max="${vote.ballotConfig?.points ?? 10}" value="0" data-ballot-allocation="${escapeHtml(option.id)}" aria-label="Баллы: ${escapeHtml(option.label)}"></label>`;
    if (vote.ballotType === "ranked") return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="number" min="0" max="${vote.options.length}" value="${index + 1}" data-ballot-rank="${escapeHtml(option.id)}" aria-label="Место в рейтинге: ${escapeHtml(option.label)}"></label>`;
    const attribute = vote.ballotType === "veto" ? "data-ballot-veto" : "data-ballot-approval";
    return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="checkbox" ${attribute}="${escapeHtml(option.id)}"></label>`;
  }).join("");
  return `<div class="advanced-ballot" data-ballot-vote="${escapeHtml(vote.id)}" role="group" aria-label="Бюллетень"><p class="advanced-ballot-hint">${vote.ballotType === "ranked" ? "Укажите порядок предпочтения" : vote.ballotType === "cumulative" ? "Распределите баллы между вариантами" : "Отметьте подходящие варианты"}</p>${fields}<button class="button button-primary" data-action="cast-advanced-vote" data-vote-id="${escapeHtml(vote.id)}">Отправить бюллетень</button></div>`;
}

const VOTE_MODE_LABELS = { named: "Открытое", anonymous: "Тайное", secret: "Тайное" };
const VOTE_STATUS_LABELS = { draft: "Подготовка", open: "Идёт голосование", closed: "Завершено" };
const VOTE_RULE_LABELS = { "standard-majority": "Обычное большинство" };
function voteTimer(vote, remaining) {
  return remaining === null ? "" : `<strong class="vote-timer" role="timer" data-vote-countdown="${escapeHtml(vote.closesAt)}" aria-label="Осталось времени"><small>ОСТАЛОСЬ</small><span>${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}</span></strong>`;
}
function updateVoteCountdowns() {
  document.querySelectorAll("[data-vote-countdown]").forEach((timer) => {
    const seconds = Math.max(0, Math.ceil((Date.parse(timer.dataset.voteCountdown) - Date.now()) / 1000));
    const label = timer.querySelector("span");
    if (label) label.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  });
}

function voteOutcomeLabel(vote) {
  const outcome = vote?.outcome ?? vote?.finalResult?.outcome;
  return VOTE_OUTCOME_LABELS[outcome] ?? (vote?.status === "closed" ? "Голосование завершено" : "Идёт голосование");
}

function conferenceVoteCard(vote, heading) {
  if (!vote) return "";
  const selectedOptionId = state.voteSelections.get(vote.id) ?? vote.namedBallots?.find((ballot) => ballot.participantId === state.participantId)?.optionId;
  const pendingOptionId = state.voteCastPending?.get(vote.id);
  const remaining = vote.status === "open" && vote.closesAt ? Math.max(0, Math.ceil((Date.parse(vote.closesAt) - Date.now()) / 1000)) : null;
  const options = vote.options.map((option) => {
    const voters = vote.mode === "named" ? (vote.namedBallots ?? []).filter((ballot) => ballot.optionId === option.id).map((ballot) => ballot.displayName).join(", ") : "";
    const canChoose = vote.ballotType === "single" && vote.status === "open" && isEligibleForVote(vote) && !selectedOptionId && !vote.hasVoted;
    const selected = selectedOptionId === option.id;
    const semantic = { "за": "vote-for", "против": "vote-against", "воздержался": "vote-abstain" }[String(option.label).trim().toLocaleLowerCase("ru-RU")] ?? "vote-other";
    return `<div class="option-row ${semantic} ${selected ? "selected" : ""}"><span>${escapeHtml(option.label)}${selected ? '<small class="selected-vote-label">✓ Ваш выбор принят</small>' : ""}${voters ? `<small class="voter-names">${escapeHtml(voters)}</small>` : ""}</span><strong>${vote.results?.[option.id] ?? 0}</strong>${canChoose && (!pendingOptionId || pendingOptionId === option.id) ? `<button class="button vote-choice ${semantic}" aria-pressed="${selected}" data-action="cast-vote" data-vote-id="${vote.id}" data-option-id="${option.id}" ${pendingOptionId ? "disabled" : ""}>${pendingOptionId ? "Отправляем…" : "Выбрать"}</button>` : ""}</div>`;
  }).join("");
  const summary = vote.electorateSummary ?? {};
  const ballot = vote.status === "open" && isEligibleForVote(vote) && !vote.hasVoted ? advancedBallot(vote) : "";
  return `<article class="vote-detail ${vote.status === "open" ? "active-vote" : "vote-result"}"><div class="vote-card-top"><h4 class="panel-title">${heading}</h4>${voteTimer(vote, remaining)}</div><h3 class="vote-question">${escapeHtml(vote.topic ?? vote.question)}</h3><p>${escapeHtml(vote.question)}</p>${vote.status === "closed" ? `<p class="vote-outcome"><strong>Результат:</strong> ${escapeHtml(voteOutcomeLabel(vote))}</p>` : ""}<p>Приглашены: ${summary.invitedEligible ?? "—"} · Подключены: ${summary.connectedNow ?? summary.connectedAtOpen ?? "—"} · Проголосовали: ${summary.ballotsCast ?? vote.ballotsCast ?? 0} · Не проголосовали: ${summary.notVoted ?? "—"}</p>${vote.hasVoted ? '<p class="selected-vote-label">Ваш голос принят</p>' : ""}${ballot || options}</article>`;
}

// Compact action buttons: icon + label; the label hides in narrow blocks (container queries in refresh.css),
// the tooltip and accessible name always carry the full action.
const BUTTON_ICONS = {
  collapse: '<path d="M5 15l7-7 7 7"/>',
  expand: '<path d="M5 9l7 7 7-7"/>',
  ballot: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12.5 2.6 2.6L16 9.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  micOff: '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M3 3l18 18"/>'
};
function iconLabel(icon, label) {
  return `<svg class="btn-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BUTTON_ICONS[icon]}</svg><span class="btn-label">${label}</span>`;
}

function conferenceVoteStatusCard(openVote, closedVote) {
  const vote = openVote ?? closedVote;
  if (!vote) return "";
  const status = openVote ? "Идёт голосование" : voteOutcomeLabel(vote);
  return `<article class="panel panel-pad conference-vote-status ${openVote ? "is-open" : "is-closed"}"><div><span class="vote-status-label">${escapeHtml(status)}</span><h3 class="vote-status-question">${escapeHtml(vote.topic ?? vote.question)}</h3></div><div class="action-strip compact"><button class="button button-secondary icon-label-button" data-action="open-voting-page" title="${openVote ? "Голосовать" : "Все голосования"}" aria-label="${openVote ? "Голосовать" : "Все голосования"}">${iconLabel(openVote ? "ballot" : "list", openVote ? "Голосовать" : "Все голосования")}</button><button class="button button-quiet icon-label-button" data-action="open-vote-results" data-vote-id="${escapeHtml(vote.id)}" title="Результаты" aria-label="Результаты голосования">${iconLabel("chart", "Результаты")}</button></div></article>`;
}

function closeVoteResultsModal() {
  document.querySelector(".vote-results-backdrop")?.remove();
}

function openVoteResultsModal(voteId) {
  const vote = state.votes.find((item) => item.id === voteId);
  if (!vote) return;
  closeVoteResultsModal();
  const backdrop = document.createElement("div");
  backdrop.className = "form-dialog-backdrop vote-results-backdrop";
  backdrop.innerHTML = `<section class="form-dialog vote-results-dialog"><header class="vote-results-head"><div><span class="vote-status-label">${escapeHtml(voteOutcomeLabel(vote))}</span><h2>${escapeHtml(vote.topic ?? vote.question)}</h2></div><button class="dialog-icon-close" type="button" data-dialog-close data-close-vote-results aria-label="Закрыть">×</button></header><div class="vote-results-scroll">${conferenceVoteCard(vote, "Результаты голосования")}</div></section>`;
  document.body.append(backdrop);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop || event.target.closest("[data-close-vote-results]")) closeVoteResultsModal(); });
}

function microphoneIcon(kind) {
  const mic = `<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/>`;
  const extra = kind === "off" ? `<path d="M3 3l18 18"/>` : kind === "hard" ? `<path d="M2 4l5 5M7 4L2 9"/>` : kind === "soft" ? `<path d="M19 8c2 2 2 6 0 8"/>` : "";
  return `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${mic}${extra}</svg>`;
}

function recordingToggleHtml(meetingPaused) {
  if (!can("conference.recording")) return "";
  const recording = Boolean(state.recordingStatus?.enabled);
  return `<button type="button" class="button secretary-record-toggle ${recording ? "is-recording" : "is-off"}" data-action="secretary-toggle-recording" ${meetingPaused ? "disabled" : ""} aria-pressed="${recording}">${meetingPaused ? "Запись на паузе" : recording ? "● Запись идёт" : "● Включить запись"}</button>`;
}

function presentationDockHtml() {
  const active = state.presentations.find((item) => item.status === "active");
  if (!active || (!canViewFiles() && !canManageContent())) return "";
  return `<span id="activePresentationBadge" class="document-viewer-badge-group"><button type="button" class="button button-secondary document-viewer-badge" data-action="open-presentation-document" data-document-id="${escapeHtml(active.documentId)}" data-presentation-id="${escapeHtml(active.id)}" title="Открыть показ" aria-label="Открыть показ: ${escapeHtml(active.title || "Документ")}"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h4M9 13h6m-6 4h6"/></svg><span><small>В показе</small><strong>${escapeHtml(active.title || "Документ")}</strong></span></button>${canManageContent() ? `<button type="button" class="button button-secondary document-viewer-stop" data-action="stop-presentation" data-presentation-id="${escapeHtml(active.id)}" title="Убрать из показа" aria-label="Убрать из показа: ${escapeHtml(active.title || "Документ")}"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/></svg></button>` : ""}</span>`;
}

function renderMicrophoneDock() {
  const dock = $("#microphoneDock");
  const participant = state.meeting?.participants?.[state.participantId];
  if (!participant || participant.permissions?.canSpeak === false || ["observer", "auditor", "interpreter", "translator", "service", "signage"].includes(participant.role)) {
    const extra = `${participant && can("conference.recording") ? recordingToggleHtml(Boolean(state.meeting?.pausedAt)) : ""}${presentationDockHtml()}`;
    dock.hidden = !extra;
    dock.innerHTML = extra;
    return;
  }
  dock.hidden = false;
  const meetingPaused = Boolean(state.meeting.pausedAt);
  const speaking = state.meeting.activeSpeakerIds.includes(state.participantId);
  const queued = state.meeting.floorQueue.includes(state.participantId);
  if (participant.externalDesk) {
    const physical = participant.externalDesk.status;
    const label = { on: "Физический пульт включён", requested: "Запрос слова отправлен",
      off: "Физический пульт выключен", unknown: "Связь с пультом потеряна" }[physical] ?? "Состояние пульта неизвестно";
    const capture = Boolean(state.publishedStream?.capabilities?.audio) &&
      state.localMedia?.getAudioTracks().some((track) => track.readyState === "live" && track.enabled);
    const color = physical === "on" ? "mic-green mic-live" : physical === "requested" ? "mic-yellow mic-queued" : "mic-red mic-idle";
    dock.innerHTML = `<div class="mic-button ${color}" role="status" aria-live="polite">${microphoneIcon(physical === "on" ? "on" : "off")}<span><b>${label}</b><small>${capture ? "Микрофон планшета готов к записи" : "Микрофон планшета недоступен — персональная запись невозможна"}</small></span></div>`;
    dock.insertAdjacentHTML("beforeend", recordingToggleHtml(meetingPaused));
    dock.insertAdjacentHTML("beforeend", presentationDockHtml());
    return;
  }
  if (participant.role === "chair") {
    const nextId = state.meeting.audioSettings?.discussionMode === "managed"
      ? state.meeting.floorQueue.find((id) => state.meeting.participants?.[id]?.state === "joined") : null;
    const next = nextId ? state.meeting.participants[nextId] : null;
    const nextIcon = `<span class="chair-next-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg><svg class="chair-next-attention" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></span>`;
    dock.innerHTML = `<button type="button" class="mic-button chair-mic-button mic-neutral" data-mic-action="chair-priority" ${meetingPaused ? "disabled" : ""} aria-label="Приоритет: выключить микрофоны остальных участников, кроме председателей, и взять слово">${microphoneIcon("on")}<span><b>Приоритет</b><small>Отключить остальных</small></span></button><button type="button" class="mic-button chair-mic-button mic-green ${speaking ? "mic-live" : "mic-idle"}" data-mic-action="chair-take-floor" ${meetingPaused ? "disabled" : ""} aria-label="${speaking ? "Выключить свой микрофон" : "Взять слово без отключения остальных"}">${microphoneIcon(speaking ? "on" : "off")}<span><b>${speaking ? "Выключить микрофон" : "Взять слово"}</b><small>${speaking ? "Вы в эфире" : "Без отключения других"}</small></span></button><button type="button" class="mic-button chair-mic-button mic-neutral chair-next ${next ? "has-queue" : ""}" data-mic-action="chair-next" ${!next || meetingPaused ? "disabled" : ""} aria-label="${next ? `Дать слово следующему: ${escapeHtml(next.displayName)}` : "Нет запросов слова в очереди"}" title="${next ? escapeHtml(next.displayName) : "Очередь пуста"}">${nextIcon}<span><b>Следующий</b><small>${next ? `В очереди: ${state.meeting.floorQueue.length}` : "Очередь пуста"}</small></span></button>${speaking ? '<span class="on-air-tag" role="status">● В эфире</span>' : ""}`;
    dock.insertAdjacentHTML("beforeend", recordingToggleHtml(meetingPaused));
    dock.insertAdjacentHTML("beforeend", presentationDockHtml());
    return;
  }
  const color = speaking ? "mic-green mic-live" : queued ? "mic-yellow mic-queued" : "mic-red mic-idle";
  const label = speaking ? "Выключить микрофон" : queued ? "Отменить запрос слова" : "Включить микрофон или запросить слово";
  const queuePlace = queued ? state.meeting.floorQueue.indexOf(state.participantId) + 1 : 0;
  const blocked = meetingPaused || (state.meeting.chairPriority?.mode === "hard" && !speaking && !queued);
  const blockedReason = meetingPaused ? "Конференция на паузе" : "Председатель использует приоритет; запрос временно недоступен";
  dock.innerHTML = `<button type="button" class="mic-button ${color}" data-mic-action="delegate" aria-label="${blocked ? blockedReason : label}" title="${blocked ? blockedReason : label}" ${blocked ? "disabled" : ""}>${microphoneIcon(speaking ? "on" : queued ? "wait" : "off")}<span><b>${meetingPaused ? "Микрофон на паузе" : speaking ? "Завершить выступление" : queued ? "Отменить запрос" : "Попросить слово"}</b><small>${meetingPaused ? "Заседание на паузе" : speaking ? "Вас слышит зал" : queued ? `Вы в очереди: №${queuePlace}` : blocked ? "Приоритет председателя" : "Нажмите, чтобы выступить"}</small></span></button>${speaking ? '<span class="on-air-tag" role="status">● В эфире</span>' : ""}`;
  dock.insertAdjacentHTML("beforeend", recordingToggleHtml(meetingPaused));
  dock.insertAdjacentHTML("beforeend", presentationDockHtml());
}

function renderFixedControls() {
  const button = $("#cameraToggleBtn");
  if (!button) return;
  const published = Boolean(hasLocalVideo() && state.publishedStream);
  button.classList.toggle("camera-on", published);
  button.classList.toggle("camera-off", !published);
  button.setAttribute("aria-pressed", String(published));
  button.setAttribute("aria-label", published ? "Выключить свою камеру" : "Включить и опубликовать свою камеру");
  button.title = published ? "Камера опубликована — выключить" : "Камера выключена — включить";
  const permissionButton = $("#mediaAccessBtn");
  if (permissionButton) {
    permissionButton.hidden = !state.mediaPermissionPending;
    permissionButton.title = "Разрешить камеру и микрофон одним действием";
  }
}

function cameraSetupNoticeHtml() {
  if (state.cameraSetupDismissed || (hasLocalVideo() && state.publishedStream)) return "";
  return `<aside class="camera-setup-notice" aria-label="Подключение камеры">
    <div><strong>Камера не подключена</strong><span>Выберите камеру и разрешите доступ для этого сайта</span></div>
    <a class="button button-secondary" href="#camera-setup" data-action="open-camera-setup">Настроить камеру</a>
    <button class="camera-setup-dismiss" type="button" data-action="dismiss-camera-setup" aria-label="Скрыть напоминание о камере" title="Скрыть">×</button>
  </aside>`;
}

function can(capability) {
  return state.capabilities.has(capability);
}

function pgmModeHtml() {
  const pgm = state.programDescriptor?.pgm;
  if (!pgm) return "";
  const chosen = pgm.override ?? pgm;
  const option = (value, label, current) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`;
  const source = pgm.source === "operator"
    ? "Действует режим оператора этой конференции."
    : pgm.override ? "Оператор не в конференции — действует режим администратора." : "Действует режим администратора.";
  const slates = (state.pgmSlates?.items ?? []).map((item) => `<div class="slate-card ${state.pgmSlates.selectedSlateId === item.id ? "selected" : ""}"><button type="button" class="slate-select" data-action="select-pgm-slate" data-slate-id="${escapeHtml(item.id)}"><span class="slate-thumb" data-slate-thumb="${escapeHtml(item.id)}"></span><b>${escapeHtml(item.fileName)}</b><small>${item.width}×${item.height}</small></button><button type="button" class="button button-danger slate-delete" data-action="delete-pgm-slate" data-slate-id="${escapeHtml(item.id)}" data-slate-name="${escapeHtml(item.fileName)}" aria-label="Удалить заставку ${escapeHtml(item.fileName)}">Удалить</button></div>`).join("");
  return `<div style="height:16px"></div><article class="panel panel-pad"><h4 class="panel-title">Режим PGM</h4>
    <p>${source} Для каждого количества выступающих действует отдельное правило.</p>
    <div class="action-strip">
      <label class="inline-number">Никто не выступает <select id="pgmIdleMode">${option("overview", "Камера зала", chosen.idleMode)}${option("grid", "Мозаика из всех потоков", chosen.idleMode)}${option("slate", "Заставка 16:9", chosen.idleMode)}${option("agenda", "Время и вопрос повестки", chosen.idleMode)}</select></label>
      <label class="inline-number">Один выступающий <select id="pgmSingleMode">${option("overview-follow", "Камера зала, наведение на выступающего", chosen.singleMode ?? "speaker")}${option("speaker", "Собственная камера выступающего", chosen.singleMode ?? "speaker")}</select></label>
      <label class="inline-number">Несколько выступающих <select id="pgmMultiMode">${option("overview", "Камера зала, общий вид", chosen.multiMode)}${option("last", "Камера зала, наведение на последний микрофон", chosen.multiMode)}${option("grid", "Мозаика из собственных камер выступающих", chosen.multiMode)}${option("loudest", "Собственная камера самого громкого", chosen.multiMode)}</select></label>
      <label class="inline-check"><input id="pgmAgendaUseSlate" type="checkbox" ${chosen.agendaUseSlate ? "checked" : ""}> Использовать выбранную заставку как фон для голосования, времени и темы</label>
      <button class="button button-secondary" data-action="save-pgm-mode">Применить</button>
      ${pgm.override ? `<button class="button button-quiet" data-action="reset-pgm-mode">Вернуть режим администратора</button>` : ""}
    </div><div class="slate-library"><div class="status-row"><div class="slate-library-copy"><b>Библиотека заставок</b><small>PNG/JPEG · 16:9 · фон заставки и часов</small></div><label class="button button-quiet slate-upload">＋ Загрузить<input id="operatorSlateUpload" type="file" accept="image/png,image/jpeg" hidden></label></div><div class="slate-grid">${slates || `<div class="empty">Заставки ещё не загружены.</div>`}</div></div></article>`;
}

async function hydrateSlatePreviews() {
  for (const node of $$('[data-slate-thumb]')) {
    const id = node.dataset.slateThumb;
    let url = state.slatePreviewUrls.get(id);
    if (!url) {
      try {
        const response = await state.api.get(`/media/pgm-slates/${encodeURIComponent(id)}/content`);
        url = URL.createObjectURL(await response.blob());
        state.slatePreviewUrls.set(id, url);
      } catch (_) { continue; }
    }
    node.style.backgroundImage = `url("${url}")`;
  }
}

async function uploadPgmSlate(file) {
  if (!file) return;
  await state.api.request("/media/pgm-placeholder", { method: "PUT", body: file,
    headers: { "Content-Type": file.type, "X-File-Name": `utf8:${encodeURIComponent(file.name)}` } });
  state.pgmSlates = await state.api.get("/media/pgm-slates");
  renderPage();
}

async function selectPgmSlate(id) {
  await state.api.request(`/media/pgm-slates/${encodeURIComponent(id)}/selected`, { method: "PUT" });
  state.pgmSlates = await state.api.get("/media/pgm-slates");
  renderPage();
}

async function deletePgmSlate(id, name) {
  if (!await confirmDialog(`Удалить заставку «${name}»?`, "Удалить", "Отмена")) return;
  await state.api.delete(`/media/pgm-slates/${encodeURIComponent(id)}`);
  const staleUrl = state.slatePreviewUrls.get(id);
  if (staleUrl) URL.revokeObjectURL(staleUrl);
  state.slatePreviewUrls.delete(id);
  state.pgmSlates = await state.api.get("/media/pgm-slates");
  renderPage();
}

async function syncSecretaryTurn() {
  if (state.profile?.role !== "secretary" || !state.meeting) return;
  const speakerIds = [...new Set(state.meeting.activeSpeakerIds ?? [])].sort();
  const signature = speakerIds.join("|");
  if (signature === (state.secretarySpeakerSignature ?? "")) return;
  await saveSecretaryTranscript();
  state.secretarySpeakerSignature = signature;
  if (!speakerIds.length) {
    state.secretarySegmentId = null;
    state.secretaryEditor = { turnId: null, speakerIds: [], segmentIds: [], startedAt: null,
      value: "", base: "", revision: 0, dirty: false, cleared: false };
    return;
  }
  const segmentIds = (state.recordingStatus?.active ?? [])
    .filter((item) => speakerIds.includes(item.participantId)).map((item) => item.segmentId);
  state.secretarySegmentId = segmentIds[0] ?? null;
  state.secretaryEditor = { turnId: crypto.randomUUID(), speakerIds, segmentIds,
    startedAt: new Date().toISOString(),
    value: "", base: "", revision: 0, dirty: false, cleared: false };
}

function secretarySpeakersHtml() {
  const active = state.recordingStatus?.active ?? [];
  const recording = Boolean(state.recordingStatus?.enabled);
  return state.meeting.activeSpeakerIds.map((id) => {
    const participant = state.meeting.participants[id];
    const current = active.find((item) => item.participantId === id);
    return `<div class="secretary-speaker"><strong>${escapeHtml(participant?.displayName ?? id)}</strong><span>${current ? "● Запись" : recording ? "Ожидание аудио" : "Микрофон открыт"}</span></div>`;
  }).join("") || `<div class="empty">Открытых микрофонов нет</div>`;
}

function secretaryWorkspaceHtml() {
  if (state.profile.role !== "secretary") return "";
  const meetingId = state.profile.meetingId;
  const multiple = state.meeting.activeSpeakerIds.length > 1;
  return `<article class="panel panel-pad secretary-workspace" data-meeting-id="${escapeHtml(meetingId)}">
    <div class="secretary-editor-head"><strong id="secretaryLiveNames">${escapeHtml(state.meeting.activeSpeakerIds.map((id) => state.meeting.participants[id]?.displayName).filter(Boolean).join(", ") || "Сейчас никто не выступает")}${multiple ? " · несколько выступающих" : ""}</strong></div>
    <textarea id="secretaryText" rows="8" placeholder="${state.secretaryMode === "transcript" ? "Введите стенограмму выступления" : "Введите заметку секретаря"}" ${state.secretaryMode === "transcript" && !state.secretaryEditor.turnId ? "disabled" : ""}>${escapeHtml(state.secretaryMode === "transcript" ? state.secretaryEditor.value : state.secretaryNoteDraft)}</textarea>
    <div class="secretary-mode"><label><input type="radio" name="secretaryMode" value="transcript" ${state.secretaryMode === "transcript" ? "checked" : ""}> Стенограмма</label><label><input type="radio" name="secretaryMode" value="note" ${state.secretaryMode === "note" ? "checked" : ""}> Заметка</label></div>
    <div class="secretary-editor-actions"><small>${state.secretaryMode === "transcript" ? "Стенограмма сохраняется каждые 5 секунд без очистки поля." : "Заметка отправляется только по кнопке."}</small><button class="button button-quiet" data-action="secretary-clear-editor">Очистить поле</button><button class="button button-primary" data-action="secretary-save-editor">${state.secretaryMode === "transcript" ? "Сохранить сейчас" : "Сохранить заметку"}</button></div>
  </article>`;
}

async function saveSecretaryTranscript() {
  const editor = state.secretaryEditor;
  if (state.profile?.role !== "secretary" || !editor?.turnId || !editor.dirty) return;
  if (state.secretarySavePending) return state.secretarySavePending;
  const submittedValue = editor.value;
  const text = editor.cleared ? [editor.base, editor.value].filter(Boolean).join("\n") : editor.value;
  if (!text.trim()) return;
  const pending = (async () => {
    const activeSegments = (state.recordingStatus?.active ?? [])
      .filter((item) => editor.speakerIds.includes(item.participantId)).map((item) => item.segmentId);
    editor.segmentIds = [...new Set([...editor.segmentIds, ...activeSegments])];
    const saved = await state.api.put(`/meetings/${encodeURIComponent(state.profile.meetingId)}/transcript/turns/${encodeURIComponent(editor.turnId)}`,
      { text, revision: editor.revision, speakerIds: editor.speakerIds,
        segmentIds: editor.segmentIds, startedAt: editor.startedAt });
    editor.revision = saved.revision;
    editor.dirty = editor.value !== submittedValue;
    if (!editor.cleared) editor.base = saved.text;
    state.protocol ??= {};
    state.protocol.transcriptBlocks ??= [];
    const index = state.protocol.transcriptBlocks.findIndex((item) => item.turnId === editor.turnId);
    if (index < 0) state.protocol.transcriptBlocks.push(saved);
    else state.protocol.transcriptBlocks[index] = saved;
  })();
  state.secretarySavePending = pending;
  try { await pending; }
  finally { if (state.secretarySavePending === pending) state.secretarySavePending = null; }
}

async function saveSecretaryEditor() {
  if (state.secretaryMode === "transcript") return saveSecretaryTranscript();
  const text = state.secretaryNoteDraft.trim();
  if (!text) throw new Error("Заметка пуста");
  const segment = state.protocol?.recordingSegments?.find((item) => item.id === state.secretarySegmentId);
  await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/notes`, {
    text, participantId: state.meeting.activeSpeakerIds[0] ?? segment?.participantId ?? null,
    agendaItemId: state.meeting.activeAgendaItemId ?? null
  });
  state.secretaryNoteDraft = "";
  renderPage();
}

async function clearSecretaryEditor() {
  if (state.secretaryMode === "transcript") {
    await saveSecretaryTranscript();
    const editor = state.secretaryEditor;
    editor.base = editor.cleared ? [editor.base, editor.value].filter(Boolean).join("\n") : editor.value;
    editor.value = "";
    editor.cleared = true;
    editor.dirty = false;
  } else state.secretaryNoteDraft = "";
  const field = $("#secretaryText");
  if (field) { field.value = ""; field.focus(); }
}

// Conference workspace = the secretary's block constructor for every role. Participant roles get the layout
// the administrator configured for their role (read-only); technical roles keep a personal layout.
const WORKSPACE_BASE_PANELS = ["program", "speakers", "queue", "materials", "vote"];
const WORKSPACE_PANEL_SIZES = { program: { width: 7, height: 400 }, speakers: { width: 5, height: 140 },
  queue: { width: 5, height: 250 }, materials: { width: 5, height: 190 }, vote: { width: 5, height: 190 },
  metrics: { width: 7, height: 100 },
  service: { width: 4, height: 170 }, translation: { width: 4, height: 190 } };
const WORKSPACE_PANEL_LABELS = { program: "Трансляция зала", speakers: "Сейчас выступают", queue: "Очередь запросов",
  materials: "Материалы к пункту", vote: "Голосование", metrics: "Показатели",
  service: "Сервис", translation: "Перевод" };
const WORKSPACE_PERSONAL_ROLES = ["operator", "av_operator", "technician", "admin"];
// Blocks pack on 2 px rows with a 6 px gap between them.
const WORKSPACE_ROW = 2;
const WORKSPACE_GAP = 6;

// Every block this role may place (same rule as the server), and those that can be added right now.
function workspaceAllowedPanels(role = state.profile?.role) {
  if (["interpreter", "translator"].includes(role)) return ["program", "translation", "speakers"];
  return [...workspacePanelIds(role), ...(["observer", "auditor"].includes(role) ? [] : ["service"]), "translation"];
}
function workspaceAddablePanels(layout) {
  return workspaceAllowedPanels().filter((id) => !layout.order.includes(id) &&
    (id !== "translation" || ["interpreter", "translator"].includes(state.profile?.role) ||
      (state.translateStatus?.licensed && hasConferenceInterpreter())));
}

// The Program tile follows its real width and keeps an exact 16:9 picture.
function fitProgramTiles() {
  for (const wrap of document.querySelectorAll('.workspace-grid > [data-layout-panel="program"]')) {
    const panel = wrap.querySelector(".conference-program-panel");
    if (!panel) continue;
    const head = panel.querySelector(".program-panel-head")?.offsetHeight ?? 0;
    const height = Math.ceil(head + panel.clientWidth * 9 / 16 + panel.offsetHeight - panel.clientHeight);
    if (wrap.style.getPropertyValue("--layout-height") === `${height}px`) continue;
    wrap.style.setProperty("--layout-height", `${height}px`);
    wrap.style.gridRow = `span ${Math.ceil((height + WORKSPACE_GAP) / WORKSPACE_ROW)}`;
  }
}
let programTileWatch = false;
function watchProgramTiles() {
  requestAnimationFrame(fitProgramTiles);
  if (programTileWatch) return;
  programTileWatch = true;
  window.addEventListener("resize", () => requestAnimationFrame(fitProgramTiles));
}

function workspacePanelIds(role = state.profile?.role) {
  if (["interpreter", "translator"].includes(role)) return ["program", "translation", "speakers"];
  if (role === "chair") return ["program", "speakers", "queue", "materials", "vote"];
  if (WORKSPACE_PERSONAL_ROLES.includes(role)) return [...WORKSPACE_BASE_PANELS, "metrics"];
  return [...WORKSPACE_BASE_PANELS];
}

function workspaceLayoutDefault(role = state.profile?.role) {
  if (role === "secretary") return SECRETARY_LAYOUT_DEFAULT;
  const order = workspacePanelIds(role);
  const interpreter = ["interpreter", "translator"].includes(role);
  return { order, panels: Object.fromEntries(order.map((id) => [id, interpreter
    ? { width: id === "translation" ? 5 : 7, height: id === "speakers" ? 140 : 400 }
    : { ...WORKSPACE_PANEL_SIZES[id] }])) };
}

function usesParticipantWorkspace() {
  return state.profile?.role !== "secretary" && window.innerWidth > 760;
}

function canEditWorkspaceLayout() {
  return state.profile?.role === "secretary" || usesParticipantWorkspace();
}

// The administrator's layout for this role (or the built-in default); a personal layout overrides it.
function roleWorkspaceLayout() {
  return structuredClone(state.workspaceRoleLayout ?? workspaceLayoutDefault());
}

// Height of a Program tile spanning `span` of 12 columns: exact 16:9 picture.
function programTileHeight(span) {
  const content = $("#pageContent");
  const style = content ? getComputedStyle(content) : null;
  const width = (content?.clientWidth ?? window.innerWidth) - (style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 40);
  const column = (width - 11 * WORKSPACE_GAP) / 12;
  return Math.round((span * column + (span - 1) * WORKSPACE_GAP) * 9 / 16);
}

// Width/height locks: the administrator's role locks bind participants; anyone may add their own.
const LOCK_ICONS = {
  width: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
  height: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'
};
function roleLock(id, axis) {
  return state.profile?.role !== "secretary" && Boolean(state.workspaceRoleLayout?.panels?.[id]?.[axis === "width" ? "lockWidth" : "lockHeight"]);
}
function panelLocked(size, id, axis) {
  return roleLock(id, axis) || Boolean(size?.[axis === "width" ? "lockWidth" : "lockHeight"]);
}
function lockButton(id, axis, size) {
  const locked = panelLocked(size, id, axis);
  const fixedByRole = roleLock(id, axis);
  const label = `${locked ? "Освободить" : "Зафиксировать"} ${axis === "width" ? "ширину" : "высоту"}`;
  return `<button type="button" class="secretary-lock-button${locked ? " is-locked" : ""}" data-action="layout-lock" data-axis="${axis}" data-panel-id="${id}"
    aria-pressed="${locked}" title="${fixedByRole ? "Зафиксировано администратором" : label}" aria-label="${fixedByRole ? "Зафиксировано администратором" : label}" ${fixedByRole ? "disabled" : ""}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LOCK_ICONS[axis]}</svg>${locked ? '<svg class="lock-badge" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>' : ""}</button>`;
}

// Client-only workspace actions (kept out of the participant bootstrap); true when handled.
function handleWorkspaceUiAction(action, target) {
  if (action === "layout-add" || action === "layout-remove") {
    const draft = state.secretaryLayoutDraft;
    const id = target.dataset.panelId;
    if (!draft || !workspaceAllowedPanels().includes(id)) return true;
    if (action === "layout-add" && !draft.order.includes(id)) {
      draft.order.push(id);
      draft.panels[id] ??= { ...(WORKSPACE_PANEL_SIZES[id] ?? workspaceLayoutDefault().panels[id]) };
    } else if (action === "layout-remove" && draft.order.length > 1 && !(id === "translation" && ["interpreter", "translator"].includes(state.profile.role))) {
      draft.order.splice(draft.order.indexOf(id), 1);
      delete draft.panels[id];
    }
    renderPage();
    return true;
  }
  if (action === "layout-lock") {
    const panel = state.secretaryLayoutDraft?.panels?.[target.dataset.panelId];
    if (panel && !target.disabled) {
      const key = target.dataset.axis === "width" ? "lockWidth" : "lockHeight";
      if (panel[key]) delete panel[key]; else panel[key] = true;
      renderPage();
    }
    return true;
  }
  return false;
}

function applyWorkspaceLayout(saved, role) {
  if (!saved) return;
  state.workspaceRoleLayout = saved.roleLayout ?? null;
  state.workspacePersonal = Boolean(saved.personal);
  state.secretaryLayout = structuredClone(saved.personal ?? saved.roleLayout ?? workspaceLayoutDefault(role));
  state.secretaryLayoutDraft = null;
  state.workspaceLayoutRole = role;
  state.workspaceLayoutDevice = saved.device ?? "pc";
}

function secretaryLayoutPanel(id, content) {
  const layout = state.secretaryLayoutDraft ?? state.secretaryLayout;
  const own = layout.panels[id] ?? workspaceLayoutDefault().panels[id] ?? WORKSPACE_PANEL_SIZES[id];
  // Sizes the administrator fixed for the role always win over a participant's own copy.
  const roleSize = state.workspaceRoleLayout?.panels?.[id];
  const size = { ...WORKSPACE_PANEL_SIZES[id], ...own,
    ...(roleLock(id, "width") ? { width: roleSize.width } : {}),
    ...(roleLock(id, "height") ? { height: roleSize.height } : {}) };
  const order = layout.order.indexOf(id);
  const editing = Boolean(state.secretaryLayoutDraft);
  // Workspace grids pack blocks on 2 px rows; the Program tile height follows its width (16:9).
  const masonry = state.profile.role !== "secretary";
  const height = masonry && id === "program" ? programTileHeight(size.width) : size.height;
  const rows = masonry ? `;grid-row:span ${Math.ceil((height + WORKSPACE_GAP) / WORKSPACE_ROW)}` : "";
  return `<div class="secretary-layout-panel${editing ? " is-editing" : ""}" data-layout-panel="${id}" style="--layout-span:${size.width};--layout-height:${height}px;order:${order}${rows}">
      ${editing ? `<div class="secretary-panel-tools"><button type="button" class="secretary-drag-handle" data-layout-drag="${id}" aria-label="Переместить блок" title="Перетащите блок">⠿ Переместить</button><button type="button" class="secretary-order-button" data-action="secretary-panel-before" data-panel-id="${id}" aria-label="Передвинуть блок раньше">←</button><button type="button" class="secretary-order-button" data-action="secretary-panel-after" data-panel-id="${id}" aria-label="Передвинуть блок позже">→</button>${lockButton(id, "width", size)}${masonry && id === "program" ? "" : lockButton(id, "height", size)}<span>${size.width}/12 · ${masonry && id === "program" ? "16:9" : `${size.height} px`}</span>${masonry && layout.order.length > 1 && !(id === "translation" && ["interpreter", "translator"].includes(state.profile.role)) ? `<button type="button" class="secretary-order-button layout-remove" data-action="layout-remove" data-panel-id="${id}" aria-label="Убрать блок «${WORKSPACE_PANEL_LABELS[id] ?? id}»" title="Убрать блок">×</button>` : ""}</div>` : ""}
    ${content}
    ${editing && !(panelLocked(size, id, "width") && (panelLocked(size, id, "height") || (masonry && id === "program"))) ? `<button type="button" class="secretary-resize-handle" data-layout-resize="${id}" aria-label="Изменить размер блока" title="Потяните, чтобы изменить размер">⤡</button>` : ""}
  </div>`;
}

function moveSecretaryLayoutPanel(id, offset) {
  const order = state.secretaryLayoutDraft?.order;
  if (!order) return;
  const from = order.indexOf(id);
  const to = Math.max(0, Math.min(order.length - 1, from + offset));
  if (from === to) return;
  order.splice(from, 1);
  order.splice(to, 0, id);
  renderPage();
}

function handleSecretaryLayoutAction(action, target) {
  if (!canEditWorkspaceLayout() || !["conference", "translation"].includes(state.activeTab) || !state.secretaryLayoutDraft) return;
  if (action === "layout-add") {
    $("#workspaceAddMenu").open = false;
    handleWorkspaceUiAction(action, target);
  } else if (action === "secretary-layout-cancel") {
    state.secretaryLayoutDraft = null;
    renderPage();
  } else if (action === "secretary-layout-reset") {
    state.secretaryLayoutDraft = state.profile?.role === "secretary" ? structuredClone(workspaceLayoutDefault()) : roleWorkspaceLayout();
    renderPage();
  } else if (action === "secretary-layout-save" && state.profile?.role !== "secretary") {
    void (async () => {
      const path = `/me/workspace-layout?meetingId=${encodeURIComponent(state.profile.meetingId)}&device=${state.workspaceLayoutDevice ?? "pc"}`;
      const draft = state.secretaryLayoutDraft;
      const sameAsRole = JSON.stringify({ order: draft.order, panels: draft.panels })
        === JSON.stringify({ order: roleWorkspaceLayout().order, panels: roleWorkspaceLayout().panels });
      if (sameAsRole) await state.api.delete(path);
      else await state.api.put(path, { layout: draft });
      state.secretaryLayout = structuredClone(draft);
      state.workspacePersonal = !sameAsRole;
      state.secretaryLayoutDraft = null;
      renderPage();
      notify(sameAsRole ? "Используется раскладка роли" : "Раскладка сохранена для вас");
    })().catch((error) => notify(error.message));
  } else if (action === "secretary-layout-save") {
    void (async () => {
      const saved = await state.api.put(`/me/secretary-layout?meetingId=${encodeURIComponent(state.profile.meetingId)}`,
        { layout: state.secretaryLayoutDraft });
      state.secretaryLayout = saved.layout;
      state.secretaryLayoutDraft = null;
      renderPage();
      notify("Раскладка сохранена для вашей учётной записи");
    })().catch((error) => notify(error.message));
  }
}

let secretaryLayoutGesture = null;
function startSecretaryLayoutGesture(event) {
  if (!state.secretaryLayoutDraft || event.button !== 0) return;
  const drag = event.target.closest("[data-layout-drag]");
  const resize = event.target.closest("[data-layout-resize]");
  const handle = drag ?? resize;
  const panel = handle?.closest("[data-layout-panel]");
  if (!handle || !panel) return;
  event.preventDefault();
  handle.setPointerCapture?.(event.pointerId);
  const id = panel.dataset.layoutPanel;
  const size = state.secretaryLayoutDraft.panels[id];
  secretaryLayoutGesture = { id, panel, pointerId: event.pointerId, mode: drag ? "drag" : "resize",
    startX: event.clientX, startY: event.clientY, width: size.width, height: size.height, target: null };
  if (drag) panel.classList.add("is-dragging");
}

function moveSecretaryLayoutGesture(event) {
  const gesture = secretaryLayoutGesture;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  if (gesture.mode === "resize") {
    const grid = gesture.panel.closest(".secretary-layout-grid");
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const column = (grid.getBoundingClientRect().width - 11 * gap) / 12 + gap;
    const current = state.secretaryLayoutDraft.panels[gesture.id];
    const width = panelLocked(current, gesture.id, "width") ? gesture.width : Math.max(3, Math.min(12, gesture.width + Math.round(dx / column)));
    const verticalStep = state.profile?.role === "secretary" ? 8 : 10;
    const height = panelLocked(current, gesture.id, "height") ? gesture.height
      : Math.max(state.profile?.role === "secretary" ? 160 : 80,
        Math.min(900, gesture.height + Math.round(dy / verticalStep) * verticalStep));
    gesture.panel.style.setProperty("--layout-span", width);
    gesture.panel.style.setProperty("--layout-height", `${height}px`);
    gesture.nextSize = { width, height };
  } else {
    gesture.panel.style.transform = `translate(${dx}px, ${dy}px)`;
    gesture.panel.style.pointerEvents = "none";
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-layout-panel]");
    gesture.panel.style.pointerEvents = "";
    if (gesture.target && gesture.target !== target) gesture.target.classList.remove("is-drop-target");
    gesture.target = target && target !== gesture.panel ? target : null;
    gesture.target?.classList.add("is-drop-target");
  }
}

function finishSecretaryLayoutGesture(event) {
  const gesture = secretaryLayoutGesture;
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  secretaryLayoutGesture = null;
  if (gesture.mode === "resize" && gesture.nextSize) {
    state.secretaryLayoutDraft.panels[gesture.id] = { ...state.secretaryLayoutDraft.panels[gesture.id], ...gesture.nextSize };
  } else if (gesture.mode === "drag" && gesture.target) {
    const order = state.secretaryLayoutDraft.order;
    order.splice(order.indexOf(gesture.id), 1);
    order.splice(order.indexOf(gesture.target.dataset.layoutPanel), 0, gesture.id);
  }
  renderPage();
}

function conferenceHtml() {
  const canManageFloor = can("floor.manage");
  const canViewMetrics = ["admin", "technician"].includes(state.profile.role);
  const microphoneLimit = state.meeting.audioSettings?.maxOpenMicrophones ?? state.systemStatus?.capacity?.openMicrophonesPerMeeting ?? 6;
  const initials = (name) => String(name ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const queue = state.meeting.floorQueue.map((id, index) => {
        const participant = state.meeting.participants[id];
        if (!participant) return "";
        return `<div class="status-row floor-person"><span class="person-avatar">${escapeHtml(initials(participant.displayName))}</span><div class="floor-person-copy"><strong><span class="queue-index">${index + 1}</span><span class="floor-name" title="${escapeHtml(participant.displayName)}">${escapeHtml(participant.displayName)}</span></strong><small>${escapeHtml(CONFERENCE_ROLE_LABELS[participant.role] ?? participant.role)}</small></div>${canManageFloor ? `<div class="action-strip floor-decisions"><button class="button floor-grant" title="Дать слово" aria-label="Дать слово" data-action="grant-floor" data-participant-id="${escapeHtml(id)}">✓</button><button class="button floor-reject" title="Отклонить запрос" aria-label="Отклонить запрос" data-action="release-floor" data-participant-id="${escapeHtml(id)}">×</button></div>` : ""}</div>`;
      }).join("") || `<div class="empty">Очередь запросов пуста.</div>`;
  const activeSpeakers = state.meeting.activeSpeakerIds.map((id) => {
        const participant = state.meeting.participants[id];
        if (!participant) return "";
        return `<div class="status-row floor-person is-speaking"><span class="person-avatar">${escapeHtml(initials(participant.displayName))}</span><div><strong>${escapeHtml(participant.displayName)}</strong><br><small>Микрофон открыт</small></div>${canManageFloor ? `<button class="button button-danger icon-label-button" data-action="release-floor" data-participant-id="${escapeHtml(id)}" title="Отключить микрофон" aria-label="Отключить микрофон: ${escapeHtml(participant.displayName)}">${iconLabel("micOff", "Отключить")}</button>` : ""}</div>`;
      }).join("") || `<div class="empty">Текущих выступающих нет.</div>`;
  const scheduledPresenters = (state.meeting.preparedParticipants ?? []).filter((item) => !item.excludedAt &&
    (item.reports || item.role === "presenter"))
    .sort((a, b) => Number(a.reportOrder ?? 999) - Number(b.reportOrder ?? 999));
  const presenterSession = (item) => {
    if (item.reportSeatMode === "own") {
      const session = item.ownReportSession;
      return session?.status === "pending" && Date.parse(session.expiresAt) <= Date.now() ? null : session;
    }
    const session = state.sharedSeats.find((seat) => seat.id === item.presenterSeatId)?.session;
    return session?.meetingId === state.meeting.id ? session : null;
  };
  const currentPresenter = scheduledPresenters.find((item) => item.status !== "completed" && presenterSession(item)?.assignedUserId === item.id && ["pending", "active", "finishing"].includes(presenterSession(item).status))
    ?? scheduledPresenters.find((item) => item.status !== "completed");
  const currentSession = currentPresenter ? presenterSession(currentPresenter) : null;
  const currentSeat = currentPresenter?.reportSeatMode === "own" ? { online: true, name: "С собственного места" } :
    currentPresenter ? state.sharedSeats.find((seat) => seat.id === currentPresenter.presenterSeatId) : null;
  const presenterAction = currentPresenter ? !currentSeat ? ["presenter-workplace", "Назначить место", false] :
    currentSession?.status === "pending" ? ["presenter-confirm", "Подключить", false] :
    currentSession?.status === "finishing" ? ["", "Завершение…", true] :
    currentSession?.status === "active" ? ["presenter-finish", "Завершить", false] :
      currentSeat.online ? ["presenter-call", "Вызвать", false] :
        ["presenter-workplace", "Выбрать место", false] : null;
  const showPresenterSchedule = !state.meeting.quick && ["secretary", "operator", "admin"].includes(state.profile.role);
  const presenterButton = showPresenterSchedule && presenterAction
    ? `<button class="button button-secondary" data-action="${presenterAction[0]}" data-presenter-id="${escapeHtml(currentPresenter.id)}" title="${escapeHtml(presenterAction[2] && !currentSeat?.online ? "Устройство рабочего места не подключено" : presenterAction[1])}" ${presenterAction[2] ? "disabled" : ""}>${presenterAction[1]}</button>` : "";
  const presenterQueue = scheduledPresenters.map((item) => {
    const seat = item.reportSeatMode === "own" ? { online: true, name: "С собственного места" } :
      state.sharedSeats.find((entry) => entry.id === item.presenterSeatId);
    const session = presenterSession(item);
    const status = item.status === "completed" ? "Завершён" : session?.assignedUserId === item.id && session.status === "active" ? "Докладывает" :
      session?.assignedUserId === item.id && session.status === "pending" ? "Вызван" : !seat ? "Требуется место" :
      !seat.online ? "Устройство не в сети" : "По регламенту";
    const busy = scheduledPresenters.some((candidate) => {
      const live = presenterSession(candidate);
      return live?.assignedUserId === candidate.id && ["pending", "active", "finishing"].includes(live.status);
    });
    const priorityCall = !busy && seat && (!session || !["pending", "active", "finishing"].includes(session.status))
      ? `<button class="button button-quiet" data-action="presenter-call" data-presenter-id="${escapeHtml(item.id)}" ${seat.online ? "" : 'disabled title="Устройство места докладчика не в сети"'}>${item.status === "completed" ? "Повторить" : "Вызвать вне очереди"}</button>` : "";
    const reorder = can("conference.roster") && item.status !== "completed" ? `<span class="presenter-reorder"><button class="button button-quiet" data-action="report-up" data-presenter-id="${escapeHtml(item.id)}" title="Раньше">↑</button><button class="button button-quiet" data-action="report-down" data-presenter-id="${escapeHtml(item.id)}" title="Позже">↓</button></span>` : "";
    return `<div class="status-row presenter-row ${currentPresenter?.id === item.id ? "is-current" : ""}"><span class="presenter-order">${escapeHtml(String(item.reportOrder ?? "—"))}</span><div><strong>${escapeHtml(item.displayName)}</strong><small>${escapeHtml(seat?.name ?? "Место не задано")}${item.temporaryPresenterSeat ? " · временное место" : ""} · ${status}</small></div><div class="presenter-row-actions">${reorder}${priorityCall}</div></div>`;
  }).join("") || `<div class="empty">Докладчики не назначены.</div>`;
  const rosterButton = can("conference.roster") ? `<button class="button button-quiet" data-action="edit-live-roster">Состав</button>` : "";
  const presenterSchedule = showPresenterSchedule ? `<section class="presenter-schedule"><div class="section-title-row presenter-schedule-head"><h5>Порядок докладов</h5><span class="count-badge">${scheduledPresenters.length}</span><div class="presenter-schedule-actions">${rosterButton}${presenterButton}</div></div>${presenterQueue}</section>` : "";
  const canManageAgenda = can("conference.agenda") && TECHNICAL_CONFERENCE_ROLES.has(state.profile.role);
  const agenda = state.meeting.agenda ?? [];
  const activeAgenda = agenda.find((item) => item.id === state.meeting.activeAgendaItemId);
  const agendaAction = `<button class="button ${canManageAgenda ? "button-secondary" : "button-quiet"}" data-action="${canManageAgenda ? "edit-agenda" : "view-agenda"}">${canManageAgenda ? "Изменить повестку" : "Посмотреть"}</button>`;
  const closeAction = ["operator", "admin", "secretary"].includes(state.profile.role) && can("conference.lifecycle") && state.meeting.status === "active"
    ? `<button class="button button-quiet" data-action="close-conference">Завершить конференцию</button>` : "";
  const pauseAction = ["chair", "secretary", "admin"].includes(state.profile.role) && can("conference.pause") && state.meeting.status === "active"
    ? `<button class="button button-secondary" data-action="${state.meeting.pausedAt ? "resume-conference" : "pause-conference"}">${state.meeting.pausedAt ? "Продолжить" : "Пауза"}</button>` : "";
  const activeAgendaIndex = activeAgenda ? agenda.findIndex((item) => item.id === activeAgenda.id) + 1 : 0;
  const openVote = state.votes.find((vote) => vote.status === "open");
  const closedVote = [...state.votes].reverse().find((vote) => vote.status === "closed");
  const agendaDocuments = state.documents.filter((document) => document.agendaItemId &&
    document.agendaItemId === state.meeting.activeAgendaItemId);
  const fileKind = (name) => (String(name).match(/\.([a-z0-9]{2,4})$/i)?.[1] ?? "DOC").toUpperCase();
  const materialOffer = agendaDocuments.length ? `<article class="panel panel-pad material-offer"><div class="section-title-row"><h4 class="panel-title">Материалы к пункту</h4><span class="count-badge">${agendaDocuments.length}</span></div><div class="material-list">${agendaDocuments.map((document) => `<button class="material-row" data-action="download-document" data-document-id="${document.id}" title="${escapeHtml(document.fileName)}"><span class="material-kind">${escapeHtml(fileKind(document.fileName))}</span><span class="material-name">${escapeHtml(document.fileName.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/_/g, " "))}</span><span class="material-open">${iconLabel("open", "Открыть")}</span></button>`).join("")}</div></article>` : "";
  // A ballot the participant can cast right now becomes the focus of the screen instead of a link to another tab.
  const focusVote = openVote && state.profile.role !== "secretary" && canCastVotes() && isEligibleForVote(openVote)
    && !openVote.hasVoted && openVote.ballotType === "single" && !state.voteSelections.get(openVote.id);
  const voteFocus = focusVote ? `<section class="panel panel-pad conference-focus focus-vote" aria-label="Голосование">${conferenceVoteCard(openVote, "Идёт голосование — ваш голос")}</section>` : "";
  const voteStatus = focusVote ? "" : conferenceVoteStatusCard(openVote, closedVote);
  const activePresentation = state.presentations.find((item) => item.status === "active");
  const presentationOffer = activePresentation ? `<article class="panel panel-pad material-offer active-material-offer"><h4 class="panel-title">Материал отправлен в показ</h4><p class="active-material-name" title="${escapeHtml(activePresentation.title)}">${escapeHtml(activePresentation.title)}</p><div class="action-strip"><button class="button button-secondary" data-action="open-presentation-document" data-document-id="${activePresentation.documentId}" data-presentation-id="${activePresentation.id}">Открыть показ</button>${canManageContent() ? `<button class="button button-danger" data-action="stop-presentation" data-presentation-id="${activePresentation.id}">Убрать из показа</button>` : ""}</div></article>` : "";
  const programPanel = `<article class="panel conference-program-panel"><div id="programStage" class="preview-stage program-stage-large"><div class="preview-empty">В Program пока не назначен источник.</div></div></article>`;
  const channelsPanel = `<article class="panel panel-pad secretary-open-channels"><h4 class="panel-title">Открытые каналы</h4><div class="secretary-speakers">${secretarySpeakersHtml()}</div></article>`;
  const queuePanel = `<article class="panel panel-pad conference-queue-panel"><div class="section-title-row"><h4 class="panel-title">Очередь запросов</h4><span class="count-badge">${state.meeting.floorQueue.length}</span></div>${queue}</article>`;
  const speakersPanel = `<article class="panel panel-pad conference-speakers-panel"><div class="section-title-row"><h4 class="panel-title">Сейчас выступают</h4><span class="live-badge">● В эфире ${state.meeting.activeSpeakerIds.length}</span></div>${activeSpeakers}${presenterSchedule}</article>`;
  const secretaryDashboard = state.profile.role !== "secretary" ? "" : `<div class="secretary-layout-grid">${secretaryLayoutPanel("program", programPanel)}${secretaryLayoutPanel("channels", channelsPanel)}${secretaryLayoutPanel("queue", queuePanel)}${secretaryLayoutPanel("speakers", speakersPanel)}${secretaryLayoutPanel("protocol", secretaryWorkspaceHtml())}</div><div class="secretary-extra-panels">${voteStatus}${presentationOffer}${materialOffer}</div>`;
  // Live floor state on the right; reference cards (materials, show, last vote) fill the space under the picture.
  const belowCards = `${presentationOffer}${materialOffer}${voteStatus}`;
  const belowProgram = belowCards ? `<div class="conference-below">${belowCards}</div>` : "";
  let workspaceDashboard = "";
  if (usesParticipantWorkspace()) {
    const emptyCard = (title, text, cls) => `<article class="panel panel-pad ${cls}"><h4 class="panel-title">${title}</h4><div class="empty">${text}</div></article>`;
    const metrics = `<article class="panel panel-pad workspace-metrics"><div class="grid grid-3">
      <div class="metric"><span class="metric-tag">Очередь</span><strong>${state.meeting.floorQueue.length}</strong><span>ожидают слова</span></div>
      <div class="metric"><span class="metric-tag">В эфире</span><strong>${state.meeting.activeSpeakerIds.length}</strong><span>микрофонов открыто</span></div>
      <div class="metric"><span class="metric-tag">Лимит</span><strong>${microphoneLimit}</strong><span>микрофонов одновременно</span></div></div></article>`;
    const panels = { program: programPanel, speakers: speakersPanel, queue: queuePanel,
      materials: presentationOffer || materialOffer ? `<div class="workspace-stack">${presentationOffer}${materialOffer}</div>`
        : emptyCard("Материалы к пункту", "К этому пункту материалов нет.", "material-offer"),
      vote: voteFocus || voteStatus || emptyCard("Голосование", "Голосований пока не было.", "conference-vote-status"),
      metrics,
      service: serviceCardHtml("workspace-service"),
      translation: !state.translateStatus?.licensed || !hasConferenceInterpreter() ? ""
        : (state.translateMeeting?.channels ?? []).length ? translationListenHtml("workspace-translation")
          : emptyCard("Перевод", "В этой конференции перевод не ведётся.", "workspace-translation") };
    // A layout made for another role (or none yet) falls back to this role's default blocks.
    const allowed = workspaceAllowedPanels();
    const fits = (item) => Array.isArray(item?.order) && item.order.length > 0 &&
      new Set(item.order).size === item.order.length && item.order.every((id) => allowed.includes(id));
    if (!fits(state.secretaryLayout)) state.secretaryLayout = structuredClone(workspaceLayoutDefault());
    if (state.secretaryLayoutDraft && !fits(state.secretaryLayoutDraft)) state.secretaryLayoutDraft = structuredClone(state.secretaryLayout);
    const layout = state.secretaryLayoutDraft ?? state.secretaryLayout;
    workspaceDashboard = `<div class="workspace-area"><div class="secretary-layout-grid workspace-grid${state.secretaryLayoutDraft ? " is-editing" : ""}" style="grid-auto-rows:${WORKSPACE_ROW}px;column-gap:${WORKSPACE_GAP}px">${layout.order.filter((id) => panels[id]).map((id) => secretaryLayoutPanel(id, panels[id])).join("")}</div></div>`;
    watchProgramTiles();
  }
  const standardDashboard = workspaceDashboard || `<div class="conference-dashboard ${focusVote ? "has-focus" : ""}"><div class="conference-main-column">${voteFocus}${programPanel}${belowProgram}</div><div class="conference-side-stack">${speakersPanel}${queuePanel}</div></div>`;
  return `
    ${cameraSetupNoticeHtml()}
    <header class="conference-agenda-bar"><span class="agenda-number">${activeAgendaIndex || "—"}</span><div><small>${state.meeting.pausedAt ? "КОНФЕРЕНЦИЯ НА ПАУЗЕ" : activeAgenda ? "ОБСУЖДАЕТСЯ СЕЙЧАС" : "ПОВЕСТКА"}</small><strong>${escapeHtml(activeAgenda?.title ?? "Текущий вопрос не выбран")}</strong></div><div class="conference-agenda-actions">${agendaAction}${pauseAction}${closeAction}</div></header>
    ${state.profile.role === "secretary" ? secretaryDashboard : standardDashboard}
    ${canViewMetrics && !workspaceDashboard ? `<div style="height:16px"></div><div class="grid grid-3">
      <article class="panel panel-pad metric"><span class="metric-tag">QUEUE</span><strong>${state.meeting.floorQueue.length}</strong><span>участников ожидают слова</span></article>
      <article class="panel panel-pad metric"><span class="metric-tag">ACTIVE</span><strong>${state.meeting.activeSpeakerIds.length}</strong><span>активных микрофонов</span></article>
      <article class="panel panel-pad metric"><span class="metric-tag">MIC LIMIT</span><strong>${microphoneLimit}</strong><span>микрофонов одновременно</span></article>
    </div>` : ""}
    `;
}

function audioConferenceHtml() {
  if (!can("floor.audio")) return "";
  const microphoneLimit = state.meeting.audioSettings?.maxOpenMicrophones ?? state.systemStatus?.capacity?.openMicrophonesPerMeeting ?? 6;
  const queuePolicy = state.meeting.audioSettings?.queuePolicy ?? (state.meeting.audioSettings?.fifoEnabled ? "fifo" : "manual");
  const discussionControls = can("floor.discussion") ? `<label class="inline-number">Режим <select id="discussionMode"><option value="managed" ${state.meeting.audioSettings?.discussionMode !== "open" ? "selected" : ""}>Запрос</option><option value="open" ${state.meeting.audioSettings?.discussionMode === "open" ? "selected" : ""}>Свободный</option></select></label><label class="inline-number">Очередь <select id="queuePolicy"><option value="manual" ${queuePolicy === "manual" ? "selected" : ""}>Вручную</option><option value="fifo" ${queuePolicy === "fifo" ? "selected" : ""}>FIFO</option><option value="lifo" ${queuePolicy === "lifo" ? "selected" : ""}>LIFO</option></select></label><button class="button button-secondary" data-action="save-discussion-mode">Применить режим</button>` : "";
  return `<article class="panel panel-pad audio-conference-panel"><h4 class="panel-title">Аудиоконференция</h4><div class="action-strip"><label class="inline-number">Одновременно открытых микрофонов <input id="maxOpenMicrophones" type="number" min="1" max="32" value="${microphoneLimit}"></label><button class="button button-secondary" data-action="save-microphone-limit">Применить</button>${discussionControls}</div></article>`;
}

function canOperateMedia() {
  return can("media.devices");
}

function streamLabel(id) {
  return state.streams.find((stream) => stream.id === id)?.label ?? "Источник не выбран";
}

function actionIcon(kind) {
  const paths = {
    role: `<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3.2 2.5-5 5.5-5 1.6 0 2.9.5 3.8 1.4M16 8h5m-2.5-2.5L21 8l-2.5 2.5"/>`,
    disconnect: `<path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9"/>`,
    preview: `<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>`,
    route: `<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-2-12 5 3-5 3Z"/>`,
    hls: `<path d="M5 17a7 7 0 0 1 0-10m4 7a3 3 0 0 1 0-4m10-3a7 7 0 0 1 0 10m-4-7a3 3 0 0 1 0 4"/><circle cx="12" cy="12" r="1.5"/>`,
    multicast: `<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="m7 11 10-4m-10 6 10 4"/>`,
    convert: `<path d="M4 7h13l-3-3m3 3-3 3M20 17H7l3 3m-3-3 3-3"/>`,
    edit: `<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Zm9.5-13 3.5 3.5"/>`,
    delete: `<path d="M4 7h16m-10 4v6m4-6v6M8 7l1-3h6l1 3m2 0-1 14H7L6 7"/>`,
    waveform: `<path d="M3 12h3l2-6 3 12 3-9 2 6h5"/>`,
    headphones: `<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z"/>`,
    mute: `<path d="M5 10v4h4l5 4V6l-5 4H5Zm12-1 4 6m0-6-4 6"/>`
  };
  return `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[kind] ?? paths.preview}</svg>`;
}

function streamStatusHtml(status) {
  const value = String(status ?? "unknown").toLowerCase();
  const online = ["available", "active", "running", "ready", "connected"].includes(value);
  const pending = ["starting", "connecting", "stopping"].includes(value);
  const label = online ? "В сети" : pending ? "Подключение" : value === "offline" ? "Не в сети" : value === "failed" ? "Ошибка" : "Нет данных";
  return `<span class="stream-status ${online ? "stream-status-online" : pending ? "stream-status-pending" : "stream-status-offline"}" title="Технический статус: ${escapeHtml(value)}"><i></i>${label}</span>`;
}

function participantsAndSourcesHtml() {
  const labels = { delegate: "Делегат", observer: "Наблюдатель", chair: "Председатель", interpreter: "Переводчик", translator: "Переводчик",
    secretary: "Секретарь", operator: "Оператор", technician: "Техник", admin: "Администратор" };
  const mayViewPersonalCameras = state.meeting?.participants?.[state.participantId]?.permissions?.canViewPersonalCameras !== false || canOperateMedia();
  const participants = Object.values(state.meeting.participants ?? {}).filter((participant) =>
    participant.state === "joined" && participant.role !== "signage");
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const visibleStreams = state.streams.filter((stream) =>
    (!stream.ownerParticipantId || stream.ownerParticipantId === state.participantId || mayViewPersonalCameras) &&
    (stream.sourceType !== "system_multiview" || canOperateMedia()) &&
    stream.protocol !== "document" &&
    (stream.protocol !== "synthetic" || can("pgm.tiles") || ["voting", "agenda"].includes(stream.syntheticKind)) &&
    (stream.syntheticKind !== "agenda" || canOperateMedia() || can("pgm.tiles")));
  const showAudioControls = can("audio.operate");
  const participantActionsShown = new Set();
  const participantManagementActions = (participant) => {
    if (!participant || participantActionsShown.has(participant.id)) return "";
    participantActionsShown.add(participant.id);
    if (participant.id === state.participantId) return "";
    const changeRole = can("conference.participants") && participant.role !== "signage"
      ? `<button class="icon-action icon-action-neutral" data-action="change-participant-role" data-participant-id="${escapeHtml(participant.id)}" data-current-role="${escapeHtml(participant.role)}" title="Изменить роль" aria-label="Изменить роль участника">${actionIcon("role")}</button>` : "";
    const disconnect = can("conference.kick")
      ? `<button class="icon-action icon-action-warning" data-action="remove-participant" data-participant-id="${escapeHtml(participant.id)}" data-participant-name="${escapeHtml(participant.displayName)}" title="Отключить от заседания" aria-label="Отключить участника от заседания">${actionIcon("disconnect")}</button>` : "";
    const incoming = showAudioControls ? `<button class="icon-action ${participant.incomingAudioEnabled === false ? "icon-action-warning" : "icon-action-route"}" data-action="toggle-incoming-audio" data-participant-id="${escapeHtml(participant.id)}" data-enabled="${participant.incomingAudioEnabled !== false}" title="${participant.incomingAudioEnabled === false ? "Включить" : "Выключить"} входящий Mix-minus" aria-label="Управление входящим Mix-minus">${actionIcon("headphones")}</button>` : "";
    return incoming + changeRole + disconnect;
  };
  const renderParticipantAudio = (participant, stream = null) => {
    const eligible = participant.permissions?.canSpeak !== false && !["observer", "auditor", "service"].includes(participant.role);
    const hasAudio = stream ? stream.capabilities?.audio === true : eligible;
    const speaking = hasAudio && (participant.microphone === "open" || state.meeting.activeSpeakerIds.includes(participant.id));
    const audioState = !eligible ? "Микрофон недоступен" : speaking ? "Микрофон включён" : "Микрофон выключен";
    const stateClass = speaking ? "on" : eligible ? "mute" : "off";
    const meterId = stream?.id ?? participant.id;
    const gain = state.meeting.audioSettings?.participantGains?.[participant.id] ?? 100;
    const gainControl = eligible && showAudioControls
      ? `<label class="participant-gain"><input type="range" min="0" max="200" step="1" value="${gain}" data-mix-gain="${escapeHtml(participant.id)}"><output>${gain}%</output></label>` : "—";
    return { speaking, audioState, stateClass, meterId, gainControl };
  };
  const renderStreamRow = (stream) => {
    const participant = participantsById.get(stream.ownerParticipantId);
    const isAudioOnly = stream.capabilities?.video === false;
    const preview = isAudioOnly
      ? `<div class="source-thumb"><div class="preview-empty">Аудио</div></div>`
      : `<div id="source-thumb-${escapeHtml(stream.id)}" class="source-thumb"><div class="preview-empty">…</div></div>`;
    let audioState, stateClass, meterId = stream.id, gainControl = "—", speaking = false;
    const sourceMuted = state.meeting.audioSettings?.sourceMutes?.[stream.id] === true;
    if (participant) {
      ({ audioState, stateClass, meterId, gainControl, speaking } = renderParticipantAudio(participant, stream));
    } else {
      const audioCapable = stream.capabilities?.audio === true;
      const gain = state.meeting.audioSettings?.sourceGains?.[stream.id] ?? 100;
      const audioOnline = audioCapable && !["offline", "failed", "stopped"].includes(stream.status);
      audioState = audioOnline ? (!sourceMuted && gain > 0 ? "Аудио включено" : "Mute") : "Аудио выключено";
      stateClass = audioOnline ? (!sourceMuted && gain > 0 ? "on" : "mute") : "off";
      gainControl = audioCapable && showAudioControls
        ? `<label class="participant-gain"><input type="range" min="0" max="200" step="1" value="${gain}" data-source-gain="${escapeHtml(stream.id)}"><output>${gain}%</output></label>` : "—";
    }
    const owner = participant
      ? `<strong>${escapeHtml(participant.displayName)}</strong><br><small>${escapeHtml(labels[participant.role] ?? participant.role)}</small>`
      : `<strong>${escapeHtml(stream.label)}</strong><br><small>Системный источник</small>`;
    const sourceDetails = participant
      ? `<strong>${escapeHtml(stream.label)}</strong><br><small>${escapeHtml(stream.protocol.toUpperCase())} · ${escapeHtml(stream.sourceType)}</small>`
      : `<strong>${escapeHtml(stream.protocol.toUpperCase())}</strong><br><small>${escapeHtml(stream.sourceType)}</small>`;
    const previewButton = isAudioOnly || stream.sourceType === "system_multiview" ? "" : `<button class="icon-action icon-action-primary" data-action="preview-stream" data-stream-id="${escapeHtml(stream.id)}" title="Открыть просмотр" aria-label="Открыть просмотр источника">${actionIcon("preview")}</button>`;
    const muteButton = showAudioControls && stream.capabilities?.audio === true
      ? `<button class="icon-action ${sourceMuted ? "icon-action-warning" : "icon-action-neutral"}" data-action="toggle-source-mute" data-stream-id="${escapeHtml(stream.id)}" data-muted="${sourceMuted}" title="${sourceMuted ? "Включить аудио источника" : "Заглушить аудио источника"}" aria-label="Управление аудио источника">${actionIcon("mute")}</button>` : "";
    const tileButton = can("pgm.tiles") && stream.sourceType !== "system_multiview" && stream.capabilities?.video !== false
      ? `<button class="icon-action ${stream.pgmTileEnabled === false ? "icon-action-warning" : "icon-action-route"}" data-action="toggle-pgm-tile" data-stream-id="${escapeHtml(stream.id)}" data-enabled="${stream.pgmTileEnabled !== false}" title="${stream.pgmTileEnabled === false ? "Вернуть в плитки PGM" : "Исключить из плиток PGM"}" aria-label="${stream.pgmTileEnabled === false ? "Вернуть в плитки PGM" : "Исключить из плиток PGM"}">▦</button>` : "";
    const operatorActions = canOperateMedia() ? `<button class="icon-action icon-action-route" data-action="route-preview" data-stream-id="${escapeHtml(stream.id)}" title="Направить в служебный Preview" aria-label="Направить источник в Preview">${actionIcon("route")}</button>${stream.protocol === "rtsp" && !stream.previewUrl ? `<button class="icon-action icon-action-route" data-action="start-media-worker" data-stream-id="${escapeHtml(stream.id)}" title="Запустить HLS-преобразование" aria-label="Запустить HLS-преобразование">${actionIcon("hls")}</button>` : ""}${["rtsp", "hls"].includes(stream.protocol) && stream.ingestUrl ? `<button class="icon-action icon-action-route" data-action="start-multicast" data-stream-id="${escapeHtml(stream.id)}" title="Запустить multicast" aria-label="Запустить multicast">${actionIcon("multicast")}</button>` : ""}${stream.protocol === "ndi" && !stream.previewUrl ? `<button class="icon-action icon-action-route" data-action="receive-ndi-stream" data-stream-id="${escapeHtml(stream.id)}" title="Преобразовать NDI в HLS" aria-label="Преобразовать NDI в HLS">${actionIcon("convert")}</button>` : ""}` : "";
    const adminActions = can("media.sources") && !stream.ownerParticipantId && stream.protocol !== "synthetic" ? `<button class="icon-action icon-action-neutral" data-action="edit-stream" data-stream-id="${escapeHtml(stream.id)}" title="Настроить системный источник" aria-label="Настроить системный источник">${actionIcon("edit")}</button><button class="icon-action icon-action-danger" data-action="delete-stream" data-stream-id="${escapeHtml(stream.id)}" title="Удалить системный источник" aria-label="Удалить системный источник">${actionIcon("delete")}</button>` : "";
    const managementActions = participantManagementActions(participant);
    const selfClass = participant?.id === state.participantId ? " participant-self" : "";
    if (participant) {
      return `<tr class="${speaking ? "source-row-speaking" : ""}" data-stream-row="${escapeHtml(stream.id)}"><td>${preview}</td><td class="participant-cell${selfClass}">${owner}</td><td class="participant-stream-summary">—</td><td>${streamStatusHtml(participant.state === "joined" ? "connected" : "offline")}</td><td><span class="audio-state audio-state-${stateClass}">${audioState}</span></td>${showAudioControls ? "<td>—</td>" : ""}<td><div class="source-row-actions">${previewButton}${muteButton}${tileButton}${operatorActions}${managementActions}</div></td></tr>`;
    }
    return `<tr class="${speaking ? "source-row-speaking" : ""}" data-stream-row="${escapeHtml(stream.id)}"><td>${preview}</td><td class="participant-cell${selfClass}">${owner}</td><td>${sourceDetails}</td><td>${streamStatusHtml(stream.status)}</td><td><span class="audio-state audio-state-${stateClass}">${sourceMuted ? "Mute" : audioState}</span><br><meter class="audio-meter" min="-60" max="0" low="-36" high="-12" optimum="-18" value="-60" data-audio-meter="${escapeHtml(meterId)}"></meter></td>${showAudioControls ? `<td>${gainControl}</td>` : ""}<td><div class="source-row-actions">${previewButton}${muteButton}${tileButton}${operatorActions}${managementActions}${adminActions}</div></td></tr>`;
  };
  const participantStreamRows = visibleStreams.filter((stream) => participantsById.has(stream.ownerParticipantId)).map(renderStreamRow);
  const participantsWithoutStreams = participants.filter((participant) =>
    !visibleStreams.some((stream) => stream.ownerParticipantId === participant.id)).map((participant) => {
    const { speaking, audioState, stateClass } = renderParticipantAudio(participant);
    const selfClass = participant.id === state.participantId ? " participant-self" : "";
    const previewText = !mayViewPersonalCameras && participant.id !== state.participantId ? "Персональное Preview скрыто" : "Камера не опубликована";
    return `<tr class="${speaking ? "source-row-speaking" : ""}"><td><div class="source-thumb"><div class="preview-empty">${previewText}</div></div></td><td class="participant-cell${selfClass}"><strong>${escapeHtml(participant.displayName)}</strong><br><small>${escapeHtml(labels[participant.role] ?? participant.role)}</small></td><td class="participant-stream-summary">—</td><td>${streamStatusHtml("connected")}</td><td><span class="audio-state audio-state-${stateClass}">${audioState}</span></td>${showAudioControls ? "<td>—</td>" : ""}<td><div class="source-row-actions">${participantManagementActions(participant)}</div></td></tr>`;
  });
  const systemStreamRows = visibleStreams.filter((stream) => !stream.ownerParticipantId).map(renderStreamRow);
  const unjoinedOwnedStreamRows = visibleStreams.filter((stream) => stream.ownerParticipantId && !participantsById.has(stream.ownerParticipantId)).map(renderStreamRow);
  const columnCount = showAudioControls ? 7 : 6;
  const participantRows = [...participantStreamRows, ...participantsWithoutStreams, ...unjoinedOwnedStreamRows];
  const participantGroup = participantRows.length ? `<tr class="source-group-row"><td colspan="${columnCount}">Участники</td></tr>${participantRows.join("")}` : "";
  const systemGroup = systemStreamRows.length ? `<tr class="source-group-row"><td colspan="${columnCount}">Камеры и внешние источники</td></tr>${systemStreamRows.join("")}` : "";
  const rows = participantGroup + systemGroup || `<tr><td colspan="${columnCount}" class="empty">Участники и источники пока не зарегистрированы.</td></tr>`;
  const masterRow = showAudioControls ? `<tr class="mix-master"><td><span class="master-waveform">${actionIcon("waveform")}</span></td><td><strong>Mix-master</strong></td><td>PGM AudioCore</td><td>${streamStatusHtml("active")}</td><td><meter class="audio-meter" min="-60" max="0" low="-36" high="-12" optimum="-18" value="-60" data-audio-meter="__mix_master__"></meter></td><td><label class="participant-gain"><input type="range" min="0" max="200" step="1" value="${state.meeting.audioSettings?.masterGain ?? 100}" data-mix-master><output>${state.meeting.audioSettings?.masterGain ?? 100}%</output></label></td><td></td></tr>` : "";
  return `<article class="panel panel-pad participant-media-console"><div class="participant-console-head"><div><h4 class="panel-title">Участники и источники</h4><p>${mayViewPersonalCameras ? "Доступны персональные камеры и внешние источники" : "Чужие персональные камеры скрыты; своя доступна"}</p></div></div><div class="source-wall-wrap"><table class="source-wall-table"><thead><tr><th>Превью</th><th>Участник / источник</th><th>Источник</th><th>Сеть</th><th>Микрофон / аудио</th>${showAudioControls ? "<th>Уровень</th>" : ""}<th>Действия</th></tr></thead><tbody>${rows}${masterRow}</tbody></table></div></article>`;
}

function streamsHtml() {
  const runtime = state.mediaRuntime;
  const previewSource = state.routing?.buses?.preview?.sourceId ?? null;
  const programSource = state.routing?.buses?.program?.sourceId ?? null;
  const autoDirectorEnabled = state.routing?.autoDirector?.enabled === true;
  const manualDisabled = autoDirectorEnabled ? "disabled" : "";
  const manualTitle = autoDirectorEnabled ? "Автодиректор включён: выключите его для ручного TAKE/FADE" : "Перенести Preview в PGM";
  const autoDirectorToggle = can("pgm.operate")
    ? `<button class="button ${autoDirectorEnabled ? "button-quiet" : "button-secondary"}" data-action="toggle-auto-director">${autoDirectorEnabled ? "Выключить" : "Включить"} Автодиректор</button>` : "";
  const autoDirectorStatus = autoDirectorEnabled
    ? `<div class="status-row manual-hold"><div><strong>${state.routing?.autoDirector?.manualHold ? "Ручной источник в PGM" : "Автоматический источник в PGM"}</strong><br><small>${state.routing?.autoDirector?.manualHold ? "Автоматические правила сохранены и возобновятся при следующем изменении микрофонов." : "Действуют автоматические правила. Для отправки выбранного источника в PGM выключите Автодиректор."}</small></div><div class="card-actions">${state.routing?.autoDirector?.manualHold ? `<button class="button button-secondary" data-action="resume-auto-director">Вернуть автоматику сейчас</button>` : ""}${autoDirectorToggle}</div></div>`
    : `<div class="status-row manual-hold"><div><strong>Ручное управление PGM</strong><br><small>TAKE и FADE переносят выбранный источник Preview в PGM.</small></div><div class="card-actions">${autoDirectorToggle}</div></div>`;
  const cameraStatusText = (status) => ({ configured: "Настроена", reachable: "RTSP доступен", "media-ready": "Медиа готово", warning: "Требует проверки", "video-uri-missing": "Нет адреса потока" }[status] ?? status);
  const cameras = state.cameras.map((camera) => {
    const attached = state.streams.some((stream) => stream.cameraId === camera.id);
    const verified = camera.status === "media-ready";
    const hallAction = attached
      ? `<span class="camera-on-air" title="Источник уже подключён к конференции">● ON AIR</span>`
      : `<button class="route-button" data-action="attach-camera" data-camera-id="${camera.id}" ${verified ? "" : "disabled"} title="${verified ? "Отправить проверенную камеру в зал" : "Сначала выполните полную проверку источника"}">В зал</button>`;
    const autoEnabled = Boolean(camera.autoAttachToMeeting && camera.autoAttachApprovedBy);
    const autoAction = state.profile.role === "admin" ? `<button class="button button-quiet" data-action="toggle-camera-auto-attach" data-camera-id="${camera.id}" data-enabled="${autoEnabled}" title="Автопубликация при запуске любой конференции настраивается администратором">Авто: ${autoEnabled ? "вкл" : "выкл"}</button>` : "";
    const kind = camera.protocol === "ndi" ? "NDI" : (camera.serviceUrl ? "ONVIF" : "RTSP");
    return `<article class="panel stream-card ${attached ? "stream-card-on-air" : ""}"><div class="source-icon">${camera.hasPtz ? "PTZ" : kind}</div><div><h4>${escapeHtml(camera.name)}</h4><p>${escapeHtml(camera.model ?? kind)} · ${escapeHtml(cameraStatusText(camera.status))} · ${camera.hasPtz ? "PTZ" : "fixed"}</p></div><div class="card-actions"><button data-action="probe-camera" data-camera-id="${camera.id}" title="Проверить получение и декодирование медиапотока" aria-label="Проверить источник">⌁ Проверить</button>${hallAction}${autoAction}<button class="button-danger" data-action="delete-camera" data-camera-id="${camera.id}">Удалить</button></div></article>`;
  }).join("") || `<article class="panel empty">Системные камеры ещё не добавлены.</article>`;
  const ndiSources = state.ndiSources.map((source) => {
    const saved = state.cameras.some((camera) => camera.protocol === "ndi" && camera.ndiSourceName === source.name);
    return `<article class="panel stream-card"><div class="source-icon">NDI</div><div><h4>${escapeHtml(source.name)}</h4><p>${escapeHtml(source.address ?? source.host ?? "mDNS")} · ${escapeHtml(source.port ?? "—")}</p></div><div class="card-actions">${saved ? `<span class="catalog-saved">✓ В каталоге</span>` : `<button data-action="save-ndi-camera" data-ndi-id="${escapeHtml(source.id)}">В каталог</button>`}</div></article>`;
  }).join("") || `<article class="panel empty">Запустите поиск NDI-источников.</article>`;
  const ndiSourceLabel = (source) => {
    if (!source || typeof source !== "object") return "Источник не назначен";
    if (source.kind === "program") return "PGM";
    if (source.kind === "mosaic-all") return "Мозаика всех участников";
    if (source.kind === "mosaic-speakers") return "Мозаика говорящих";
    if (source.kind === "stream") return source.streamId ? `Поток: ${streamLabel(source.streamId)}` : "Конкретный поток не выбран";
    return source.kind;
  };
  const ndiOutputs = Object.values(state.routing?.ndiOutputs ?? {}).map((output) => {
    const outputJobs = state.ndiJobs.filter((item) => item.type === "ndi-send" && item.outputId === output.id);
    const job = outputJobs.find((item) => ["starting", "running", "stopping"].includes(item.status));
    const latestJob = [...outputJobs].sort((left, right) => String(right.startedAt).localeCompare(String(left.startedAt)))[0];
    const jobButton = job
      ? `<button class="button button-danger ndi-runtime-action" data-action="stop-ndi-job" data-job-id="${escapeHtml(job.id)}">Остановить NDI</button>`
      : `<button class="button button-secondary ndi-runtime-action" data-action="start-ndi-output" data-output-id="${escapeHtml(output.id)}" ${output.enabled ? "" : "disabled"}>Запустить NDI</button>`;
    const format = output.video?.format === "high-bandwidth" ? "HB" : output.video?.format;
    const dimensions = `${output.video?.width ?? 1280}×${output.video?.height ?? 720}@${Math.round((output.video?.fpsN ?? 25) / (output.video?.fpsD ?? 1))}`;
    const lifecycle = output.autoStart === "conference-active" ? "автозапуск" : "ручной запуск";
    const runtimeStatus = job?.status ?? latestJob?.status ?? output.status ?? "pending";
    return `<div class="status-row ndi-output-row"><div class="ndi-output-copy"><strong>${escapeHtml(output.name)}</strong><small>${escapeHtml(ndiSourceLabel(output.source))} · ${escapeHtml(format)} ${escapeHtml(dimensions)} · ${escapeHtml(lifecycle)} · ${escapeHtml(runtimeStatus)}</small></div><div class="ndi-output-actions"><button class="button button-quiet" data-action="configure-ndi-output" data-output-id="${escapeHtml(output.id)}">Настроить</button><button class="button button-quiet" data-action="toggle-ndi-output" data-output-id="${escapeHtml(output.id)}" data-enabled="${output.enabled}">${output.enabled ? "Отключить" : "Включить"}</button>${jobButton}</div></div>`;
  }).join("") || `<div class="empty">Маршрутизатор NDI не инициализирован.</div>`;
  const advanced = canOperateMedia() ? `<section class="media-console">
      ${pageHead("Операторская Media & Camera", "ONVIF / RTSP / Preview / Program / четыре NDI HB-выхода")}
      <div class="runtime-strip">
        <div><span>FFmpeg</span><strong class="runtime-${escapeHtml(runtime?.ffmpeg?.status ?? "unknown")}">${escapeHtml(runtime?.ffmpeg?.status ?? "unknown")}</strong></div>
        <div><span>NDI Runtime</span><strong class="runtime-${escapeHtml(runtime?.ndi?.runtimeStatus ?? "unknown")}">${escapeHtml(runtime?.ndi?.runtimeStatus ?? "unknown")}</strong></div>
        <div><span>NDI Bridge</span><strong class="runtime-${escapeHtml(runtime?.ndi?.bridgeStatus ?? "unknown")}">${escapeHtml(runtime?.ndi?.bridgeStatus ?? "unknown")}</strong></div>
        <button class="button button-quiet" data-action="refresh-media-runtime">Проверить runtime</button>
      </div>
      <div class="switcher-grid">
        <article class="studio-monitor bus-preview"><header><span>PREVIEW</span><strong>${escapeHtml(streamLabel(previewSource))}</strong></header><div id="studioPreviewStage" class="preview-stage studio-stage"><div class="preview-empty">Источник Preview не выбран</div></div></article>
        <article class="take-panel"><span class="auto-director-state ${autoDirectorEnabled ? "is-on" : "is-off"}">AUTO ${autoDirectorEnabled ? "ON" : "OFF"}</span><button class="take-button" data-action="take-program" ${manualDisabled} title="${manualTitle}">TAKE →</button><button class="button button-quiet" data-action="fade-program" ${manualDisabled} title="${manualTitle}">FADE 500 ms</button></article>
        <article class="studio-monitor bus-program" aria-label="PGM: ${escapeHtml(streamLabel(programSource))}"><div id="studioProgramStage" class="preview-stage studio-stage"><div class="preview-empty">PGM пока не сформирован</div></div></article>
      </div>
      ${autoDirectorStatus}
      <p class="hint">Preview (PVW) — служебная шина оператора: зрители её не видят. TAKE или FADE переносит выбранный источник в PGM.</p>
      ${participantsAndSourcesHtml()}
      <div class="action-strip media-toolbar"><button class="button button-secondary" data-action="discover-onvif">Найти ONVIF-камеры</button><button class="button button-quiet" data-action="register-system-camera">Добавить RTSP/URL-поток</button><button class="button button-quiet" data-action="add-onvif-camera">Добавить ONVIF вручную</button><button class="button button-secondary" data-action="discover-ndi">Найти NDI</button></div>
      <div class="grid grid-2"><article><h4>Каталог камер</h4><div class="grid">${cameras}</div></article><article class="panel panel-pad ndi-output-panel"><h4 class="panel-title">NDI outputs</h4><div class="ndi-output-list">${ndiOutputs}</div></article></div>
      <div style="height:16px"></div><h4>Обнаруженные NDI-источники</h4><p class="hint">Обнаружение не подключает источник к конференции. Сначала сохраните его в каталог камер.</p><div class="grid grid-2">${ndiSources}</div>
    </section>` : "";
  return `
    ${pageHead("Камеры и потоки", "Камеры и источники")}
    ${canOperateMedia() ? "" : participantsAndSourcesHtml()}
    ${can("pgm.operate") ? pgmModeHtml() : ""}
    ${advanced}`;
}

function localAvDevicesHtml() {
  const published = Boolean(hasLocalVideo() && state.publishedStream);
  return `<article id="camera-setup" class="panel panel-pad media-device-panel settings-media-devices">
      <div class="list-item-head"><div><h4 class="panel-title">Камера и звук</h4><p>Устройства сохраняются для этого браузера</p></div><button class="button button-quiet" data-action="refresh-media-devices">Обновить список</button></div>
      <div class="device-selector-grid">
        <label class="field"><span>Камера</span><select id="videoInputSelect" data-media-device="videoinput">${mediaDeviceOptions(state.mediaDevices.videoInputs, state.selectedVideoInputId, "Системная камера по умолчанию")}</select></label>
        <label class="field"><span>Микрофон</span><select id="audioInputSelect" data-media-device="audioinput">${mediaDeviceOptions(state.mediaDevices.audioInputs, state.selectedAudioInputId, "Системный микрофон по умолчанию")}</select></label>
        <label class="field"><span>Вывод аудио</span><select id="audioOutputSelect" data-media-device="audiooutput" ${state.mediaDevices.audioOutputs.length ? "" : "disabled"}>${mediaDeviceOptions(state.mediaDevices.audioOutputs, state.selectedAudioOutputId, "Системный выход по умолчанию")}</select></label>
      </div>
      <div class="camera-setup-actions"><button class="button button-secondary" type="button" data-action="publish-local-camera" ${published ? "disabled" : ""}>${published ? "Камера подключена" : "Включить камеру"}</button><p>Если доступ заблокирован, разрешите камеру для этого сайта в настройках браузера</p></div>
      ${state.mediaDevices.audioOutputs.length ? "" : `<p class="device-hint">Выбор аудиовыхода требует Chrome/Edge и HTTPS; на неподдерживаемых устройствах используется системный выход.</p>`}
    </article>`;
}

function absoluteMediaUrl(value) {
  return value?.startsWith("/") ? `${state.profile.serverUrl}${value}` : value;
}

function resumeVideoElement(video, hls = null, { allowControls = true } = {}) {
  if (!video) return;
  video.autoplay = true;
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.controls = Boolean(allowControls);
  video.preload = "auto";
  if (typeof video.setSinkId === "function") {
    video.setSinkId(state.selectedAudioOutputId || "default").catch(() => {});
  }
  hls?.startLoad?.(-1);
  video.play().catch(() => {
    // Passive players must never expose Safari's full-screen media HUD.
    // Operator actions live outside the media element.
    if (allowControls) video.controls = true;
  });
}

function programCaption(stream) {
  const participant = stream?.ownerParticipantId ? state.meeting?.participants?.[stream.ownerParticipantId] : null;
  if (!participant) return { title: stream?.label ?? "", subtitle: "" };
  return { title: participant.displayName || stream.label || "Участник",
    subtitle: [participant.company, participant.position].filter(Boolean).join(" · ") };
}

function normalizedCaption(value) {
  return typeof value === "string" ? { title: value, subtitle: "" }
    : { title: String(value?.title ?? ""), subtitle: String(value?.subtitle ?? "") };
}

function setMediaCaptions(wrapper, label, captions = null, showCaption = true) {
  if (!showCaption) {
    wrapper.querySelectorAll(".preview-label, .program-source-labels").forEach((node) => node.remove());
    return;
  }
  if (Array.isArray(captions)) {
    wrapper.querySelector(".preview-label")?.remove();
    const visibleCaptions = captions.map(normalizedCaption).filter((item) => item.title);
    const columns = Math.ceil(Math.sqrt(visibleCaptions.length));
    const rows = visibleCaptions.length ? Math.ceil(visibleCaptions.length / columns) : 0;
    let overlay = wrapper.querySelector(".program-source-labels");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "program-source-labels";
      for (let index = 0; index < 16; index += 1) {
        const cell = document.createElement("div"); cell.hidden = true;
        cell.append(document.createElement("span")); overlay.append(cell);
      }
      wrapper.append(overlay);
    }
    overlay.hidden = !visibleCaptions.length;
    if (visibleCaptions.length) {
      overlay.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      overlay.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
    }
    [...overlay.children].forEach((cell, index) => {
      const caption = visibleCaptions[index] ?? null;
      cell.hidden = !caption;
      const box = cell.firstElementChild;
      let title = box.querySelector("strong"); let subtitle = box.querySelector("small");
      if (!title || !subtitle) {
        box.replaceChildren(); title = document.createElement("strong"); subtitle = document.createElement("small");
        box.append(title, subtitle);
      }
      title.textContent = caption?.title ?? "";
      subtitle.textContent = caption?.subtitle ?? "";
      subtitle.hidden = !caption?.subtitle;
    });
    return;
  }
  wrapper.querySelector(".program-source-labels")?.remove();
  let caption = wrapper.querySelector(".preview-label");
  if (!caption) { caption = document.createElement("div"); caption.className = "preview-label"; wrapper.append(caption); }
  caption.textContent = label || "Локальный предпросмотр";
}

function mountMediaView(stageId, stream, media, { local = false, label = null, captions = null,
  showCaption = true, controls = true, muted = null } = {}) {
  const stage = $(`#${stageId}`);
  if (!stage) return;
  if (!stream && !media) return;
  const mediaTrackKey = media ? media.getTracks().map((track) => `${track.kind}:${track.id}`).sort().join("|") : "url";
  const documentStillTick = !media && stream?.syntheticKind === "document" &&
    (stageId === "studioPreviewStage" || stageId.startsWith("source-thumb-"))
    ? `:${Math.floor(Date.now() / 2000)}` : "";
  const key = local ? `local:${mediaTrackKey}` : `${stream?.id}:${stream?.previewUrl ?? ""}:${mediaTrackKey}${documentStillTick}`;
  const existing = state.mediaViews.get(stageId);
  if (existing?.key === key) {
    setMediaCaptions(existing.node, label || stream?.label, captions, showCaption);
    // Replacing a node with itself still detaches/reinserts it. Safari may
    // briefly clear the video surface in that interval, producing the black
    // strobe seen on every floor/PGM metadata update.
    if (existing.node.parentNode !== stage) stage.replaceChildren(existing.node);
    const existingVideo = existing.node.querySelector("video");
    if (existingVideo && muted !== null) existingVideo.muted = Boolean(muted);
    resumeVideoElement(existingVideo, existing.hls, { allowControls: controls && !local });
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "media-view";
  let hls = null;
  if (media || local) {
    const video = document.createElement("video");
    video.autoplay = true; video.playsInline = true; video.controls = controls && !local; video.preload = "auto";
    video.disablePictureInPicture = true; video.disableRemotePlayback = true;
    video.muted = muted === null ? (local || stream?.sourceType === "client_camera") : Boolean(muted);
    video.srcObject = media;
    wrapper.append(video);
    resumeVideoElement(video, null, { allowControls: controls && !local });
  } else if (stream?.previewUrl && (stream.protocol === "mjpeg" || /\.(?:svg|png|jpe?g)(?:\?|$)/i.test(stream.previewUrl))) {
    const image = document.createElement("img"); image.alt = stream.label; wrapper.append(image);
    const imageUrl = absoluteMediaUrl(stream.previewUrl);
    const protectedStill = stream.protocol !== "mjpeg" && /\.(?:svg|png|jpe?g)(?:\?|$)/i.test(stream.previewUrl);
    if (protectedStill && /^https?:/i.test(imageUrl) && state.api) {
      fetch(imageUrl, { cache: "no-store", headers: state.api.headers() }).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        const current = state.mediaViews.get(stageId);
        if (current?.key !== key || current.node !== wrapper) { URL.revokeObjectURL(objectUrl); return; }
        current.imageObjectUrl = objectUrl; image.src = objectUrl;
      }).catch((error) => {
        if (state.mediaViews.get(stageId)?.key === key) notify(`Preview: ${error.message}`, 2500);
      });
    } else image.src = imageUrl;
  } else if (stream?.previewUrl && (stream.protocol === "hls" || stream.previewUrl.endsWith(".m3u8"))) {
    const video = document.createElement("video"); video.autoplay = true; video.playsInline = true; video.controls = controls; video.preload = "auto";
    video.disablePictureInPicture = true; video.disableRemotePlayback = true;
    if (muted !== null) video.muted = Boolean(muted);
    const url = absoluteMediaUrl(stream.previewUrl);
    if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = url;
    else if (window.Hls?.isSupported()) {
      hls = new window.Hls({ enableWorker: true, lowLatencyMode: true, liveSyncDurationCount: 3, backBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => resumeVideoElement(video, hls, { allowControls: controls }));
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
    }
    wrapper.append(video); resumeVideoElement(video, hls, { allowControls: controls });
  } else {
    wrapper.innerHTML = `<div class="preview-empty">${stream?.protocol === "webrtc" ? "Подключение к WebRTC-камере…" : stream?.status === "offline" ? "Источник временно недоступен. Ожидается повторная публикация…" : "Для просмотра требуется HLS, WebRTC или MJPEG."}</div>`;
  }
  setMediaCaptions(wrapper, label || stream?.label, captions, showCaption);
  state.mediaViews.set(stageId, { key, node: wrapper, hls, imageObjectUrl: null });
  const isPersistentProgramStage = stageId === "programStage" || stageId === "studioProgramStage" || stageId === "studioPreviewStage";
  if (isPersistentProgramStage && existing?.node?.isConnected) {
    // The transport is already make-before-break.  Keep the painted surface
    // make-before-break as well: Safari otherwise clears the stage while the
    // replacement <video> is waiting for its first compositor frame.
    stage.style.position = "relative";
    wrapper.style.position = "absolute";
    wrapper.style.inset = "0";
    wrapper.style.opacity = "0";
    wrapper.style.zIndex = "2";
    stage.append(wrapper);
    const visual = wrapper.querySelector("video, img");
    let completed = false;
    let fallback = null;
    const reveal = () => {
      if (completed) return;
      completed = true;
      clearTimeout(fallback);
      if (state.mediaViews.get(stageId)?.node !== wrapper) {
        hls?.destroy();
        wrapper.remove();
        return;
      }
      wrapper.style.opacity = "1";
      wrapper.style.position = "relative";
      wrapper.style.inset = "auto";
      existing.hls?.destroy();
      if (existing.imageObjectUrl) URL.revokeObjectURL(existing.imageObjectUrl);
      existing.node.remove();
    };
    if (visual instanceof HTMLVideoElement) {
      if (visual.requestVideoFrameCallback) visual.requestVideoFrameCallback(reveal);
      else visual.addEventListener("loadeddata", reveal, { once: true });
    } else if (visual instanceof HTMLImageElement && (!visual.complete || !visual.currentSrc)) {
      visual.addEventListener("load", reveal, { once: true });
    } else {
      queueMicrotask(reveal);
    }
    fallback = setTimeout(reveal, 1500);
    return;
  }
  existing?.hls?.destroy();
  if (existing?.imageObjectUrl) URL.revokeObjectURL(existing.imageObjectUrl);
  stage.replaceChildren(wrapper);
}

function mountStudioMonitors() {
  if (state.activeTab !== "streams") return;
  const previewId = state.routing?.buses?.preview?.sourceId;
  const preview = state.streams.find((item) => item.id === previewId) ?? state.selectedStream;
  if (preview) {
    if (preview.sourceType === "system_multiview") {
      const stage = $("#studioPreviewStage");
      if (stage) stage.innerHTML = `<div class="preview-empty">${escapeHtml(preview.label)} будет собрана при TAKE</div>`;
    } else {
    const own = preview.ownerParticipantId === state.participantId;
    if (!own && preview.protocol !== "synthetic" && inMcu(preview) && !mediaForStream(preview)) {
      watchClientStream(preview, { includeVideo: true, includeAudio: false, previewQuality: "full" })
        .then(mountStudioMonitors).catch(() => {});
    }
    mountMediaView("studioPreviewStage", preview, own ? state.localMedia : mediaForStream(preview), {
      local: own, label: preview.label, controls: false, muted: true
    });
    }
  }
  const program = { id: `program:${state.profile.meetingId}`, protocol: "webrtc", label: "PGM" };
  watchProgramStream(program).catch((error) => notify(`PGM: ${error.message}`, 4000));
  mountMediaView("studioProgramStage", program, state.programMedia, {
    label: "PGM", controls: false, muted: true
  });
}

function stopThumbnailLoop() {
  clearInterval(state.thumbnailTimer);
  state.thumbnailTimer = null;
}

function drawThumbnails() {
  for (const [streamId, sink] of state.thumbnailSinks) {
    if (!document.getElementById(`source-thumb-${streamId}`)) { state.thumbnailSinks.delete(streamId); continue; }
    const { video, canvas, ctx } = sink;
    if (video.readyState < 2 || !video.videoWidth) continue;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
}

// The source wall used to mount one full <video> per tile via mountMediaView,
// so every visible row decoded AND painted at full framerate simultaneously.
// WebRTC/MCU rows now feed a small offscreen <video> sink that a single
// shared timer samples onto a small on-screen <canvas> at THUMBNAIL_FPS;
// HLS/MJPEG rows are cheap already (the browser/HLS.js does the throttling)
// and keep using mountMediaView directly. Full quality is one click away via
// the "Просмотр" button's popup (openStreamPreviewModal).
function mountStreamThumbnails() {
  if (state.activeTab !== "streams") return;
  const liveIds = new Set();
  for (const stream of state.streams) {
    const stageId = `source-thumb-${stream.id}`;
    const stage = document.getElementById(stageId);
    if (!stage || stream.capabilities?.video === false) continue;
    const own = stream.ownerParticipantId === state.participantId;
    const media = own && hasLocalVideo() ? state.localMedia : mediaForStream(stream);
    if (!media && (stream.protocol === "mjpeg" || stream.protocol === "hls" || stream.previewUrl)) {
      state.thumbnailSinks.delete(stream.id);
      mountMediaView(stageId, stream, null, { showCaption: false, controls: false, muted: true });
      continue;
    }
    if (!media) {
      state.thumbnailSinks.delete(stream.id);
      if (!stage.querySelector(".preview-empty")) {
        const deferred = RESOURCE_CONSTRAINED_CLIENT && inMcu(stream) &&
          !budgetedThumbnailStreams().some((item) => item.id === stream.id);
        stage.innerHTML = `<div class="preview-empty">${stream.status === "offline" ? "Недоступен" : deferred ? "Экономичный режим · откройте просмотр" : "Подключение…"}</div>`;
      }
      continue;
    }
    liveIds.add(stream.id);
    let sink = state.thumbnailSinks.get(stream.id);
    if (!sink || sink.media !== media) {
      const video = document.createElement("video");
      video.autoplay = true; video.muted = true; video.playsInline = true;
      video.srcObject = media;
      video.play().catch(() => {});
      const canvas = document.createElement("canvas");
      sink = { video, canvas, ctx: canvas.getContext("2d"), media };
      state.thumbnailSinks.set(stream.id, sink);
      stage.replaceChildren(canvas);
    } else if (stage.firstElementChild !== sink.canvas) {
      stage.replaceChildren(sink.canvas);
    }
  }
  for (const streamId of [...state.thumbnailSinks.keys()]) {
    if (!liveIds.has(streamId)) state.thumbnailSinks.delete(streamId);
  }
  if (state.thumbnailSinks.size && !state.thumbnailTimer) {
    state.thumbnailTimer = setInterval(drawThumbnails, Math.round(1000 / THUMBNAIL_FPS));
  } else if (!state.thumbnailSinks.size && state.thumbnailTimer) {
    clearInterval(state.thumbnailTimer);
    state.thumbnailTimer = null;
  }
  // Fill newly rendered canvases in the same turn instead of leaving a black
  // tile until the next 125 ms timer tick after a non-floor UI refresh.
  drawThumbnails();
}

function handleStreamPreviewKeydown(event) {
  if (event.key === "Escape") closeStreamPreviewModal();
}

function closeStreamPreviewModal({ reconcile = true } = {}) {
  document.removeEventListener("keydown", handleStreamPreviewKeydown);
  state.previewModalStreamId = null;
  state.mediaViews.get("streamPreviewStage")?.hls?.destroy();
  state.mediaViews.delete("streamPreviewStage");
  document.querySelector(".stream-preview-backdrop")?.remove();
  if (reconcile && state.activeTab === "streams") syncSourceWall().catch(() => {});
}

// Opens the stream at full quality/framerate in a popup sized like PGM,
// reusing whatever subscription already exists (the thumbnail keeps one
// warm for every visible row) instead of opening a second one.
async function openStreamPreviewModal(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream) return;
  closeStreamPreviewModal({ reconcile: false });
  state.previewModalStreamId = streamId;
  const backdrop = document.createElement("div");
  backdrop.className = "form-dialog-backdrop stream-preview-backdrop";
  backdrop.innerHTML = `<div class="form-dialog stream-preview-dialog">
    <div class="list-item-head"><h4 class="panel-title">${escapeHtml(stream.label)}</h4><button type="button" class="dialog-icon-close" data-dialog-close data-action="close-stream-preview" aria-label="Закрыть">×</button></div>
    <div id="streamPreviewStage" class="preview-stage"><div class="preview-empty">Подключение…</div></div>
  </div>`;
  document.body.append(backdrop);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeStreamPreviewModal(); });
  backdrop.querySelector('[data-action="close-stream-preview"]')
    ?.addEventListener("click", closeStreamPreviewModal, { once: true });
  document.addEventListener("keydown", handleStreamPreviewKeydown);
  const own = stream.ownerParticipantId === state.participantId;
  if (!own && inMcu(stream)) {
    await watchClientStream(stream, { includeVideo: true, includeAudio: false, previewQuality: "full" })
      .catch((error) => notify(`Просмотр: ${error.message}`, 4000));
  }
  mountStreamPreviewModal();
}

function mountStreamPreviewModal() {
  if (!state.previewModalStreamId || !document.getElementById("streamPreviewStage")) return;
  const stream = state.streams.find((item) => item.id === state.previewModalStreamId);
  if (!stream) { closeStreamPreviewModal(); return; }
  const own = stream.ownerParticipantId === state.participantId;
  const media = own && hasLocalVideo() ? state.localMedia : mediaForStream(stream);
  mountMediaView("streamPreviewStage", stream, media, {
    local: own && Boolean(media), label: stream.label, controls: false, muted: true
  });
}

function mountProgram() {
  if (state.programDescriptor?.composition?.persistent) {
    const stream = { id: `program:${state.profile.meetingId}`, protocol: "webrtc", label: "Program" };
    const sourceIds = state.programDescriptor?.composition?.visibleSourceIds ?? [];
    const serverCaptions = state.programDescriptor?.composition?.visibleCaptions;
    const labels = Array.isArray(serverCaptions)
      ? serverCaptions.map(normalizedCaption).filter((item) => item.title)
      : sourceIds.map((id) => state.streams.find((item) => item.id === id)).map((item) => item
        ? { sourceId: item.id, title: item.label || "Источник", subtitle: "" }
        : { title: "Источник", subtitle: "" });
    const caption = labels[0]?.title ?? "PGM";
    watchProgramStream(stream).catch((error) => notify(`PGM: ${error.message}`, 4000));
    mountMediaView("programStage", stream, state.programMedia, { label: caption, captions: labels, controls: false, muted: true });
    return;
  }
  const id = state.routing?.buses?.program?.sourceId;
  const stream = state.streams.find((item) => item.id === id);
  if (!stream) {
    closeProgramSubscriber().catch(() => {});
    state.mediaViews.delete("programStage");
    const stage = $("#programStage");
    if (stage) stage.innerHTML = '<div class="preview-empty">В Program пока не назначен источник.</div>';
    return;
  }
  // Any source that is a producer in the MCU - participants' cameras and,
  // after server ingest, RTSP/HLS/NDI room cameras - is watched over WebRTC;
  // only a source the server has not ingested falls back to its HLS preview.
  if (stream.protocol === "webrtc" || state.programDescriptor?.sourceInMcu ||
    (stream.sourceType === "system_multiview" && state.programDescriptor?.composition?.videoProducerId)) {
    const caption = programCaption(stream);
    watchProgramStream(stream).catch((error) => notify(`PGM: ${error.message}`, 4000));
    mountMediaView("programStage", stream, state.programMedia, {
      label: caption.title || `PGM · ${stream.label}`, captions: [caption], controls: false, muted: true
    });
    return;
  }
  if (stream.sourceType === "system_multiview") {
    // The server mosaic is still starting: show the scene's own members (the
    // speakers, or everyone for an idle mosaic) individually meanwhile - not
    // every stream in the meeting. Our own camera is shown from the local
    // capture; it has no consumer of its own to subscribe to.
    closeProgramSubscriber().catch(() => {});
    state.mediaViews.delete("programStage");
    const stage = $("#programStage");
    const memberIds = state.programDescriptor?.scene?.sourceIds ?? [];
    const streams = memberIds.map((id) => state.streams.find((item) => item.id === id)).filter(Boolean);
    stage.innerHTML = `<div class="multiview-grid pgm-multiview">${streams.map((item) => `<div id="pgm-multiview-${escapeHtml(item.id)}" class="preview-stage"></div>`).join("")}</div>`;
    for (const item of streams) {
      const own = item.ownerParticipantId === state.participantId;
      if (!own && item.protocol === "webrtc" && !mediaForStream(item)) watchClientStream(item).catch(() => {});
      mountMediaView(`pgm-multiview-${item.id}`, item, own ? state.localMedia : mediaForStream(item), {
        local: own, captions: [programCaption(item)], muted: true
      });
    }
    return;
  }
  const caption = programCaption(stream);
  mountMediaView("programStage", stream, mediaForStream(stream), {
    label: caption.title || `PGM · ${stream.label}`, captions: [caption], controls: false, muted: true
  });
}

function canManageVotes() {
  return can("votes.manage");
}

function canCastVotes() {
  return state.meeting?.participants?.[state.participantId]?.permissions?.canVote !== false && !["observer", "auditor", "interpreter", "service"].includes(state.profile.role);
}

function isEligibleForVote(vote) {
  const me = state.meeting?.participants?.[state.participantId];
  return canCastVotes() && (!vote?.eligibleParticipantIds?.length || vote.eligibleParticipantIds.includes(state.participantId) ||
    (me?.userId && vote.eligibleParticipantIds.includes(me.userId)));
}

function canViewFiles() {
  return state.meeting?.participants?.[state.participantId]?.permissions?.canViewFiles !== false;
}

function canUploadFiles() {
  return state.meeting?.participants?.[state.participantId]?.permissions?.canUploadFiles !== false;
}

function canShareScreen() {
  return state.meeting?.participants?.[state.participantId]?.permissions?.canShareScreen !== false;
}

function canSpeak() {
  const participant = state.meeting?.participants?.[state.participantId];
  return Boolean(participant && participant.permissions?.canSpeak !== false &&
    !["observer", "auditor", "service", "signage"].includes(participant.role));
}

function votingHtml() {
  const action = canManageVotes()
    ? `<button class="button button-quiet" data-action="create-vote">Новое голосование</button>`
    : "";
  const items = state.votes.length ? state.votes.map((vote) => {
    const options = vote.options.map((option) => {
      const selectedOptionId = state.voteSelections.get(vote.id) ?? vote.namedBallots?.find((ballot) => ballot.participantId === state.participantId)?.optionId;
      const pendingOptionId = state.voteCastPending?.get(vote.id);
      const selected = selectedOptionId === option.id;
      const namedVoters = vote.mode === "named" && vote.namedBallots
        ? vote.namedBallots.filter((ballot) => ballot.optionId === option.id).map((ballot) => ballot.displayName).join(", ")
        : "";
      const semantic = { "за": "vote-for", "против": "vote-against", "воздержался": "vote-abstain" }[String(option.label).trim().toLocaleLowerCase("ru-RU")] ?? "vote-other";
      return `<div class="option-row ${semantic} ${selected ? "selected" : ""}"><span>${escapeHtml(option.label)}${selected ? `<small class="selected-vote-label">✓ Ваш выбор принят</small>` : ""}${namedVoters ? `<small class="voter-names">${escapeHtml(namedVoters)}</small>` : ""}</span>${
      vote.status === "open" && isEligibleForVote(vote) && vote.ballotType === "single"
        ? `<button class="button vote-choice ${semantic} ${selected ? "button-selected" : ""}" aria-pressed="${selected}" data-action="cast-vote" data-vote-id="${vote.id}" data-option-id="${option.id}" ${selectedOptionId || vote.hasVoted || pendingOptionId ? "disabled" : ""}>${selected ? "✓ Выбрано" : vote.hasVoted ? "Голос принят" : pendingOptionId === option.id ? "Отправляем…" : "Выбрать"}</button>`
        : vote.results ? `<strong>${vote.results[option.id] || 0}</strong>` : ""
    }</div>`;
    }).join("");
    const ballot = vote.status === "open" && isEligibleForVote(vote) && !vote.hasVoted ? advancedBallot(vote) : "";
    const controls = canManageVotes() ? `<div class="action-strip" style="margin-top:12px">${
      vote.status === "draft" ? `<label class="inline-number">Время, сек. <input data-vote-duration="${vote.id}" type="number" min="10" max="86400" value="${vote.durationSeconds ?? 60}"></label>${can("pgm.tiles") ? `<button class="button button-secondary" data-action="configure-vote-result" data-vote-id="${vote.id}">Показ итогов: ${escapeHtml(({ none: "выкл", tiles: "плитка PGM", program: "весь PGM" })[vote.displayPolicy?.resultTarget ?? "none"])}</button>` : ""}<button class="button button-secondary" data-action="open-vote" data-vote-id="${vote.id}">Открыть</button><button class="button button-danger" data-action="delete-vote" data-vote-id="${vote.id}">Удалить проект</button>` : ""
    }${vote.status === "open" ? `<button class="button button-danger" data-action="close-vote" data-vote-id="${vote.id}">Закрыть</button>` : ""}${vote.status === "closed" && vote.finalResult?.nextRoundAllowed ? `<button class="button button-secondary" data-action="next-vote-round" data-vote-id="${vote.id}">Следующий тур</button>` : ""}</div>` : "";
    const remaining = vote.status === "open" && vote.closesAt ? Math.max(0, Math.ceil((Date.parse(vote.closesAt) - Date.now()) / 1000)) : null;
    const summary = vote.electorateSummary ?? {};
    return `<article class="panel list-item vote-card"><div class="list-item-head"><div><h3 class="vote-question">${escapeHtml(vote.topic ?? vote.question)}</h3><p>${escapeHtml(vote.question)}</p>${vote.status === "closed" ? `<p class="vote-outcome"><strong>Результат:</strong> ${escapeHtml(voteOutcomeLabel(vote))}</p>` : ""}<p>${escapeHtml(VOTE_MODE_LABELS[vote.mode] ?? vote.mode)} · ${escapeHtml(VOTE_RULE_LABELS[vote.ruleSetId] ?? "Правило голосования")} · тур ${vote.round ?? 1} · приглашены ${summary.invitedEligible ?? "—"} · подключены ${summary.connectedNow ?? summary.connectedAtOpen ?? "—"} · проголосовали ${summary.ballotsCast ?? vote.ballotsCast ?? 0} · не проголосовали ${summary.notVoted ?? "—"}</p></div><div class="vote-card-status">${voteTimer(vote, remaining)}<span class="chip">${escapeHtml(VOTE_STATUS_LABELS[vote.status] ?? vote.status)}</span></div></div>${ballot || options}${controls}</article>`;
  }).join("") : `<article class="panel empty">Голосований нет.</article>`;
  return `${pageHead("Голосование", "Вопросы и результаты", action)}<div class="grid">${items}</div>`;
}

function canManageContent() {
  return can("presentations.control");
}

function documentFormatIcon(fileName) {
  const extension = String(fileName ?? "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "file";
  const format = /^(doc|docx|odt)$/.test(extension) ? "DOC" :
    /^(xls|xlsx|ods)$/.test(extension) ? "XLS" :
    /^(ppt|pptx|odp)$/.test(extension) ? "PPT" :
    /^(jpg|jpeg|png|gif|webp|svg|tif|tiff)$/.test(extension) ? "IMG" :
    extension === "pdf" ? "PDF" : "FILE";
  return `<span class="document-format-icon document-format-${format.toLowerCase()}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 2.5h9l5 5V21H5z"/><path d="M14 2.5V8h5"/></svg><span>${format}</span></span>`;
}

function contentHtml() {
  const accepted = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.png,.jpg,.jpeg,.gif,.webp,.svg,.tif,.tiff";
  const officialUpload = canUploadFiles() && can("documents.upload")
    ? `<label class="button button-secondary" title="Прикрепить файл к повестке">+ К повестке<input id="agendaDocumentUpload" class="file-input" type="file" accept="${accepted}"></label>` : "";
  const personalUpload = canUploadFiles() ? `<label class="button button-quiet" title="Добавить файл в мои документы">+ Мой документ<input id="documentUpload" class="file-input" type="file" accept="${accepted}"></label>` : "";
  const archiveImport = can("conference.archive") && can("documents.upload")
    ? '<button class="button button-secondary" data-action="import-archive-document">Из архива</button>' : "";
  const upload = `<div class="action-strip materials-upload-actions">${personalUpload}${officialUpload}${archiveImport}</div>`;
  const visibleDocuments = canViewFiles() ? state.documents :
    state.documents.filter((document) => document.uploadedBy === state.profile.userId);
  const ownerName = (document) => document.uploadedByName ??
    Object.values(state.meeting.participants ?? {}).find((person) => person.userId === document.uploadedBy)?.displayName ??
    state.meeting.preparedParticipants?.find((person) => person.id === document.uploadedBy ||
      person.accountId === document.uploadedBy)?.displayName ??
    (document.uploadedBy === state.profile.userId ? state.profile.displayName : "Владелец не указан");
  const documentRow = (document) => {
    const agenda = state.meeting.agenda?.find((item) => item.id === document.agendaItemId);
    const mine = document.uploadedBy === state.profile.userId;
    return `<div id="materials-document-${escapeHtml(document.id)}" class="list-item document-list-row" data-material-document-id="${escapeHtml(document.id)}" tabindex="-1"><div class="list-item-head"><div class="document-row-main"><h4>${documentFormatIcon(document.fileName)}<span>${escapeHtml(document.fileName)}</span></h4><p>${escapeHtml(ownerName(document))} · ${formatBytes(document.sizeBytes)}</p>${document.sourceMeetingId ? `<p>Из завершённой конференции ${escapeHtml(document.sourceMeetingId)}</p>` : ""}${document.agendaItemId ? `<p><strong>Повестка:</strong> ${escapeHtml(agenda?.title ?? "Вопрос повестки")}</p>` : ""}</div><div class="action-strip"><button class="button button-quiet" data-action="download-document" data-document-id="${document.id}">Открыть</button>${canManageContent() ? `<button class="button button-secondary" data-action="create-presentation" data-document-id="${document.id}" data-file-name="${escapeHtml(document.fileName)}">В показ</button>` : ""}${mine ? `<button class="button button-danger" data-action="delete-own-document" data-document-id="${document.id}">Удалить</button>` : ""}</div></div></div>`;
  };
  const ownDocuments = visibleDocuments.filter((document) => document.uploadedBy === state.profile.userId);
  const sharedDocuments = visibleDocuments.filter((document) => document.uploadedBy !== state.profile.userId &&
    (document.agendaItemId || state.presentations.some((show) => show.documentId === document.id && show.status === "active")));
  const managedPrivateDocuments = visibleDocuments.filter((document) => document.uploadedBy !== state.profile.userId &&
    !sharedDocuments.includes(document));
  const documentGroup = (title, documents, empty) => `<div class="document-list-group"><div class="document-list-group-head"><h5>${title}</h5><span class="document-list-group-count">${documents.length}</span></div>${documents.length
    ? documents.map(documentRow).join("") : `<div class="empty">${empty}</div>`}</div>`;
  const docs = documentGroup("Добавленные мной", ownDocuments, "Вы ещё не добавили документы.") +
    documentGroup("Предоставлены другими участниками", sharedDocuments, "Другие участники пока не предоставили документы.") +
    (managedPrivateDocuments.length && canManageContent()
      ? documentGroup("Личные документы других участников · служебный доступ", managedPrivateDocuments, "") : "");
  const shows = state.presentations.length ? state.presentations.map((item) => {
    const isLeader = item.leaderParticipantId ? item.leaderParticipantId === state.participantId
      : item.leaderUserId ? item.leaderUserId === state.profile.userId
        : item.leaderAssigned ? false : item.startedByParticipantId
          ? item.startedByParticipantId === state.participantId : item.startedBy === state.profile.userId;
    const canTurnPage = !state.meeting?.quick || isLeader;
    return `<div class="list-item document-list-row"><div class="list-item-head"><div class="document-row-main"><h4>${documentFormatIcon(item.title)}<span>${escapeHtml(item.title)}</span></h4><p>${escapeHtml(item.status)} · страница ${item.currentPage ?? "—"} / ${item.pageCount ?? "—"}</p>${state.meeting?.quick && item.status === "active" ? `<p>Показ ведёт: ${escapeHtml(item.leaderName || (item.leaderAssigned ? "ведущий не назначен" : item.startedByName || "ведущий не назначен"))}</p>` : ""}</div><div class="action-strip">${item.status === "active" ? `<button class="button button-secondary" data-action="open-presentation-document" data-document-id="${item.documentId}" data-presentation-id="${item.id}">Открыть показ</button>` : ""}${canManageContent() ? item.status !== "active" ? `<button class="button button-secondary" data-action="start-presentation" data-presentation-id="${item.id}">Старт</button>` : `${canTurnPage ? `<button class="button button-quiet" data-action="next-page" data-presentation-id="${item.id}" data-page="${(item.currentPage || 1) + 1}">Следующая</button>` : ""}<button class="button button-danger" data-action="stop-presentation" data-presentation-id="${item.id}">Стоп</button>` : `<span class="chip">${escapeHtml(item.status)}</span>`}</div></div></div>`;
  }).join("") : `<div class="empty">Презентации не созданы.</div>`;
  return `${pageHead("Материалы", "Документы конференции и управление показом", upload)}
    <div class="grid grid-2 materials-page"><article class="panel"><div class="panel-pad"><h4 class="panel-title">Документы</h4></div><div class="list">${docs}</div></article><article class="panel"><div class="panel-pad"><h4 class="panel-title">Презентации</h4></div><div class="list">${shows}</div></article></div>`;
}

function partnerFor(session) {
  const partnerId = session.participantA === state.participantId ? session.participantB : session.participantA;
  return state.meeting.participants[partnerId] ?? { id: partnerId, displayName: partnerId };
}

function chatPartnerId(session) {
  return session.participantA === state.participantId ? session.participantB : session.participantA;
}

function isLiveChatSession(session, meeting = state.meeting) {
  return meeting?.participants?.[chatPartnerId(session)]?.state === "joined";
}

function closeChatSessionLocally(sessionId) {
  const channel = state.chatChannels.get(sessionId);
  if (channel && channel.readyState !== "closed") channel.close();
  const peer = state.chatPeers.get(sessionId);
  if (peer && peer.connectionState !== "closed") peer.close();
  state.chatChannels.delete(sessionId);
  state.chatPeers.delete(sessionId);
  state.chatSignalSequence.delete(sessionId);
  state.chatPendingIce.delete(sessionId);
  state.chatUnread.delete(sessionId);
}

function reconcileChatSessions(sessions, meeting = state.meeting) {
  const liveSessions = (sessions ?? []).filter((session) => isLiveChatSession(session, meeting));
  const liveIds = new Set(liveSessions.map((session) => session.id));
  const activePartnerLeft = Boolean(state.activeChatId && !liveIds.has(state.activeChatId));
  for (const sessionId of new Set([...state.chatPeers.keys(), ...state.chatChannels.keys()])) {
    if (!liveIds.has(sessionId)) closeChatSessionLocally(sessionId);
  }
  state.chatSessions = liveSessions;
  if (activePartnerLeft) {
    state.activeChatId = null;
    if (state.activeTab === "chat") notify("Участник вышел из конференции", 3000);
  }
}

function chatHtml() {
  const participants = Object.values(state.meeting.participants)
    .filter((participant) => participant.id !== state.participantId && participant.state === "joined" && participant.role !== "signage")
    .map((participant) => `<div class="list-item"><div class="list-item-head"><div><h4>${escapeHtml(participant.displayName)}</h4><p>${escapeHtml(participant.role)} · ${escapeHtml(participant.deviceId)}</p></div><button class="button button-quiet" data-action="open-chat" data-participant-id="${escapeHtml(participant.id)}">Открыть</button></div></div>`)
    .join("") || `<div class="empty">Других подключённых участников нет.</div>`;
  const sessions = state.chatSessions.map((session) => {
    const partner = partnerFor(session);
    const channel = state.chatChannels.get(session.id);
    const status = channel?.readyState === "open" ? "Прямой канал" : "Через сервер";
    const unread = state.chatUnread.get(session.id) ?? 0;
    return `<button class="chat-session ${state.activeChatId === session.id ? "active" : ""} ${unread ? "has-unread" : ""}" data-action="select-chat" data-session-id="${session.id}"><strong>${escapeHtml(partner.displayName)}</strong><span>${unread ? `<b class="unread-dot">${unread}</b>` : ""}${escapeHtml(status)}</span></button>`;
  }).join("") || `<div class="empty">Диалогов пока нет</div>`;
  const active = state.chatSessions.find((item) => item.id === state.activeChatId);
  const messages = active ? (state.chatMessages.get(active.id) ?? []).map((message) => `<div class="chat-message ${message.own ? "own" : "peer"}"><span>${escapeHtml(message.text)}</span><small>${participantFormatTime(message.at, interfaceLocale())}</small></div>`).join("") : "";
  const channelOpen = active && state.chatChannels.get(active.id)?.readyState === "open";
  const emptyChat = channelOpen
    ? `<div class="empty">Канал открыт. Сообщения передаются напрямую между участниками.</div>`
    : `<div class="empty">Канал готовится. Первое сообщение можно отправить после статуса open.</div>`;
  const dialog = active
    ? `<article class="panel chat-dialog"><div class="chat-dialog-head"><div><h4>${escapeHtml(partnerFor(active).displayName)}</h4><p>Сообщения доступны участникам диалога и хранятся до завершения конференции</p></div><span class="chip">${channelOpen ? "Прямой канал" : "Через сервер"}</span></div><div class="chat-log">${messages || emptyChat}</div><form id="chatForm" class="chat-compose"><input id="chatMessage" data-session-id="${escapeHtml(active.id)}" maxlength="1000" value="${escapeHtml(state.chatDrafts.get(active.id) ?? "")}" placeholder="Личное сообщение" autocomplete="off"><button class="button button-primary" type="submit">Отправить</button></form></article>`
    : `<article class="panel empty">Выберите участника или существующий диалог.</article>`;
  return `${pageHead("Личный чат", "Личные сообщения участников")}
    <div class="grid chat-layout"><article class="panel"><div class="panel-pad"><h4 class="panel-title">Участники</h4></div><div class="list">${participants}</div><div class="panel-pad"><h4 class="panel-title">Диалоги</h4><div class="chat-sessions">${sessions}</div></div></article>${dialog}</div>`;
}

function requestItemsText(request) {
  return request.items.map((item) => `${serviceRequestCategoryLabel(item, interfaceLocale())} × ${item.quantity}`).join(", ");
}

function operationsHtml() {
  const role = state.profile.role;
  const canDevices = ["operator", "technician", "admin"].includes(role);
  const canReadiness = ["chair", "secretary", "operator", "technician", "admin"].includes(role);
  const canSignage = can("signage.manage");
  const canService = can("service.requests");
  const canAes67 = ["operator", "technician", "admin"].includes(role);
  const readiness = canReadiness ? `<article class="panel panel-pad"><div class="list-item-head"><div><h4 class="panel-title">Готовность зала</h4><p>${state.readiness?.status === "unconfigured" ? "Проверка не настроена: обязательные устройства не зарегистрированы" : state.readiness ? `${state.readiness.onlineDevices}/${state.readiness.requiredDevices} обязательных устройств доступны` : "Проверка не выполнялась"}</p></div><span class="chip ${state.readiness?.status === "ready" ? "" : "offline"}">${escapeHtml(({ ready: "Готов", warning: "Предупреждение", "not-ready": "Не готов", unconfigured: "Не настроено" })[state.readiness?.status] ?? "Не проверено")}</span></div>${(state.readiness?.checks ?? []).map((check) => `<p class="readiness-check">${escapeHtml(state.devices.find((item) => item.id === check.deviceId)?.name ?? check.deviceId)} · ${escapeHtml(check.status)}${check.error ? ` · ${escapeHtml(check.error)}` : ""}</p>`).join("")}<div class="action-strip"><button class="button button-secondary" data-action="check-readiness">Проверить зал</button></div></article>` : "";
  const devices = canDevices ? `<article class="panel"><div class="panel-pad"><h4 class="panel-title">Device Registry</h4></div><div class="list">${state.devices.map((device) => `<div class="list-item"><div class="list-item-head"><div><h4>${escapeHtml(device.name)}</h4><p>${escapeHtml(device.kind)} · ${escapeHtml(device.driverId)} · ${escapeHtml(device.id)}</p></div><span class="chip ${device.health?.status === "online" ? "" : "offline"}">${escapeHtml(device.health?.status ?? "unknown")}</span></div><div class="action-strip compact"><button class="button button-quiet" data-action="check-device" data-device-id="${device.id}">Health</button><button class="button button-quiet" data-action="device-command" data-device-id="${device.id}">Команда</button></div></div>`).join("") || `<div class="empty">Устройства не зарегистрированы.</div>`}</div></article>` : "";
  const roomPlayers = state.signagePlayers.filter((player) => player.roomId === (state.meeting.roomId ?? "default-room"));
  const signageDocuments = state.documents.filter((item) => item.meetingId === state.profile.meetingId);
  const signage = canSignage ? `<article class="panel panel-pad signage-control"><h4 class="panel-title">Вывески</h4><p>${roomPlayers.length ? `Выберите один экран или отправьте сцену на все экраны зала.` : "Для этого зала ещё не зарегистрирован экран. Добавьте его в SignageCore."}</p><label class="signage-target-label">Куда отправить<select id="signageTargetPlayer"><option value="">Все экраны этого зала</option>${roomPlayers.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.name || player.id)}${player.online ? " · в сети" : " · не в сети"}</option>`).join("")}</select></label><div class="action-strip compact"><button class="button button-quiet" data-action="publish-room-free" ${roomPlayers.length ? "" : "disabled"}>Зал свободен</button><button class="button button-quiet" data-action="publish-room-busy" ${roomPlayers.length ? "" : "disabled"}>Идёт заседание</button><button class="button button-secondary" data-action="call-participant" ${roomPlayers.length ? "" : "disabled"}>Вызвать участника</button></div><div class="signage-compose"><label>Контент<select id="signageSceneType"><option value="text">Текст</option><option value="schedule">Расписание</option><option value="document">Документ</option></select></label><label data-signage-text>Заголовок<input id="signageSceneTitle" maxlength="160" autocomplete="off" placeholder="Что показать на экране"></label><label data-signage-text>Текст<textarea id="signageSceneBody" rows="3" maxlength="2000" placeholder="Необязательно"></textarea></label><label data-signage-document hidden>Документ<select id="signageSceneDocument">${signageDocuments.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.fileName)}</option>`).join("")}</select></label><div class="action-strip compact"><button class="button button-secondary" data-action="publish-signage-scene" ${roomPlayers.length ? "" : "disabled"}>Отправить на экран</button><a class="button button-quiet" href="/service/?tab=signage-core" target="_blank" rel="noopener">Настроить экраны</a></div></div><p class="signage-feedback" id="signageFeedback" role="status" aria-live="polite">${escapeHtml(state.signageFeedback ?? "")}</p></article>` : "";
  const aes67Running = ["starting", "running"].includes(state.aes67?.state);
  const aes67 = canAes67 ? `<article class="panel panel-pad"><div class="list-item-head"><div><h4 class="panel-title">AES67 / RTP L24</h4><p>${escapeHtml(state.aes67?.settings?.name ?? "VOX-S Program Audio")} · ${escapeHtml(state.aes67?.settings?.bus ?? "program")} · автозапуск при старте конференции</p></div><span class="chip ${state.aes67?.state === "running" ? "" : "offline"}">${escapeHtml(state.aes67?.state ?? "stopped")}</span></div>${state.aes67?.error ? `<p class="form-error">${escapeHtml(state.aes67.error)}</p>` : ""}<div class="action-strip"><button class="button ${aes67Running ? "button-danger" : "button-secondary"}" data-action="${aes67Running ? "stop-aes67" : "start-aes67"}">${aes67Running ? "Выключить AES67" : "Включить AES67"}</button></div></article>` : "";
  return `${pageHead("Операции", "Зал, звук, вывески и сервис")}${audioConferenceHtml()}<div class="grid grid-2 operations-grid">${readiness}${signage}${aes67}${devices}${serviceCardHtml()}</div>`;
}

// Service calls card: on the Service tab and as a block of the conference workspace.
function serviceCardHtml(extraClass = "") {
  const role = state.profile.role;
  const canService = can("service.requests");
  const requestButton = !["observer", "service"].includes(role) ? `<button class="button button-primary" data-action="service-request">Вызвать персонал</button>` : "";
  const seatButton = ["delegate", "operator"].includes(role) ? `<button class="button button-secondary" data-action="change-room-seat">Изменить место</button>` : "";
  const requests = canService ? state.serviceRequests.map((request) => `<div class="list-item"><div class="list-item-head"><div><h4>${escapeHtml(request.participantName)} · ${escapeHtml(request.seatLabel)}</h4><p>${escapeHtml(requestItemsText(request))}${request.comment ? ` · ${escapeHtml(request.comment)}` : ""}</p></div><span class="chip ${["closed", "cancelled", "rejected"].includes(request.status) ? "offline" : ""}">${escapeHtml(serviceRequestStatusLabel(request.status, interfaceLocale()))}</span></div><div class="action-strip compact">${request.stationId ? `<a class="button button-quiet" href="/room-planner/?stationId=${encodeURIComponent(request.stationId)}&requestId=${encodeURIComponent(request.id)}" target="_blank" rel="noopener">На плане</a>` : ""}${request.status === "new" ? `<button class="button button-secondary" data-action="service-status" data-request-id="${request.id}" data-status="accepted">${uiText("service.accept")}</button>` : ""}${request.status === "accepted" ? `<button class="button button-secondary" data-action="service-status" data-request-id="${request.id}" data-status="in-progress">${uiText("service.start")}</button>` : ""}${request.status === "in-progress" ? `<button class="button button-secondary" data-action="service-status" data-request-id="${request.id}" data-status="delivered">${uiText("service.complete")}</button>` : ""}${request.status === "delivered" ? `<button class="button button-secondary" data-action="service-status" data-request-id="${request.id}" data-status="closed">${uiText("service.close")}</button>` : ""}</div></div>`).join("") : "";
  return `<article class="panel ${extraClass}"><div class="panel-pad"><div class="list-item-head"><div><h4 class="panel-title">${uiText("service.title")}</h4><p>${uiText("service.description")}</p></div><div class="action-strip compact">${seatButton}${requestButton}</div></div></div>${canService ? `<div class="list">${requests || `<div class="empty">${uiText("service.empty")}</div>`}</div>` : ""}</article>`;
}

function settingsHtml() {
  const canConfigureAutoDirector = can("pgm.operate");
  const canManagePin = can("conference.pin");
  const languageOptions = participantLanguageOptions().map(({ code, label }) =>
    `<option value="${code}"${interfaceLocale() === code ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
  const pinPanel = canManagePin ? `<article class="panel panel-pad settings-block"><h4 class="panel-title">ПИН конференции</h4><div class="status-row"><span>Текущий ПИН</span><code>${state.accessPin ? escapeHtml(state.accessPin) : "скрыт"}</code></div><div class="action-strip">${state.accessPin ? "" : `<button class="button button-quiet" data-action="reveal-access-pin">Показать</button>`}<button class="button button-secondary" data-action="edit-access-pin">Изменить</button></div></article>` : "";
  return `${pageHead("Настройки", "Конференция и браузер")}
    ${localAvDevicesHtml()}
    <div class="grid grid-2">
      <article class="panel panel-pad settings-block"><h4 class="panel-title">${uiText("settings.language.title")}</h4><label>${uiText("settings.language.title")}<select id="participantLanguage" aria-label="${uiText("settings.language.title")}">${languageOptions}</select></label><p>${uiText("settings.language.note")}</p></article>
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Версия сервера</h4><div class="status-row"><span>Релиз</span><code>v${escapeHtml(state.systemStatus?.version ?? "0.6.0")}</code></div><div class="status-row"><span>Build</span><code>${escapeHtml(state.systemStatus?.build ?? "0.6.0.37")}</code></div></article>
      ${pinPanel}
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Подключение</h4><div class="status-row"><span>Сервер</span><code>${escapeHtml(state.profile.serverUrl)}</code></div><div class="status-row"><span>Заседание</span><code>${escapeHtml(state.profile.meetingId)}</code></div><div class="status-row"><span>Устройство</span><code>${escapeHtml(state.profile.deviceId)}</code></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Терминал</h4><div class="status-row"><div><strong>${escapeHtml(state.profile.displayName)}</strong><br><small>${escapeHtml(state.profile.deviceId)}</small></div><span class="chip">онлайн</span></div><div class="status-row"><div><strong>Seat Lease</strong><br><small>${escapeHtml(state.leaseId)}</small></div><span>${escapeHtml(state.profile.role)}</span></div></article>
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Доверие HTTPS</h4><p>Если браузер показывает предупреждение сертификата, установите локальный корневой сертификат VOX-S на планшет.</p><a class="button button-secondary" href="/client/root-ca.cer" download>Скачать Root CA</a></article>
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Установка как приложение</h4><p>Android: установите через меню Chrome. iPad: «Поделиться» → «На экран Домой».</p><div class="action-strip"><button class="button button-quiet" data-action="install-pwa">Установить PWA</button></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Камера и микрофон на этом устройстве</h4><p>Выбор сохранится в браузере. Системное разрешение меняется в настройках устройства.</p><div class="action-strip"><button class="button button-secondary" data-action="toggle-auto-camera-pref">Камера при входе: ${localStorage.getItem(CAMERA_AUTO_KEY) === "off" ? "выкл" : "вкл"}</button><button class="button button-secondary" data-action="toggle-auto-microphone-pref">Микрофон в AudioCore при входе: ${localStorage.getItem(MICROPHONE_AUTO_KEY) === "off" ? "выкл" : "вкл"}</button></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Полноэкранный режим</h4><p>Убирает адресную строку браузера прямо во вкладке, без установки приложения.</p><button class="button button-quiet" data-action="toggle-fullscreen">${document.fullscreenElement ? "Выйти из полноэкранного" : "На весь экран"}</button></article>
      ${canConfigureAutoDirector ? `<article class="panel panel-pad"><h4 class="panel-title">Автопереключение PGM</h4><p>PGM следует за выступающим. При выключении источник выбирается вручную.</p><button class="button button-secondary" data-action="toggle-auto-director">${state.routing?.autoDirector?.enabled ? "Выключить" : "Включить"} автопереключение</button></article>` : ""}
      <article class="panel panel-pad"><h4 class="panel-title">Медиасоединение</h4><p>Звук и видео проходят через VOX-S; личные сообщения передаются отдельно.</p></article>
    </div>`;
}

// Non-WebRTC tiles (e.g. an RTSP/HLS room camera) have no MCU producer to
// compose server-side, so they keep rendering individually, same as before.
// Streams the server has as MCU producers: participants' WebRTC cameras and
// room cameras it ingested (RTSP/HLS/NDI/MJPEG). They are part of the server
// Multiview mosaic; anything else is shown as its own preview tile.

export { canEditWorkspaceLayout, handleWorkspaceUiAction, applyWorkspaceLayout, renderPage, updateNavigationVisibility, translationHtml, unreadChatCount, updateChatNotice,
  markChatRead, pageHead, VOTE_OUTCOME_LABELS, advancedBallot, updateVoteCountdowns, voteOutcomeLabel, conferenceVoteCard,
  conferenceVoteStatusCard, closeVoteResultsModal, openVoteResultsModal, microphoneIcon, renderMicrophoneDock,
  renderFixedControls, can, pgmModeHtml, hydrateSlatePreviews, uploadPgmSlate, selectPgmSlate,
  deletePgmSlate, syncSecretaryTurn, secretarySpeakersHtml, secretaryWorkspaceHtml, saveSecretaryTranscript,
  saveSecretaryEditor, clearSecretaryEditor, secretaryLayoutPanel, moveSecretaryLayoutPanel, handleSecretaryLayoutAction,
  secretaryLayoutGesture, startSecretaryLayoutGesture, moveSecretaryLayoutGesture, finishSecretaryLayoutGesture,
  conferenceHtml, audioConferenceHtml, canOperateMedia, streamLabel, actionIcon, streamStatusHtml,
  participantsAndSourcesHtml, streamsHtml, localAvDevicesHtml, absoluteMediaUrl, resumeVideoElement,
  programCaption, normalizedCaption, setMediaCaptions, mountMediaView, mountStudioMonitors, stopThumbnailLoop,
  drawThumbnails, mountStreamThumbnails, handleStreamPreviewKeydown, closeStreamPreviewModal,
  openStreamPreviewModal, mountStreamPreviewModal, mountProgram, canManageVotes, canCastVotes,
  isEligibleForVote, canViewFiles, canUploadFiles, canShareScreen, canSpeak, votingHtml, canManageContent,
  contentHtml, partnerFor, chatPartnerId, isLiveChatSession, closeChatSessionLocally, reconcileChatSessions,
  chatHtml, requestItemsText, operationsHtml, settingsHtml };
