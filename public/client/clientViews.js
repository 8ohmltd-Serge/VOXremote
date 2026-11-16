import { controlColorInk, validControlColor } from "./controlColor.js";
import {
  $, $$, sleep, SESSION_KEY, HANDOFF_KEY, AUTH_TOKEN_KEY, CAMERA_AUTO_KEY, MICROPHONE_AUTO_KEY,
  MEDIA_DEVICE_KEY, TRANSLATION_VOLUME_KEY, CLIENT_BUILD, interfaceLocale, uiText, BUILD_RELOAD_KEY,
  TECHNICAL_CONFERENCE_ROLES, CONFERENCE_ROLE_LABELS, TAB_TITLES, SECRETARY_LAYOUT_DEFAULT, TAB_ID_KEY,
  THUMBNAIL_FPS, RESOURCE_CONSTRAINED_CLIENT, THUMBNAIL_DECODE_BUDGET, PRESENCE_ID, TAB_ID, state,
  EdgeHttpError, EdgeApi, escapeHtml, formatBytes, uuid, openModal, restoreFormDrafts, formDraftKey, saveProfile, loadMediaDevicePreferences, saveMediaDevicePreferences,
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
  encodeIdentityHeader, observeBottomControls, serviceRequestCategoryLabel, serviceRequestStatusLabel, serviceRequestProgress,
  serviceRequestCategoryOptions, eventRetryDelay, PARTICIPANT_LANGUAGES, participantLanguageOptions, participantLanguage,
  setParticipantLanguage, participantText, participantFormatTime, openDocumentViewer, closeDocumentViewer, updateDocumentViewerRights,
  documentSceneEvent
} from "./app.js?v=0.8.35";

function sizeConferenceProgram() {
  const panel = document.querySelector("#pageContent .conference-program-panel");
  if (!panel || !panel.clientWidth) return;
  if (panel.closest(".workspace-grid")) return;
  const viewportLimit = Math.max(100, Math.floor((window.innerHeight - 190) / 10) * 10);
  const nearestTen = Math.max(100, Math.round(panel.clientWidth * 9 / 16 / 10) * 10);
  panel.style.height = `${Math.min(nearestTen, viewportLimit)}px`;
}
window.addEventListener("resize", sizeConferenceProgram);

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
  document.body.dataset.prestart = String(state.meeting.status === "ready");
  if (state.meeting.status === "ready" && state.activeTab !== "streams") {
    $("#meetingTitle").textContent = state.meeting.title;
    $("#meetingState").textContent = "Подготовлена";
    $("#microphoneDock").hidden = true;
    const agenda = (state.meeting.agenda ?? []).filter((item) => item.kind !== "intermission");
    const materials = (state.documents ?? []).filter((item) => item.availableImmediately === true);
    $("#pageContent").innerHTML = `<section class="panel panel-pad prestart-workspace"><h2>${escapeHtml(state.meeting.title)}</h2><p>Участники видят экран ожидания и подключатся автоматически после запуска.</p><section class="waiting-section" aria-label="План мероприятия"><h3>План мероприятия</h3>${agenda.length ? `<ol>${agenda.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("")}</ol>` : `<p class="waiting-empty">Вопросы повестки пока не добавлены.</p>`}</section><section class="waiting-section" aria-label="Материалы для просмотра"><h3>Материалы для просмотра</h3>${materials.length ? materials.map((item) => `<button class="waiting-material" data-action="download-document" data-document-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.fileName)}</span><span>Открыть</span></button>`).join("") : `<p class="waiting-empty">Доступных до начала материалов пока нет.</p>`}</section>${ucControlHtml(true)}<div class="conference-agenda-actions">${["operator", "secretary", "admin"].includes(state.profile.role) && can("conference.lifecycle") ? `<button class="button button-primary" data-action="start-conference">Начать конференцию</button>` : ""}</div></section>`;
    return;
  }
  const secretaryLayoutButton = $("#secretaryLayoutBtn");
  const secretaryLayoutActions = $("#secretaryLayoutActions");
  const editableWorkspace = (state.activeTab === "conference" ||
    (state.activeTab === "translation" && ["interpreter", "translator"].includes(state.profile.role))) && canEditWorkspaceLayout();
  if (secretaryLayoutButton) secretaryLayoutButton.hidden = !editableWorkspace || Boolean(state.secretaryLayoutDraft);
  if (secretaryLayoutButton && ["interpreter", "translator"].includes(state.profile.role)) secretaryLayoutButton.title = "Настроить рабочее место переводчика";
  if (secretaryLayoutActions) secretaryLayoutActions.hidden = !editableWorkspace || !state.secretaryLayoutDraft;
  renderMicrophoneDock();
  if (state.meeting.status === "ready") $("#microphoneDock").hidden = true;
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
  for (const video of page.querySelectorAll("[data-room-control-viewer]")) {
    video._controlHls?.destroy();
    video._controlRtc?.close();
    video.srcObject = null;
  }
  if (state.activeTab !== "roomcontrol") {
    clearInterval(controlViewerRefreshTimer);
    controlViewerRefreshTimer = null;
  }
  const focusedDraft = formDraftKey(document.activeElement);
  const draftFocus = focusedDraft ? { key: focusedDraft,
    start: document.activeElement.selectionStart ?? null, end: document.activeElement.selectionEnd ?? null } : null;
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
  if (state.activeTab === "operations") {
    page.innerHTML = operationsHtml();
    updateSignagePreviews();
    page.querySelector("#signageDocumentUpload")?.addEventListener("change", (event) => {
      const file = event.currentTarget.files?.[0];
      if (file) void runAction(async () => {
        const uploaded = await uploadDocument(file);
        state.signageForm.type = "document";
        state.signageForm.documentId = uploaded.id;
      }, "Документ загружен и готов к отправке на экран");
    });
  }
  if (state.activeTab === "roomcontrol") {
    page.innerHTML = roomControlHtml();
    void mountRoomControlViewers();
  }
  if (state.activeTab === "settings") page.innerHTML = settingsHtml();
  restoreFormDrafts(page, draftFocus);
  const addMenu = $("#workspaceAddMenu");
  for (const field of $$("#secretaryLayoutActions [data-layout-font]")) {
    field.value = String(state.secretaryLayoutDraft?.[field.dataset.layoutFont] ?? (field.dataset.layoutFont === "bodyFontSize" ? 14 : 18));
  }
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
  if (state.activeTab === "conference") requestAnimationFrame(sizeConferenceProgram);
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
  refreshVoteResultsModal();
}

function hasConferenceInterpreter() {
  const assignedRole = (person) => ["interpreter", "translator"].includes(person?.role) && !person.excludedAt;
  return (state.meeting?.preparedParticipants ?? []).some(assignedRole) ||
    Object.values(state.meeting?.participants ?? {}).some(assignedRole);
}

function productModuleEnabled(name) {
  const status = state.productLicense;
  if (!status || status.state !== "valid" && status.enforcement !== "enforce") return true;
  if (status.simulationDisabled?.includes(name)) return false;
  const value = status.entitlements?.[name];
  return value === true || Boolean(value && value.enabled !== false);
}

function updateNavigationVisibility() {
  const interpreterRole = ["interpreter", "translator"].includes(state.profile.role);
  const visibility = {
    conference: !interpreterRole,
    streams: !interpreterRole,
    voting: productModuleEnabled("voteCore") && !interpreterRole && (state.votes.length > 0 || can("votes.manage")),
    translation: interpreterRole || productModuleEnabled("translateCore") && Boolean(state.translateStatus?.licensed && hasConferenceInterpreter()),
    roomcontrol: productModuleEnabled("controlCore") && can("control.room.operate") && Boolean(state.roomControl),
    content: productModuleEnabled("documentCore") && (state.documents.length > 0 || state.presentations.length > 0 ||
      canUploadFiles() || can("documents.upload") || can("presentations.control"))
  };
  for (const [tab, shown] of Object.entries(visibility)) {
    $$(`.nav-item[data-tab="${tab}"]`).forEach((button) => { button.hidden = !shown; });
    if (!shown && state.activeTab === tab) selectTab(interpreterRole ? "translation" : "conference").catch(() => {});
  }
  const remoteParticipant = state.profile?.remote === true;
  $$(".nav-item[data-tab='operations']").forEach((button) => { button.hidden = interpreterRole || remoteParticipant; });
  $$(".nav-item[data-tab='translation']").forEach((button) => {
    const label = button.querySelector("span:last-child");
    if (interpreterRole && label) label.textContent = button.closest("#mobileNav") ? "Перевод" : "Рабочее место";
  });
}

// Same border contract as the designer and /control-panel/: a state field overrides the element field,
// an unset one inherits it; "double" needs at least 3 px, "none" draws no border.
const ROOM_CONTROL_BORDER_STYLES = new Set(["solid", "double", "dashed", "dotted", "none"]);
function roomControlBorderVars(item, selected = null) {
  const pick = (key) => selected?.[key] ?? item[key];
  const color = validControlColor(pick("borderColor")) ? pick("borderColor") : "var(--vx-line,#d9d3cc)";
  const radius = Number.isInteger(pick("borderRadius")) && pick("borderRadius") >= 0 && pick("borderRadius") <= 32 ? pick("borderRadius") : 8;
  const kind = ROOM_CONTROL_BORDER_STYLES.has(pick("borderStyle")) ? pick("borderStyle") : "solid";
  const width = Number.isInteger(pick("borderWidth")) && pick("borderWidth") >= 0 && pick("borderWidth") <= 12 ? pick("borderWidth") : 1;
  const invisible = kind === "none" || width === 0 || validControlColor(color) && color.slice(7).toUpperCase() === "00";
  return `--control-border:${invisible ? "transparent" : color};--control-radius:${radius}px;` +
    `--control-border-style:${invisible ? "none" : kind};--control-border-width:${invisible ? 0 : kind === "double" ? Math.max(3, width) : width}px;`;
}
function roomControlEffectiveItem(project, item) {
  const override = project.overrides?.[item.id];
  if (!override) return item;
  return { ...item, ...(override.base ?? {}), ...(item.states ? { states: item.states.map((entry, index) => ({
    ...entry, ...(override.allStates ?? {}), ...(override.states?.[index] ?? {}) })) } : {}) };
}
function roomControlText(project, item, value, selected = null) {
  const runtime = project.labels?.[item.id];
  const template = String(runtime ?? selected?.label ?? item.label ?? "");
  return template.includes("{{value}}") ? template.replaceAll("{{value}}", value == null ? "" : String(value)) : template;
}
// Text and icon are placed like the panel designer places them: each on its own
// anchor inside the tile, or the icon in the text's flow when it goes "before the text".
function roomControlPlace(item, prefix) {
  const number = (key, low, high) => { const value = Number(item[`${prefix}${key}`]);
    return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : 0; };
  if (item[`${prefix}AlignMode`] === "absolute") {
    return `position:absolute;left:${number("OffsetX", 0, 100)}%;top:${number("OffsetY", 0, 100)}%;right:auto;bottom:auto;transform:none;`;
  }
  const x = ["left", "center", "right"].includes(item[`${prefix}AlignX`]) ? item[`${prefix}AlignX`] : "center";
  const y = ["top", "center", "bottom"].includes(item[`${prefix}AlignY`]) ? item[`${prefix}AlignY`] : "center";
  const left = number("PaddingLeft", 0, 50), right = number("PaddingRight", 0, 50);
  const top = number("PaddingTop", 0, 50), bottom = number("PaddingBottom", 0, 50);
  return `position:absolute;left:${x === "left" ? `${left}%` : x === "right" ? "auto" : `${50 + (left - right) / 2}%`};` +
    `right:${x === "right" ? `${right}%` : "auto"};` +
    `top:${y === "top" ? `${top}%` : y === "bottom" ? "auto" : `${50 + (top - bottom) / 2}%`};` +
    `bottom:${y === "bottom" ? `${bottom}%` : "auto"};max-width:${100 - left - right}%;max-height:${100 - top - bottom}%;` +
    `text-align:${x};transform:translate(${x === "center" ? "-50%" : "0"},${y === "center" ? "-50%" : "0"});`;
}
// "Касание на заливке": a fully transparent fill passes the touch to the element below.
function roomControlTransparentFill(color) {
  return !validControlColor(color) || color.length === 9 && color.slice(7).toLowerCase() === "00";
}
function roomControlIconSize(item) {
  return Number.isInteger(item.imageSize) && item.imageSize > 0 && item.imageSize <= 100
    ? `width:auto;height:${item.imageSize}%;max-width:100%;max-height:none;` : "";
}
function roomControlTextEffect(item, selected = null) {
  const effect = selected?.textEffect ?? item.textEffect ?? "none";
  const color = validControlColor(selected?.textEffectColor ?? item.textEffectColor)
    ? selected?.textEffectColor ?? item.textEffectColor : "#000000B3";
  return effect === "shadow" ? `text-shadow:0 2px 4px ${color};`
    : effect === "outline" ? `text-shadow:-1px -1px 0 ${color},1px -1px 0 ${color},-1px 1px 0 ${color},1px 1px 0 ${color};`
      : effect === "glow" ? `text-shadow:0 0 6px ${color},0 0 12px ${color};` : "";
}

function roomControlCompound(item, value) {
  const entries = item.type === "keypad" ? item.keys ?? [] : item.buttons ?? [];
  const columns = item.type === "keypad" ? item.keypadColumns ?? 3 :
    item.upDownLayout === "vertical" ? 1 : entries.length;
  const buttons = entries.map((entry) => {
    const enabled = Boolean(value && typeof value === "object" && value[entry.id]);
    const state = item.states?.[Number(enabled)] ?? {};
    const icon = /^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(entry.icon ?? "")
      ? `<img src="${escapeHtml(entry.icon)}" alt="">` : "";
    const color = validControlColor(state.color) ? state.color : "#eee";
    const ink = validControlColor(state.fontColor) ? state.fontColor : "#111";
    return `<button type="button" data-room-control-sub="${escapeHtml(item.id)}" data-sub-id="${escapeHtml(entry.id)}"
      aria-label="${escapeHtml(`${item.label || item.id}: ${entry.label}`)}" aria-pressed="${enabled}"
      style="background:${color};color:${ink}">${icon}<span>${escapeHtml(entry.label)}</span></button>`;
  }).join("");
  return `<div class="room-control-compound" style="grid-template-columns:repeat(${columns},minmax(0,1fr))" data-compound-id="${escapeHtml(item.id)}">${buttons}</div>`;
}

function roomControlSpecial(item, value) {
  if (item.type === "circular-level") {
    const min = Number(item.min) || 0, max = Number(item.max) || 100;
    const current = Number.isFinite(Number(value)) ? Number(value) : min;
    const degrees = Math.max(0, Math.min(360, (current - min) / (max - min) * 360));
    const fill = validControlColor(item.levelFillColor) ? item.levelFillColor : "#ED3229";
    const empty = validControlColor(item.levelEmptyColor) ? item.levelEmptyColor : "#D9D3CC";
    const background = validControlColor(item.levelBackgroundColor) ? item.levelBackgroundColor : "#FFFFFF";
    const gradient = item.fillDirection === "counterclockwise"
      ? `conic-gradient(${empty} ${360 - degrees}deg,${fill} 0)`
      : `conic-gradient(${fill} ${degrees}deg,${empty} 0)`;
    return `<div class="room-control-circular" data-room-control-circular="${escapeHtml(item.id)}" role="slider" tabindex="0" aria-label="${escapeHtml(item.label || item.id)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${current}" style="background:${gradient};--level-hole:${Math.max(28, 100 - (item.levelTrackWidth ?? 8) * 2)}%;--level-background:${background}"><span class="room-control-circular-center"><span>${escapeHtml(item.label)}</span><output>${current}</output></span></div>`;
  }
  if (item.type !== "dpad") return "";
  const mode = ["4", "8", "joystick"].includes(item.dpadMode) ? item.dpadMode : "4";
  const colors = `--dpad-background:${validControlColor(item.dpadBackgroundColor) ? item.dpadBackgroundColor : "transparent"};--dpad-button:${validControlColor(item.dpadButtonColor) ? item.dpadButtonColor : "#111"};--dpad-button-hover:${validControlColor(item.dpadButtonHoverColor) ? item.dpadButtonHoverColor : "#ED3229"}`;
  if (mode === "joystick") return `<div class="room-control-dpad mode-joystick" data-room-control-dpad="${escapeHtml(item.id)}" style="${colors}"><button type="button" class="room-control-stick knob-${escapeHtml(item.joystickKnob ?? "round")}" data-room-control-direction="joystick" aria-label="${escapeHtml(item.label || "Джойстик")}"><span></span></button></div>`;
  const directions = mode === "8" ? ["up-left", "up", "up-right", "left", "home", "right", "down-left", "down", "down-right"] : ["up", "left", "home", "right", "down"];
  const glyphs = { up:"↑", down:"↓", left:"←", right:"→", home:"⌂", "up-left":"↖", "up-right":"↗", "down-left":"↙", "down-right":"↘" };
  return `<div class="room-control-dpad mode-${mode}" data-room-control-dpad="${escapeHtml(item.id)}" style="${colors}">${directions.map((direction) => `<button type="button" data-room-control-direction="${direction}" aria-label="${direction}">${glyphs[direction]}</button>`).join("")}</div>`;
}

export function roomControlHtml() {
  const project = state.roomControl;
  if (!project) return `${pageHead("Управление залом", "Для этого зала нет опубликованной панели")}`;
  const pages = project.panel.pages ?? [{ id: "main", title: "Главная" }];
  const selectedPage = pages.find((page) => page.id === state.roomControlPageId) ?? pages[0];
  const popupPage = pages.find((page) => page.id === state.roomControlPopupId && page.type === "popup");
  const controls = project.panel.controls.filter((item) => (item.pageId ?? "main") === selectedPage.id)
    .map((item, index) => {
    item = roomControlEffectiveItem(project, item);
    const value = project.state?.[item.stateKey];
    const layout = item.layout ?? { x: 0, y: index, w: 6, h: 1 };
    const geometry = [layout.x, layout.y, layout.w, layout.h].every(Number.isInteger) &&
      layout.x >= 0 && layout.y >= 0 && layout.w > 0 && layout.h > 0 && layout.x + layout.w <= 100 && layout.y + layout.h <= 100
      ? ` style="left:${layout.x}%;top:${layout.y}%;width:${layout.w}%;height:${layout.h}%;z-index:${Number.isInteger(item.z) ? item.z : 0};${roomControlBorderVars(item)}${validControlColor(item.fontColor) ? `color:${item.fontColor};` : ""}${Number.isInteger(item.fontSize) ? `font-size:${item.fontSize}px;` : ""}"` : "";
    const selectedState = item.states?.find((entry) => entry.value === value ||
      typeof value === "boolean" && typeof entry.value === "number" && entry.value === Number(value));
    const iconSource = selectedState?.icon || item.icon;
    const textAlignX = ["left", "center", "right"].includes(item.textAlignX) ? item.textAlignX : "center";
    const textAlignY = ["top", "center", "bottom"].includes(item.textAlignY) ? item.textAlignY : "center";
    const imageAlignX = ["left", "center", "right"].includes(item.imageAlignX) ? item.imageAlignX : "center";
    const imageAlignY = ["top", "center", "bottom"].includes(item.imageAlignY) ? item.imageAlignY : "center";
    const textPlacement = `text-align:${textAlignX};justify-content:${textAlignX === "left" ? "flex-start" : textAlignX === "right" ? "flex-end" : "center"};align-items:${textAlignY === "top" ? "flex-start" : textAlignY === "bottom" ? "flex-end" : "center"};`;
    const imagePlacement = `object-position:${imageAlignX} ${imageAlignY};align-self:${imageAlignY === "top" ? "flex-start" : imageAlignY === "bottom" ? "flex-end" : "center"};${imageAlignX === "left" ? "margin-right:auto;" : imageAlignX === "right" ? "margin-left:auto;" : "margin-left:auto;margin-right:auto;"}`;
    const icon = /^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(iconSource ?? "")
      ? `<img class="room-control-icon" style="${imagePlacement}" src="${escapeHtml(iconSource)}" alt="">` : "";
    // Labels and buttons: the designer's own placement (see roomControlPlace).
    const inFlow = item.imageAlignMode === "before-text";
    const placed = (text) => {
      // A state icon can appear later (roomControlEvents paints it): keep its placed, hidden slot.
      const image = icon || item.states?.some((entry) => entry.icon) || item.hover?.icon
        ? `<img class="room-control-icon" style="${inFlow ? "" : roomControlPlace(item, "image")}${roomControlIconSize(item)}"${icon ? ` src="${escapeHtml(iconSource)}"` : " hidden"} alt="">` : "";
      return `${image}<span${inFlow ? "" : ` style="${roomControlPlace(item, "text")}"`}>${escapeHtml(text)}</span>`;
    };
    const flowClass = inFlow ? " is-flow" : " is-placed";
    const background = validControlColor(item.backgroundColor) ? item.backgroundColor : null;
    const passiveStyle = `${textPlacement}${background ? `background-color:${background};` : ""}${roomControlTextEffect(item)}`;
    if (item.type === "label") return `<div class="room-control-tile room-control-passive"${geometry}><div class="room-control-content${flowClass}" style="${passiveStyle}">${placed(roomControlText(project, item, value))}</div></div>`;
    if (item.type === "image") return `<div class="room-control-tile room-control-passive"${geometry}><div class="room-control-content" style="${passiveStyle}">${icon || escapeHtml(item.label)}</div></div>`;
    if (item.type === "viewer") return `<div class="room-control-tile room-control-viewer"${geometry}><video data-room-control-viewer="${escapeHtml(item.id)}" muted autoplay playsinline aria-label="${escapeHtml(item.label)}"></video><span>${escapeHtml(item.label)}</span></div>`;
    if (item.type === "text-input") return `<div class="room-control-tile"${geometry}><input class="room-control-text-input" data-room-control-text="${escapeHtml(item.id)}" type="text" value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(item.placeholder ?? "")}" aria-label="${escapeHtml(item.label || item.id)}"></div>`;
    const tileMin = Number.isFinite(Number(item.min)) ? Number(item.min) : 0;
    const tileMax = Number.isFinite(Number(item.max)) ? Number(item.max) : 100;
    if (item.type === "slider") return `<div class="room-control-tile"${geometry}><label class="room-control-slider orientation-${escapeHtml(item.orientation ?? "horizontal")}" style="--level-fill:${validControlColor(item.levelFillColor) ? item.levelFillColor : "#ED3229"};--level-empty:${validControlColor(item.levelEmptyColor) ? item.levelEmptyColor : "#D9D3CC"};--level-width:${item.levelTrackWidth ?? 8}px;--level-control-length:${item.levelControlSize ?? 100}%;--level-background:${validControlColor(item.levelBackgroundColor) ? item.levelBackgroundColor : "#fff"}">${icon}<span>${escapeHtml(item.label)}</span><input type="range" class="knob-${escapeHtml(item.levelKnob ?? "round")}" min="${tileMin}" max="${tileMax}" value="${Number.isFinite(value) ? value : tileMin}" data-room-control-slider="${escapeHtml(item.id)}"><output>${Number.isFinite(value) ? value : tileMin}</output></label></div>`;
    if (["circular-level", "dpad"].includes(item.type)) return `<div class="room-control-tile"${geometry}>${roomControlSpecial(item, value)}</div>`;
    if (["keypad", "updown"].includes(item.type)) return `<div class="room-control-tile"${geometry}>${roomControlCompound(item, value)}</div>`;
    const detail = !selectedState && item.type === "multistate" ? "Состояние неизвестно" : "";
    const color = validControlColor(selectedState?.color) ? selectedState.color : null;
    const fontColor = validControlColor(selectedState?.fontColor) ? selectedState.fontColor : item.fontColor;
    const fontSize = Number.isInteger(selectedState?.fontSize) ? selectedState.fontSize : item.fontSize;
    const style = [color ? `--control-state-color:${color}` : "", textPlacement, roomControlBorderVars(item, selectedState),
      validControlColor(fontColor) ? `--control-state-ink:${fontColor}` : color ? `--control-state-ink:${controlColorInk(color)}` : "",
      Number.isInteger(fontSize) ? `font-size:${fontSize}px` : "", roomControlTextEffect(item, selectedState)].filter(Boolean).join(";");
    const passFill = item.hit === "touch-on-fill" && roomControlTransparentFill(selectedState?.color);
    return `<div class="room-control-tile${passFill ? " fill-passthrough" : ""}"${geometry}><button type="button" class="room-control-button${flowClass}" data-room-control-button="${escapeHtml(item.id)}" data-hit="${escapeHtml(item.hit ?? "bounding-box")}" aria-pressed="${Boolean(value)}"${style ? ` style="${style}"` : ""}>${placed(roomControlText(project, item, value, selectedState))}${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</button></div>`;
  }).join("");
  const percent = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback;
  const popupControls = popupPage ? project.panel.controls.filter((item) => item.pageId === popupPage.id).map((item, index) => {
    item = roomControlEffectiveItem(project, item);
    const rawLayout = item.layout ?? {};
    const layout = { x: percent(rawLayout.x, 0), y: percent(rawLayout.y, (index * 12) % 100),
      w: percent(rawLayout.w, 50), h: percent(rawLayout.h, 12) };
    const sliderMin = Number.isFinite(Number(item.min)) ? Number(item.min) : 0;
    const sliderMax = Number.isFinite(Number(item.max)) ? Number(item.max) : 100;
    const textX = ["left", "center", "right"].includes(item.textAlignX) ? item.textAlignX : "center";
    const textY = ["top", "center", "bottom"].includes(item.textAlignY) ? item.textAlignY : "center";
    const imageX = ["left", "center", "right"].includes(item.imageAlignX) ? item.imageAlignX : "center";
    const imageY = ["top", "center", "bottom"].includes(item.imageAlignY) ? item.imageAlignY : "center";
    const justify = textX === "left" ? "flex-start" : textX === "right" ? "flex-end" : "center";
    const align = textY === "top" ? "flex-start" : textY === "bottom" ? "flex-end" : "center";
    const popupState = item.states?.find((entry) => entry.value === project.state?.[item.stateKey]);
    const style = `left:${layout.x}%;top:${layout.y}%;width:${layout.w}%;height:${layout.h}%;z-index:${Number.isInteger(item.z) ? item.z : 0};${roomControlBorderVars(item, popupState)}`;
    if (item.type === "label") {
      const icon = /^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(item.icon ?? "")
        ? `<img src="${escapeHtml(item.icon)}" alt="">` : "";
      return `<div class="room-control-popup-item" style="${style}display:flex;text-align:${textX};justify-content:${justify};align-items:${align};${roomControlTextEffect(item)}">${icon}<span>${escapeHtml(roomControlText(project, item, project.state?.[item.stateKey]))}</span></div>`;
    }
    if (item.type === "image") {
      const image = /^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(item.icon ?? "")
        ? `<img style="object-position:${imageX} ${imageY};align-self:${imageY === "top" ? "flex-start" : imageY === "bottom" ? "flex-end" : "center"};${imageX === "left" ? "margin-right:auto;" : imageX === "right" ? "margin-left:auto;" : "margin-left:auto;margin-right:auto;"}" src="${escapeHtml(item.icon)}" alt="${escapeHtml(item.label)}">` : escapeHtml(item.label);
      return `<div class="room-control-popup-item" style="${style}display:flex;justify-content:${justify};align-items:${align};">${image}</div>`;
    }
    if (item.type === "viewer") return `<div class="room-control-popup-item" style="${style}"><video data-room-control-viewer="${escapeHtml(item.id)}" muted autoplay playsinline aria-label="${escapeHtml(item.label)}"></video></div>`;
    if (item.type === "text-input") return `<div class="room-control-popup-item" style="${style};padding:0"><input class="room-control-text-input" data-room-control-text="${escapeHtml(item.id)}" type="text" value="${escapeHtml(project.state?.[item.stateKey] ?? "")}" placeholder="${escapeHtml(item.placeholder ?? "")}" aria-label="${escapeHtml(item.label || item.id)}"></div>`;
    if (item.type === "slider") return `<label class="room-control-popup-item" style="${style}">${escapeHtml(item.label)}<input type="range" min="${sliderMin}" max="${sliderMax}" value="${Number.isFinite(project.state?.[item.stateKey]) ? project.state[item.stateKey] : sliderMin}" data-room-control-slider="${escapeHtml(item.id)}"></label>`;
    if (["circular-level", "dpad"].includes(item.type)) return `<div class="room-control-popup-item" style="${style};padding:0">${roomControlSpecial(item, project.state?.[item.stateKey])}</div>`;
    if (["keypad", "updown"].includes(item.type)) return `<div class="room-control-popup-item" style="${style};padding:0">${roomControlCompound(item, project.state?.[item.stateKey])}</div>`;
    const selected = item.states?.find((entry) => entry.value === project.state?.[item.stateKey]);
    const color = validControlColor(selected?.color) ? selected.color : "";
    const ink = validControlColor(selected?.fontColor) ? selected.fontColor : item.fontColor;
    return `<button type="button" class="room-control-popup-item" style="${style}text-align:${textX};justify-content:${justify};align-items:${align};${color ? `background:${color};` : ""}${validControlColor(ink) ? `color:${ink};` : ""}${roomControlTextEffect(item, selected)}" data-room-control-button="${escapeHtml(item.id)}" data-hit="${escapeHtml(item.hit ?? "bounding-box")}" aria-pressed="${Boolean(project.state?.[item.stateKey])}">${escapeHtml(roomControlText(project, item, project.state?.[item.stateKey], selected))}</button>`;
  }).join("") : "";
  const popupBackground = popupPage?.background?.type === "image" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(popupPage.background?.image ?? "")
    ? `background-image:url("${popupPage.background.image}");background-position:center;background-size:cover;`
    : popupPage?.background?.type === "gradient"
      ? `background:linear-gradient(135deg,${validControlColor(popupPage.background.color) ? popupPage.background.color : "#fff"},${validControlColor(popupPage.background.colorEnd) ? popupPage.background.colorEnd : "#fff"});`
      : `background:${validControlColor(popupPage?.background?.color) ? popupPage.background.color : "#fff"};`;
  const popup = popupPage ? `<div class="room-control-popup-backdrop"><section class="room-control-popup" role="dialog" aria-modal="true" aria-label="${escapeHtml(popupPage.title)}" style="border-color:${validControlColor(popupPage.borderColor) ? popupPage.borderColor : "var(--vx-line,#d9d3cc)"};border-radius:${Number.isInteger(popupPage.borderRadius) && popupPage.borderRadius >= 0 && popupPage.borderRadius <= 32 ? popupPage.borderRadius : 12}px"><button type="button" class="room-control-popup-close" data-room-control-popup-close="${escapeHtml(popupPage.id)}" autofocus>Закрыть</button><div class="room-control-popup-canvas" style="${popupBackground}">${popupControls}</div></section></div>` : "";
  return `${pageHead("Управление залом", `${escapeHtml(project.panel.title)} · версия ${project.version}`)}<article class="panel panel-pad"><h4 class="panel-title">${escapeHtml(selectedPage.title)}</h4><div class="room-control-actions is-layout" style="--control-columns:${project.panel.grid?.columns ?? 12}">${controls}</div><p class="room-control-feedback" role="status" aria-live="polite"></p></article>${popup}`;
}

let controlViewerRefreshTimer = null;
async function mountRoomControlWebrtc(video, route) {
  const signal = (op, body = {}) => state.api.post(`${route}/webrtc`, { op, ...body });
  const { rtpCapabilities } = await signal("capabilities");
  const device = new globalThis.mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: rtpCapabilities });
  const params = await signal("transport");
  const transport = device.createRecvTransport(params);
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    signal("connect", { transportId: params.id, dtlsParameters }).then(callback, errback);
  });
  try {
    const consumer = await signal("consume", { transportId: params.id, rtpCapabilities: device.rtpCapabilities });
    const track = (await transport.consume({ id: consumer.id, producerId: consumer.producerId,
      kind: consumer.kind, rtpParameters: consumer.rtpParameters })).track;
    video._controlHls?.destroy();
    video._controlHls = null;
    video.removeAttribute("src");
    video.srcObject = new MediaStream([track]);
    await signal("resume", { transportId: params.id, consumerId: consumer.id });
    await video.play().catch(() => {});
    video._controlRtc = transport;
    transport.on("connectionstatechange", (status) => {
      if (video._controlRtc === transport && ["failed", "closed", "disconnected"].includes(status)) {
        transport.close();
        video._controlRtc = null;
      }
    });
  } catch (error) {
    transport.close();
    video.srcObject = null;
    throw error;
  }
}
async function mountRoomControlViewers() {
  clearInterval(controlViewerRefreshTimer);
  const refresh = async () => {
    if (state.activeTab !== "roomcontrol" || !state.profile?.meetingId) return;
    for (const video of document.querySelectorAll("[data-room-control-viewer]")) {
      try {
        const meetingId = encodeURIComponent(state.profile.meetingId);
        const controlId = encodeURIComponent(video.dataset.roomControlViewer);
        const route = `/control-core/meetings/${meetingId}/viewers/${controlId}`;
        const stream = await state.api.post(route, {});
        if (stream.webrtc && globalThis.mediasoupClient && !video._controlRtc &&
            (!video.dataset.controlWebrtcFailedAt || Date.now() - Number(video.dataset.controlWebrtcFailedAt) >= 30_000)) {
          try {
            await mountRoomControlWebrtc(video, route);
            delete video.dataset.controlWebrtcFailedAt;
            continue;
          } catch {
            video.dataset.controlWebrtcFailedAt = String(Date.now());
          }
        }
        if (!stream.playlistUrl && stream.hlsPending) continue;
        if (!video.isConnected || video.dataset.playlist === stream.playlistUrl) continue;
        video.dataset.playlist = stream.playlistUrl;
        if (globalThis.Hls?.isSupported()) {
          const hls = new globalThis.Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(stream.playlistUrl);
          hls.attachMedia(video);
          video._controlHls = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = stream.playlistUrl;
      } catch (error) {
        const feedback = document.querySelector(".room-control-feedback");
        if (feedback) feedback.textContent = `Видео: ${error.message}`;
      }
    }
  };
  await refresh();
  controlViewerRefreshTimer = setInterval(refresh, 20_000);
}

function translationHtml() {
  const interpreterRole = ["interpreter", "translator"].includes(state.profile.role);
  if (interpreterRole && !productModuleEnabled("translateCore")) {
    return `${cameraSetupNoticeHtml()}${pageHead("Рабочее место переводчика", "Синхронный перевод недоступен")}
      <article class="panel panel-pad"><h4 class="panel-title">Модуль перевода не включён</h4>
      <p class="empty">Эта установка VOX-S не лицензирована для синхронного перевода. Обратитесь к администратору.</p></article>`;
  }
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
    const gridMode = workspaceGridMode(layout);
    interpreter = `<section class="translation-workplace"><div class="status-row"><h3 class="panel-title">Рабочее место переводчика</h3><span class="chip ${assignment?.status === "on-air" && !assignment.cough && !assignment.talkback ? "translation-live" : ""}" role="status">${assignment?.talkback ? "Служебная связь" : assignment?.cough ? "Микрофон заглушен" : assignment?.status === "on-air" ? "● В эфире" : assignment ? "Готов" : "Ожидание назначения"}</span></div>
      ${agendaTitle ? `<p class="translation-agenda"><span>Текущая тема</span><strong>${escapeHtml(agendaTitle)}</strong></p>` : ""}
      <div class="workspace-area"><div class="secretary-layout-grid workspace-grid translation-workplace-grid${gridMode === "percent" ? " is-percent-grid" : gridMode === "pixel" ? " is-pixel-grid" : ""}${state.secretaryLayoutDraft ? " is-editing" : ""}" style="grid-auto-rows:${WORKSPACE_ROW}px;column-gap:${gridMode === "span" ? WORKSPACE_GAP : 0}px;--workspace-body-font-size:${layout.bodyFontSize ?? 14}px;--workspace-title-font-size:${layout.titleFontSize ?? 18}px">${layout.order.map((id) => secretaryLayoutPanel(id, interpreterPanels[id])).join("")}</div></div></section>`;
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
  if (!vote.ballotType || vote.ballotType === "single") return "";
  const name = `ballot-${vote.id}`;
  const fields = vote.options.map((option, index) => {
    if (vote.ballotType === "cumulative") return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="number" min="0" max="${vote.ballotConfig?.points ?? 10}" value="0" data-ballot-allocation="${escapeHtml(option.id)}" aria-label="Баллы: ${escapeHtml(option.label)}"></label>`;
    if (vote.ballotType === "ranked") return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="number" min="0" max="${vote.options.length}" value="${index + 1}" data-ballot-rank="${escapeHtml(option.id)}" aria-label="Место в рейтинге: ${escapeHtml(option.label)}"></label>`;
    const attribute = vote.ballotType === "veto" ? "data-ballot-veto" : "data-ballot-approval";
    return `<label class="option-row"><span>${escapeHtml(option.label)}</span><input type="checkbox" ${attribute}="${escapeHtml(option.id)}"></label>`;
  }).join("");
  return `<div class="advanced-ballot" data-ballot-vote="${escapeHtml(vote.id)}" role="group" aria-label="Бюллетень"><p class="advanced-ballot-hint">${vote.ballotType === "ranked" ? "Укажите порядок предпочтения" : vote.ballotType === "cumulative" ? "Распределите баллы между вариантами" : "Отметьте подходящие варианты"}</p>${fields}<button class="button button-primary" data-action="cast-advanced-vote" data-vote-id="${escapeHtml(vote.id)}">Отправить бюллетень</button></div>`;
}

const VOTE_MODE_LABELS = { named: "Открытое (поимённое)", anonymous: "Тайное", secret: "Тайное" };
const VOTE_STATUS_LABELS = { draft: "Подготовка", open: "Идёт голосование", closed: "Завершено" };
const VOTE_RULE_LABELS = { "standard-majority": "Обычное большинство", "supermajority-two-thirds": "Квалифицированное большинство 2/3",
  "double-majority": "Двойное большинство", "cumulative-board": "Кумулятивное", "ranked-choice-irv": "Рейтинговое с выбыванием",
  "stv-droop": "Пропорциональное по квоте Друпа", "veto-consensus": "Вето" };
function voteTimer(vote, remaining) {
  return remaining === null ? "" : `<strong class="vote-timer" role="timer" data-vote-countdown="${escapeHtml(vote.closesAt)}" aria-label="Осталось времени"><small>Осталось</small><span>${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}</span></strong>`;
}
// At 0:00 the ballot stops accepting input at once; the server closes the
// vote, so a click would only return an error until the next refresh (A-37).
function updateVoteCountdowns() {
  let expired = false;
  document.querySelectorAll("[data-vote-countdown]").forEach((timer) => {
    const seconds = Math.max(0, Math.ceil((Date.parse(timer.dataset.voteCountdown) - Date.now()) / 1000));
    const label = timer.querySelector("span");
    if (label) label.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    if (seconds > 0 || timer.dataset.expired) return;
    timer.dataset.expired = "1";
    expired = true;
    const card = timer.closest(".vote-detail, .vote-card");
    card?.querySelectorAll('[data-action="cast-vote"], [data-action="cast-advanced-vote"], [data-ballot-vote] input')
      .forEach((control) => { control.disabled = true; });
    if (label) label.textContent = "Время вышло";
  });
  if (expired) setTimeout(() => refreshAll(true), 1500);
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
    const canChoose = (!vote.ballotType || vote.ballotType === "single") && vote.status === "open" && isEligibleForVote(vote) && !selectedOptionId && !vote.hasVoted;
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
  fullscreen: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
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

let voteResultsModal = null;
function closeVoteResultsModal() {
  const modal = voteResultsModal;
  voteResultsModal = null;
  modal?.release();
  document.querySelector(".vote-results-backdrop")?.remove();
}

// The open results window follows live counts instead of freezing at opening.
function refreshVoteResultsModal() {
  if (!voteResultsModal) return;
  const vote = state.votes.find((item) => item.id === voteResultsModal.voteId);
  const dialog = document.querySelector(".vote-results-dialog");
  if (!vote || !dialog) return;
  const label = dialog.querySelector(".vote-results-head .vote-status-label");
  if (label) label.textContent = voteOutcomeLabel(vote);
  const scroll = dialog.querySelector(".vote-results-scroll");
  const html = conferenceVoteCard(vote, "Результаты голосования");
  if (scroll && scroll.dataset.html !== html) { scroll.innerHTML = html; scroll.dataset.html = html; }
}

function openVoteResultsModal(voteId) {
  const vote = state.votes.find((item) => item.id === voteId);
  if (!vote) return;
  closeVoteResultsModal();
  const backdrop = document.createElement("div");
  backdrop.className = "form-dialog-backdrop vote-results-backdrop";
  backdrop.innerHTML = `<section class="form-dialog vote-results-dialog"><header class="vote-results-head"><div><span class="vote-status-label">${escapeHtml(voteOutcomeLabel(vote))}</span><h2>${escapeHtml(vote.topic ?? vote.question)}</h2></div><button class="dialog-icon-close" type="button" data-dialog-close data-close-vote-results aria-label="Закрыть">×</button></header><div class="vote-results-scroll">${conferenceVoteCard(vote, "Результаты голосования")}</div></section>`;
  document.body.append(backdrop);
  const dialog = backdrop.querySelector(".vote-results-dialog");
  voteResultsModal = { voteId, release: openModal(dialog, { onEscape: closeVoteResultsModal,
    initialFocus: () => dialog.querySelector("[data-close-vote-results]") }) };
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
  return `<button type="button" class="button secretary-record-toggle ${recording ? "is-recording" : "is-off"}" data-action="secretary-toggle-recording" ${meetingPaused ? "disabled" : ""} aria-pressed="${recording}" title="${recording ? "Остановить запись конференции" : "Включить запись конференции"}"><i class="record-dot" aria-hidden="true"></i>${meetingPaused ? "Запись на паузе" : recording ? "Идёт запись" : "Включить запись"}</button>`;
}

function presentationDockHtml() {
  const active = state.presentations.find((item) => item.status === "active");
  if (!active || (!canViewFiles() && !canManageContent())) return "";
  return `<span id="activePresentationBadge" class="document-viewer-badge-group"><button type="button" class="button button-secondary document-viewer-badge" data-action="open-presentation-document" data-document-id="${escapeHtml(active.documentId)}" data-presentation-id="${escapeHtml(active.id)}" title="Открыть показ" aria-label="Открыть показ: ${escapeHtml(active.title || "Документ")}"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h4M9 13h6m-6 4h6"/></svg><span><small>В показе</small><strong>${escapeHtml(active.title || "Документ")}</strong></span></button>${canManageContent() ? `<button type="button" class="button button-secondary document-viewer-stop" data-action="stop-presentation" data-presentation-id="${escapeHtml(active.id)}" title="Убрать из показа" aria-label="Убрать из показа: ${escapeHtml(active.title || "Документ")}"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/></svg></button>` : ""}</span>`;
}

function renderMicrophoneDock() {
  const dock = $("#microphoneDock");
  const participant = state.meeting?.participants?.[state.participantId];
  if (!participant || participant.permissions?.canSpeak === false || ["observer", "auditor", "interpreter", "translator", "service", "technician", "signage"].includes(participant.role)) {
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
    dock.innerHTML = `<div class="mic-button ${color}" role="status" aria-live="polite">${microphoneIcon(physical === "on" ? "on" : "off")}<span><b>${label}</b><small>${capture ? "Микрофон устройства готов к записи" : "Микрофон устройства недоступен — персональная запись невозможна"}</small></span></div>`;
    dock.insertAdjacentHTML("beforeend", recordingToggleHtml(meetingPaused));
    dock.insertAdjacentHTML("beforeend", presentationDockHtml());
    return;
  }
  if (participant.role === "chair") {
    const chairSpeaking = participant.microphone === "open";
    const nextId = state.meeting.audioSettings?.discussionMode === "managed"
      ? state.meeting.floorQueue.find((id) => state.meeting.participants?.[id]?.state === "joined") : null;
    const next = nextId ? state.meeting.participants[nextId] : null;
    const nextIcon = `<span class="chair-next-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg><svg class="chair-next-attention" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></span>`;
    dock.innerHTML = `<button type="button" class="mic-button chair-mic-button mic-neutral" data-mic-action="chair-priority" ${meetingPaused ? "disabled" : ""} aria-label="Приоритет: выключить микрофоны остальных участников, кроме председателей, и взять слово">${microphoneIcon("on")}<span><b>Приоритет</b><small>Отключить остальных</small></span></button><button type="button" class="mic-button chair-mic-button ${chairSpeaking ? "mic-green mic-live" : "mic-red mic-idle"}" data-mic-action="chair-take-floor" ${meetingPaused ? "disabled" : ""} aria-label="${chairSpeaking ? "Выключить свой микрофон" : "Взять слово без отключения остальных"}">${microphoneIcon(chairSpeaking ? "on" : "off")}<span><b><span class="label-full">${chairSpeaking ? "Выключить микрофон" : "Взять слово"}</span><span class="label-short" aria-hidden="true">${chairSpeaking ? "Выключить" : "Слово"}</span></b><small>${chairSpeaking ? "Вы в эфире" : "Без отключения других"}</small></span></button><button type="button" class="mic-button chair-mic-button mic-neutral chair-next ${next ? "has-queue" : ""}" data-mic-action="chair-next" ${!next || meetingPaused ? "disabled" : ""} aria-label="${next ? `Дать слово следующему: ${escapeHtml(next.displayName)}` : "Нет запросов слова в очереди"}" title="${next ? escapeHtml(next.displayName) : "Очередь пуста"}">${nextIcon}<span><b><span class="label-full">Следующий</span><span class="label-short" aria-hidden="true">Далее</span></b><small>${next ? `В очереди: ${state.meeting.floorQueue.length}` : "Очередь пуста"}</small></span></button>${chairSpeaking ? '<span class="on-air-tag" role="status">● В эфире</span>' : ""}`;
    dock.insertAdjacentHTML("beforeend", recordingToggleHtml(meetingPaused));
    dock.insertAdjacentHTML("beforeend", presentationDockHtml());
    return;
  }
  const color = speaking ? "mic-green mic-live" : queued ? "mic-yellow mic-queued" : "mic-red mic-idle";
  const openDiscussion = state.meeting.audioSettings?.discussionMode === "open";
  const label = speaking ? "Выключить микрофон" : queued ? "Отменить запрос слова" : openDiscussion ? "Взять слово" : "Запросить слово";
  const queuePlace = queued ? state.meeting.floorQueue.indexOf(state.participantId) + 1 : 0;
  const blocked = meetingPaused || (state.meeting.chairPriority?.mode === "hard" && !speaking && !queued);
  const blockedReason = meetingPaused ? "Конференция на паузе" : "Председатель использует приоритет; запрос временно недоступен";
  dock.innerHTML = `<button type="button" class="mic-button ${color}" data-mic-action="delegate" aria-label="${blocked ? blockedReason : label}" title="${blocked ? blockedReason : label}" ${blocked ? "disabled" : ""}>${microphoneIcon(speaking ? "on" : queued ? "wait" : "off")}<span><b>${meetingPaused ? "Микрофон на паузе" : speaking ? "Завершить выступление" : queued ? "Отменить запрос" : label}</b><small>${meetingPaused ? "Конференция на паузе" : speaking ? "Вас слышит зал" : queued ? `Вы в очереди: №${queuePlace}` : blocked ? "Приоритет председателя" : "Нажмите, чтобы выступить"}</small></span></button>${speaking ? '<span class="on-air-tag" role="status">● В эфире</span>' : ""}`;
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
  if (["observer", "auditor", "interpreter", "translator", "service", "signage"].includes(state.profile?.role) || !canSpeak()) return "";
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
      <label class="inline-number">Задержка переключения самого громкого, мс <input id="pgmLoudestDelay" type="number" min="100" max="5000" step="100" value="${chosen.loudestSwitchDelayMs ?? 700}"></label>
      <label class="inline-check"><input id="pgmFaceFraming" type="checkbox" ${chosen.faceFraming ? "checked" : ""}> Кадрировать камеры участников по лицу</label>
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
  const previous = state.secretaryEditor;
  await saveSecretaryTranscript();
  // Characters typed while the PUT was in flight belong to the old turn.
  for (let attempt = 0; attempt < 3 && previous.dirty && state.secretaryEditor === previous; attempt += 1) {
    await saveSecretaryTranscript();
  }
  state.secretarySpeakerSignature = signature;
  if (!speakerIds.length) {
    // Nobody is speaking: the last turn stays open so its final sentence can
    // still be written. A new speaker starts a new turn.
    if (previous.turnId) previous.closed = true;
    return;
  }
  const segmentIds = (state.recordingStatus?.active ?? [])
    .filter((item) => speakerIds.includes(item.participantId)).map((item) => item.segmentId);
  state.secretarySegmentId = segmentIds[0] ?? null;
  state.secretaryEditor = { turnId: uuid(), speakerIds, segmentIds,
    startedAt: new Date().toISOString(),
    value: "", base: "", revision: 0, dirty: false, cleared: false };
}

function secretaryHeadline() {
  const names = state.meeting.activeSpeakerIds.map((id) => state.meeting.participants[id]?.displayName).filter(Boolean).join(", ");
  if (names) return `${names}${state.meeting.activeSpeakerIds.length > 1 ? " · несколько выступающих" : ""}`;
  return state.secretaryEditor.turnId && state.secretaryMode === "transcript"
    ? "Сейчас никто не выступает · можно дописать предыдущее выступление" : "Сейчас никто не выступает";
}

// Refreshes the secretary block without replacing the field: its scroll,
// undo history and an IME composition survive microphone events.
function updateSecretaryWorkspace() {
  const block = document.querySelector(".secretary-workspace");
  if (!block) return;
  const head = block.querySelector("#secretaryLiveNames");
  if (head) head.textContent = secretaryHeadline();
  const channels = document.querySelector(".secretary-open-channels .secretary-speakers");
  if (channels) channels.innerHTML = secretarySpeakersHtml();
  const field = block.querySelector("#secretaryText");
  if (!field || state.secretaryMode !== "transcript") return;
  const turnId = state.secretaryEditor.turnId ?? "";
  if (field.dataset.turnId !== turnId) {
    field.value = state.secretaryEditor.value;
    field.dataset.turnId = turnId;
  }
  field.disabled = !state.secretaryEditor.turnId;
  field.placeholder = state.secretaryEditor.turnId ? "Введите стенограмму выступления" : "Стенограмма начнётся, когда откроется микрофон выступающего";
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
  return `<article class="panel panel-pad secretary-workspace" data-meeting-id="${escapeHtml(meetingId)}">
    <div class="secretary-editor-head"><strong id="secretaryLiveNames">${escapeHtml(secretaryHeadline())}</strong></div>
    <textarea id="secretaryText" rows="8" data-turn-id="${escapeHtml(state.secretaryMode === "transcript" ? state.secretaryEditor.turnId ?? "" : "")}" placeholder="${state.secretaryMode === "transcript" ? (state.secretaryEditor.turnId ? "Введите стенограмму выступления" : "Стенограмма начнётся, когда откроется микрофон выступающего") : "Введите заметку секретаря"}" ${state.secretaryMode === "transcript" && !state.secretaryEditor.turnId ? "disabled" : ""}>${escapeHtml(state.secretaryMode === "transcript" ? state.secretaryEditor.value : state.secretaryNoteDraft)}</textarea>
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
  service: { width: 4, height: 170 }, translation: { width: 4, height: 190 },
  channels: { width: 5, height: 220 }, protocol: { width: 4, height: 400 } };
const WORKSPACE_PANEL_LABELS = { program: "Трансляция зала", speakers: "Выступают", queue: "Очередь",
  materials: "Материалы к пункту", vote: "Голосование", metrics: "Показатели",
  service: "Сервис", translation: "Перевод", channels: "Открытые каналы", protocol: "Протокол" };
const WORKSPACE_PERSONAL_ROLES = ["operator", "av_operator", "technician", "admin", "service"];
// Blocks pack on 10 px rows with a 10 px visible vertical and horizontal gap.
const WORKSPACE_ROW = 10;
const WORKSPACE_GAP = 10;
const WORKSPACE_VERTICAL_GAP = WORKSPACE_ROW;

// Every block this role may place (same rule as the server), and those that can be added right now.
function workspaceAllowedPanels(role = state.profile?.role) {
  if (["interpreter", "translator"].includes(role)) return ["program", "translation", "speakers"];
  if (role === "service") return ["service"];
  if (role === "technician") return ["service", "metrics"];
  if (role === "secretary") return [...SECRETARY_LAYOUT_DEFAULT.order];
  return [...workspacePanelIds(role), ...(["observer", "auditor"].includes(role) ? [] : ["service"]), "translation"];
}
function workspaceAddablePanels(layout) {
  return workspaceAllowedPanels().filter((id) => !layout.order.includes(id) &&
    (id !== "translation" || ["interpreter", "translator"].includes(state.profile?.role) ||
      (state.translateStatus?.licensed && hasConferenceInterpreter())));
}

// The Program tile follows its column width; its height rounds to 10 px.
function fitProgramTiles() {
  for (const wrap of document.querySelectorAll('.workspace-grid > [data-layout-panel="program"]')) {
    const panel = wrap.querySelector(".conference-program-panel");
    if (!panel) continue;
    const head = panel.querySelector(".program-panel-head")?.offsetHeight ?? 0;
    const height = Math.max(10, Math.round((head + panel.clientWidth * 9 / 16 +
      panel.offsetHeight - panel.clientHeight) / 10) * 10);
    if (wrap.style.getPropertyValue("--layout-height") === `${height}px`) continue;
    wrap.style.setProperty("--layout-height", `${height}px`);
    wrap.style.gridRow = `span ${Math.ceil((height + WORKSPACE_VERTICAL_GAP) / WORKSPACE_ROW)}`;
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
  if (role === "service") return ["service"];
  if (role === "technician") return ["service", "metrics"];
  if (role === "secretary") return [...SECRETARY_LAYOUT_DEFAULT.order];
  if (role === "chair") return ["program", "speakers", "queue", "materials", "vote"];
  if (WORKSPACE_PERSONAL_ROLES.includes(role)) return [...WORKSPACE_BASE_PANELS, "metrics"];
  return [...WORKSPACE_BASE_PANELS];
}

function workspaceLayoutDefault(role = state.profile?.role) {
  if (role === "secretary") return SECRETARY_LAYOUT_DEFAULT;
  const order = workspacePanelIds(role);
  const interpreter = ["interpreter", "translator"].includes(role);
  const technicalSizes = { service: { width: 12, height: 500 }, metrics: { width: 12, height: 140 } };
  return { order, bodyFontSize: 14, titleFontSize: 18, panels: Object.fromEntries(order.map((id) => [id, interpreter
    ? { width: id === "translation" ? 5 : 7, height: id === "speakers" ? 140 : 400 }
    : ["service", "technician"].includes(role) ? { ...(technicalSizes[id] ?? WORKSPACE_PANEL_SIZES[id]) }
      : { ...WORKSPACE_PANEL_SIZES[id] }])) };
}

function usesParticipantWorkspace() {
  return state.profile?.role !== "secretary" && (window.innerWidth > 760 ||
    ["service", "technician"].includes(state.profile?.role));
}

function canEditWorkspaceLayout() {
  return state.profile?.role === "secretary" || usesParticipantWorkspace();
}

// The administrator's layout for this role (or the built-in default); a personal layout overrides it.
function roleWorkspaceLayout() {
  return structuredClone(state.workspaceRoleLayout ?? workspaceLayoutDefault());
}

// Height of a Program tile spanning `span` of 12 columns, rounded to 10 px.
function programTileHeight(span) {
  const content = $("#pageContent");
  const style = content ? getComputedStyle(content) : null;
  const width = (content?.clientWidth ?? window.innerWidth) - (style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 40);
  const column = (width - 11 * WORKSPACE_GAP) / 12;
  return Math.round((span * column + (span - 1) * WORKSPACE_GAP) * 9 / 16 / 10) * 10;
}

// Width/height locks: the administrator's role locks bind participants; anyone may add their own.
const LOCK_ICONS = {
  width: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
  height: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'
};
function roleLock(id, axis) {
  return state.profile?.role !== "secretary" && Boolean(state.workspaceRoleLayout?.panels?.[id]?.[axis === "width" ? "lockWidth" : "lockHeight"]);
}
function workspaceGridMode(layout) {
  if (layout.order.some((id) => Number.isInteger(layout.panels[id]?.widthPercent) ||
    (roleLock(id, "width") && Number.isInteger(state.workspaceRoleLayout?.panels?.[id]?.widthPercent)))) return "percent";
  return layout.order.some((id) => Number.isInteger(layout.panels[id]?.widthPx)) ? "pixel" : "span";
}
function workspacePercent(size) {
  if (Number.isInteger(size.widthPercent)) return size.widthPercent;
  const available = document.querySelector(".workspace-area")?.clientWidth ??
    document.querySelector("#pageContent")?.clientWidth ?? window.innerWidth;
  return Math.max(2, Math.min(100, Math.round((size.widthPx === undefined ? size.width / 12 * 100
    : (size.widthPx + WORKSPACE_GAP) / available * 100) / 2) * 2));
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
  if (action === "layout-font-reset" && state.secretaryLayoutDraft) {
    state.secretaryLayoutDraft.bodyFontSize = 14;
    state.secretaryLayoutDraft.titleFontSize = 18;
    renderPage();
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
  state.secretaryLayoutLoaded = role === "secretary";
}

function secretaryLayoutPanel(id, content) {
  const layout = state.secretaryLayoutDraft ?? state.secretaryLayout;
  const own = layout.panels[id] ?? workspaceLayoutDefault().panels[id] ?? WORKSPACE_PANEL_SIZES[id];
  // Sizes the administrator fixed for the role always win over a participant's own copy.
  const roleSize = state.workspaceRoleLayout?.panels?.[id];
  const size = { ...WORKSPACE_PANEL_SIZES[id], ...own,
    ...(roleLock(id, "width") ? { width: roleSize.width,
      ...(roleSize.widthPercent ? { widthPercent: roleSize.widthPercent } : {}),
      ...(roleSize.widthPx ? { widthPx: roleSize.widthPx } : {}) } : {}),
    ...(roleLock(id, "height") ? { height: roleSize.height } : {}) };
  const order = layout.order.indexOf(id);
  const editing = Boolean(state.secretaryLayoutDraft);
  const masonry = state.profile.role !== "secretary";
  const gridMode = workspaceGridMode(layout);
  const percent = gridMode === "percent" ? workspacePercent(size) : null;
  const pixelGrid = gridMode === "pixel";
  const widthPx = pixelGrid ? size.widthPx ?? Math.max(100, Math.floor(((document.querySelector("#pageContent")?.clientWidth ?? 1280) - 110) * size.width / 12 / 10) * 10) : null;
  // Workspace grids pack blocks on 10 px rows; the Program tile follows its measured width (16:9).
  const height = masonry && id === "program" ? widthPx ? Math.round((widthPx * 9 / 16 + 42) / 10) * 10 : programTileHeight(size.width) : size.height;
  const rows = `;grid-row:span ${Math.ceil((height + WORKSPACE_VERTICAL_GAP) / WORKSPACE_ROW)}`;
  const columnSpan = percent ? percent / 2 : widthPx ? Math.ceil((widthPx + 10) / 10) : size.width;
  return `<div class="secretary-layout-panel${editing ? " is-editing" : ""}" data-layout-panel="${id}" style="--layout-span:${columnSpan};${percent ? `--layout-gutter:${percent === 100 ? 0 : WORKSPACE_GAP}px;` : ""}${widthPx ? `--layout-width:${widthPx}px;` : ""}--layout-height:${height}px;order:${order}${rows}">
      ${editing ? `<div class="secretary-panel-tools"><button type="button" class="secretary-drag-handle" data-layout-drag="${id}" aria-label="Переместить блок" title="Перетащите блок">⠿ Переместить</button><button type="button" class="secretary-order-button" data-action="secretary-panel-before" data-panel-id="${id}" aria-label="Передвинуть блок раньше">←</button><button type="button" class="secretary-order-button" data-action="secretary-panel-after" data-panel-id="${id}" aria-label="Передвинуть блок позже">→</button>${lockButton(id, "width", size)}${masonry && id === "program" ? "" : lockButton(id, "height", size)}<span>${percent ? `${percent}%` : widthPx ? `${widthPx} px` : `${size.width}/12`} · ${masonry && id === "program" ? "16:9" : `${size.height} px`}</span>${masonry && layout.order.length > 1 && !(id === "translation" && ["interpreter", "translator"].includes(state.profile.role)) ? `<button type="button" class="secretary-order-button layout-remove" data-action="layout-remove" data-panel-id="${id}" aria-label="Убрать блок «${WORKSPACE_PANEL_LABELS[id] ?? id}»" title="Убрать блок">×</button>` : ""}</div>` : ""}
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
  if (action === "layout-font-reset") {
    handleWorkspaceUiAction(action, target);
  } else if (action === "layout-add") {
    $("#workspaceAddMenu").open = false;
    handleWorkspaceUiAction(action, target);
  } else if (action === "secretary-layout-cancel") {
    state.secretaryLayoutDraft = null;
    renderPage();
  } else if (action === "secretary-layout-reset") {
    state.secretaryLayoutDraft = roleWorkspaceLayout();
    renderPage();
  } else if (action === "secretary-layout-save") {
    void (async () => {
      const path = `/me/workspace-layout?meetingId=${encodeURIComponent(state.profile.meetingId)}&device=${state.workspaceLayoutDevice ?? "pc"}`;
      const draft = state.secretaryLayoutDraft;
      const sameAsRole = JSON.stringify({ order: draft.order, panels: draft.panels, bodyFontSize: draft.bodyFontSize ?? 14, titleFontSize: draft.titleFontSize ?? 18 })
        === JSON.stringify({ order: roleWorkspaceLayout().order, panels: roleWorkspaceLayout().panels,
          bodyFontSize: roleWorkspaceLayout().bodyFontSize ?? 14, titleFontSize: roleWorkspaceLayout().titleFontSize ?? 18 });
      if (sameAsRole) await state.api.delete(path);
      else await state.api.put(path, { layout: draft });
      state.secretaryLayout = structuredClone(draft);
      state.workspacePersonal = !sameAsRole;
      state.secretaryLayoutDraft = null;
      renderPage();
      notify(sameAsRole ? "Используется раскладка роли" : "Раскладка сохранена для вас");
    })().catch((error) => notify(error));
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
    startX: event.clientX, startY: event.clientY, width: size.width, widthPx: size.widthPx ?? null,
    widthPercent: workspacePercent(size),
    height: size.height, target: null };
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
    const pixelGrid = grid.classList.contains("is-pixel-grid");
    const percentGrid = grid.classList.contains("is-percent-grid");
    const width = panelLocked(current, gesture.id, "width") ? gesture.width : Math.max(3, Math.min(12, gesture.width + Math.round(dx / column)));
    const widthPercent = percentGrid ? panelLocked(current, gesture.id, "width") ? gesture.widthPercent
      : Math.max(2, Math.min(100, gesture.widthPercent + Math.round(dx / (grid.clientWidth * .02)) * 2)) : null;
    const widthPx = pixelGrid ? panelLocked(current, gesture.id, "width") ? gesture.widthPx
      : Math.max(100, Math.min(Math.floor((grid.clientWidth - 10) / 10) * 10,
        (gesture.widthPx ?? gesture.panel.clientWidth) + Math.round(dx / 10) * 10)) : null;
    const verticalStep = state.profile?.role === "secretary" ? 8 : 10;
    const height = panelLocked(current, gesture.id, "height") ? gesture.height
      : Math.max(state.profile?.role === "secretary" ? 160 : 80,
        Math.min(900, gesture.height + Math.round(dy / verticalStep) * verticalStep));
    gesture.panel.style.setProperty("--layout-span", percentGrid ? widthPercent / 2 : pixelGrid ? Math.ceil((widthPx + 10) / 10) : width);
    if (percentGrid) gesture.panel.style.setProperty("--layout-gutter", `${widthPercent === 100 ? 0 : WORKSPACE_GAP}px`);
    if (pixelGrid) gesture.panel.style.setProperty("--layout-width", `${widthPx}px`);
    gesture.panel.style.setProperty("--layout-height", `${height}px`);
    gesture.nextSize = { width, ...(percentGrid ? { widthPercent } : {}), ...(pixelGrid ? { widthPx } : {}), height };
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
    if (gesture.nextSize.widthPercent !== undefined) delete state.secretaryLayoutDraft.panels[gesture.id].widthPx;
  } else if (gesture.mode === "drag" && gesture.target) {
    const order = state.secretaryLayoutDraft.order;
    order.splice(order.indexOf(gesture.id), 1);
    order.splice(order.indexOf(gesture.target.dataset.layoutPanel), 0, gesture.id);
  }
  renderPage();
}

// UC participants who tried to unmute in their own meeting wait in the queue
// like delegates; «Дать слово» unmutes them, «Отклонить» keeps them muted.
function ucFloorRequestsHtml() {
  const manage = can("audio.operate");
  const memberRequests = (state.ucSessions ?? []).filter((session) => session.state === "connected" && session.virtual)
    .flatMap((session) => (session.members ?? []).filter((member) => member.muted && member.floorRequestedAt)
      .map((member) => ({ session, member })))
    .sort((a, b) => Date.parse(a.member.floorRequestedAt) - Date.parse(b.member.floorRequestedAt)).map(({ session, member }) =>
      `<div class="status-row floor-person uc-floor-request"><span class="person-avatar">UC</span><div class="floor-person-copy"><strong><span class="floor-name" title="${escapeHtml(member.displayName)}">${escapeHtml(member.displayName)}</span></strong><small>Виртуальный зал · просит слово</small></div>${manage ? `<button class="button button-secondary icon-label-button" data-action="uc-member-mute" data-uc-session-id="${escapeHtml(session.id)}" data-uc-user="${escapeHtml(member.user)}" data-muted="false">Дать слово</button><button class="button button-quiet icon-label-button" data-action="uc-member-mute" data-uc-session-id="${escapeHtml(session.id)}" data-uc-user="${escapeHtml(member.user)}" data-muted="true">Отклонить</button>` : ""}</div>`).join("");
  return memberRequests + (state.ucSessions ?? []).filter((session) => session.state === "connected" && !session.virtual && session.muted && session.floorRequestedAt)
    .sort((a, b) => Date.parse(a.floorRequestedAt) - Date.parse(b.floorRequestedAt)).map((session) => {
      const name = session.displayName?.trim() || "Участник внешней встречи";
      return `<div class="status-row floor-person uc-floor-request"><span class="person-avatar">UC</span><div class="floor-person-copy"><strong><span class="floor-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span></strong><small>Внешняя встреча · просит слово</small></div>${manage ? `<button class="button button-secondary icon-label-button" data-action="uc-toggle-mute" data-uc-session-id="${escapeHtml(session.id)}">Дать слово</button><button class="button button-quiet icon-label-button" data-action="uc-decline-floor" data-uc-session-id="${escapeHtml(session.id)}">Отклонить</button>` : ""}</div>`;
    }).join("") + ucShareRequestsHtml();
}

// A UC participant started a screen share in their meeting: the operator
// allows it (optionally straight to Program) or declines.
function ucShareRequestsHtml() {
  const manage = can("floor.manage");
  return (state.ucSessions ?? []).filter((session) => session.state === "connected" && session.shareRequestedAt).map((session) => {
    const name = session.displayName?.trim() || "Участник внешней встречи";
    return `<div class="status-row floor-person uc-share-request"><span class="person-avatar">UC</span><div class="floor-person-copy"><strong><span class="floor-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span></strong><small>Внешняя встреча · хочет показать экран</small></div>${manage ? `<button class="button button-secondary icon-label-button" data-action="uc-share-allow" data-uc-session-id="${escapeHtml(session.id)}">Разрешить</button><button class="button button-quiet icon-label-button" data-action="uc-share-decline" data-uc-session-id="${escapeHtml(session.id)}">Отклонить</button>` : ""}</div>`;
  }).join("");
}

function conferenceHtml() {
  const canManageFloor = can("floor.manage");
  const canViewMetrics = ["admin", "technician"].includes(state.profile.role);
  const microphoneLimit = state.meeting.audioSettings?.maxOpenMicrophones ?? state.systemStatus?.capacity?.openMicrophonesPerMeeting ?? 3;
  const initials = (name) => String(name ?? "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const queue = state.meeting.floorQueue.map((id, index) => {
        const participant = state.meeting.participants[id];
        if (!participant) return "";
        return `<div class="status-row floor-person"><span class="person-avatar">${escapeHtml(initials(participant.displayName))}</span><div class="floor-person-copy"><strong><span class="queue-index">${index + 1}</span><span class="floor-name" title="${escapeHtml(participant.displayName)}">${escapeHtml(participant.displayName)}</span></strong><small>${escapeHtml(CONFERENCE_ROLE_LABELS[participant.role] ?? participant.role)}</small></div>${canManageFloor ? `<div class="action-strip floor-decisions"><button class="button floor-grant" title="Дать слово" aria-label="Дать слово" data-action="grant-floor" data-participant-id="${escapeHtml(id)}">✓</button><button class="button floor-reject" title="Отклонить запрос" aria-label="Отклонить запрос" data-action="release-floor" data-participant-id="${escapeHtml(id)}">×</button></div>` : ""}</div>`;
      }).join("") + ucFloorRequestsHtml() || `<div class="empty">Очередь запросов пуста.</div>`;
  const localSpeakers = state.meeting.activeSpeakerIds.map((id) => {
        const participant = state.meeting.participants[id];
        if (!participant) return "";
        return `<div class="status-row floor-person is-speaking"><span class="person-avatar">${escapeHtml(initials(participant.displayName))}</span><div><strong>${escapeHtml(participant.displayName)}</strong><br><small>Микрофон открыт</small></div>${canManageFloor ? `<button class="button button-danger icon-label-button" data-action="release-floor" data-participant-id="${escapeHtml(id)}" title="Отключить микрофон" aria-label="Отключить микрофон: ${escapeHtml(participant.displayName)}">${iconLabel("micOff", "Отключить")}</button>` : ""}</div>`;
      }).join("");
  const ucSpeakers = (state.ucSessions ?? []).filter((session) =>
    !session.simulated && session.state === "connected" && session.streamId).map((session) => {
    const provider = { "yandex-telemost": "Яндекс Телемост", zoom: "Zoom", webex: "Webex",
      trueconf: "TrueConf", "kontur-talk": "Контур.Толк" }[session.providerId] ?? session.providerId;
    const name = session.displayName?.trim() || `${provider} · ${session.id.slice(0, 8)}`;
    const mute = session.muted === true;
    const asks = mute && session.floorRequestedAt;
    if (session.virtual) {
      return `<div class="status-row floor-person uc-floor-person" data-uc-session-id="${escapeHtml(session.id)}"><span class="person-avatar">UC</span><div class="floor-person-copy"><strong>${escapeHtml(ucHallTitle(session.displayName))}</strong><small>Виртуальный зал Zoom · участников: ${(session.members ?? []).length}</small></div>${can("audio.operate") ? `<button class="button ${session.talkbackBy || state.ucTalkbackSessionId === session.id ? "button-primary" : "button-quiet"} icon-label-button" data-action="uc-talkback" data-uc-session-id="${escapeHtml(session.id)}" aria-pressed="${Boolean(session.talkbackBy) || state.ucTalkbackSessionId === session.id}" title="Сказать всем участникам этого виртуального зала: зал и PGM не слышат">${session.talkbackBy || state.ucTalkbackSessionId === session.id ? "Закончить разговор" : "Говорить"}</button>` : ""}</div>`;
    }
    return `<div class="status-row floor-person uc-floor-person ${mute ? "is-muted" : "is-speaking"}" data-uc-session-id="${escapeHtml(session.id)}"><span class="person-avatar">UC</span><div class="floor-person-copy"><strong>${escapeHtml(name)}</strong><small>${asks ? "Просит слово" : mute ? "Внешняя встреча · звук в зале выключен" : "Внешняя встреча · звук включён"}</small></div>${can("audio.operate") && session.streamId ? `<button class="button ${mute ? "button-secondary" : "button-danger"} icon-label-button" data-action="uc-toggle-mute" data-uc-session-id="${escapeHtml(session.id)}" aria-label="${mute ? "Дать слово" : "Заглушить звук"}: ${escapeHtml(name)}">${mute ? (asks ? "Дать слово" : "Включить") : "Заглушить"}</button>` : ""}${can("audio.operate") && session.streamId ? `<button class="button ${session.talkbackBy || state.ucTalkbackSessionId === session.id ? "button-primary" : "button-quiet"} icon-label-button" data-action="uc-talkback" data-uc-session-id="${escapeHtml(session.id)}" aria-pressed="${Boolean(session.talkbackBy) || state.ucTalkbackSessionId === session.id}" title="Сказать только этому подключению: зал и PGM не слышат">${session.talkbackBy || state.ucTalkbackSessionId === session.id ? "Закончить разговор" : "Говорить"}</button>` : ""}</div>`;
  }).join("");
  // Virtual hall: each Zoom participant with their own microphone.
  const ucMembers = (state.ucSessions ?? []).filter((session) => session.state === "connected" && session.virtual)
    .flatMap((session) => (session.members ?? []).map((member) => {
      const mute = member.muted !== false;
      return `<div class="status-row floor-person uc-floor-person uc-member ${mute ? "is-muted" : "is-speaking"}"><span class="person-avatar">${escapeHtml(initials(member.displayName))}</span><div class="floor-person-copy"><strong>${escapeHtml(member.displayName)}</strong><small>${member.participantId ? "Виртуальный зал" : `Виртуальный зал · в Zoom: ${escapeHtml(member.name ?? "")}`} · ${member.canSpeak === false ? "без права выступления" : mute ? (member.floorRequestedAt ? "просит слово" : "микрофон выключен") : "микрофон включён"}</small>${!member.participantId && can("audio.operate") && (session.memberCandidates ?? []).length ? `<label class="uc-member-bind"><span>Кто это?</span><select data-action="uc-member-bind" data-uc-session-id="${escapeHtml(session.id)}" data-uc-user="${escapeHtml(member.user)}"><option value="">Привязать к участнику…</option>${session.memberCandidates.map((item) => `<option value="${escapeHtml(item.participantId)}">${escapeHtml(item.displayName)}</option>`).join("")}</select></label>` : ""}</div>${can("audio.operate") && member.streamId && (member.canSpeak !== false || !mute) ? `<button class="button ${mute ? "button-secondary" : "button-danger"} icon-label-button" data-action="uc-member-mute" data-uc-session-id="${escapeHtml(session.id)}" data-uc-user="${escapeHtml(member.user)}" data-muted="${mute ? "false" : "true"}">${mute ? "Дать слово" : "Выключить"}</button>` : ""}</div>`;
    })).join("");
  const activeSpeakers = localSpeakers + ucSpeakers + ucMembers || `<div class="empty">Текущих выступающих нет.</div>`;
  const scheduledPresenters = (state.meeting.preparedParticipants ?? []).filter((item) => !item.excludedAt &&
    (item.reports || item.role === "presenter"))
    .sort((a, b) => Number(a.reportOrder ?? 999) - Number(b.reportOrder ?? 999));
  const presenterSession = (item) => {
    if (item.reportSeatMode === "own" || item.reportSeatMode === "remote" || item.remote === true) {
      const session = item.ownReportSession;
      return session?.status === "pending" && Date.parse(session.expiresAt) <= Date.now() ? null : session;
    }
    const session = state.sharedSeats.find((seat) => seat.id === item.presenterSeatId)?.session;
    return session?.meetingId === state.meeting.id ? session : null;
  };
  const currentPresenter = scheduledPresenters.find((item) => item.status !== "completed" && presenterSession(item)?.assignedUserId === item.id && ["pending", "active", "finishing"].includes(presenterSession(item).status))
    ?? scheduledPresenters.find((item) => item.status !== "completed");
  const currentSession = currentPresenter ? presenterSession(currentPresenter) : null;
  const currentSeat = currentPresenter?.reportSeatMode === "remote" || currentPresenter?.remote === true
    ? { online: true, name: "Удалённо" } : currentPresenter?.reportSeatMode === "own" ? { online: true, name: "С собственного места" } :
    currentPresenter ? state.sharedSeats.find((seat) => seat.id === currentPresenter.presenterSeatId) : null;
  const presenterAction = currentPresenter ? !currentSeat ? ["presenter-workplace", "Назначить место", false] :
    currentSession?.status === "pending" ? ["presenter-confirm", "Подключить", false] :
    currentSession?.status === "finishing" ? ["", "Завершение…", true] :
    currentSession?.status === "active" ? ["presenter-finish", "Завершить", false] :
      currentSeat.online ? ["presenter-call", "Вызвать", false] :
        ["presenter-workplace", "Выбрать место", false] : null;
  const showPresenterSchedule = !state.meeting.quick && (["secretary", "operator", "admin"].includes(state.profile.role) ||
    state.profile.role === "chair" && can("conference.roster"));
  const presenterButton = showPresenterSchedule && presenterAction
    ? `<button class="button button-secondary" data-action="${presenterAction[0]}" data-presenter-id="${escapeHtml(currentPresenter.id)}" title="${escapeHtml(presenterAction[2] && !currentSeat?.online ? "Устройство рабочего места не подключено" : presenterAction[1])}" ${presenterAction[2] ? "disabled" : ""}>${presenterAction[1]}</button>` : "";
  const presenterQueue = scheduledPresenters.map((item) => {
    const seat = item.reportSeatMode === "remote" || item.remote === true ? { online: true, name: "Удалённо" } :
      item.reportSeatMode === "own" ? { online: true, name: "С собственного места" } :
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
  const canManageAgenda = can("conference.agenda");
  const agenda = state.meeting.agenda ?? [];
  const activeAgenda = agenda.find((item) => item.id === state.meeting.activeAgendaItemId);
  const agendaAction = `<button class="button ${canManageAgenda ? "button-secondary" : "button-quiet"}" data-action="${canManageAgenda ? "edit-agenda" : "view-agenda"}" title="${canManageAgenda ? "Изменить повестку" : "Посмотреть повестку"}">${canManageAgenda ? "Повестка" : "Посмотреть"}</button>`;
  const closeAction = ["operator", "admin", "secretary"].includes(state.profile.role) && can("conference.lifecycle")
    ? state.meeting.status === "ready" ? `<button class="button button-primary" data-action="start-conference">Начать конференцию</button>`
      : state.meeting.status === "active" ? `<button class="button button-danger conference-close-action" data-action="close-conference" title="Завершить конференцию для всех" aria-label="Завершить конференцию">Завершить</button>` : "" : "";
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
    && !openVote.hasVoted && (!openVote.ballotType || openVote.ballotType === "single") && !state.voteSelections.get(openVote.id);
  const voteFocus = focusVote ? `<section class="panel panel-pad conference-focus focus-vote" aria-label="Голосование">${conferenceVoteCard(openVote, "Идёт голосование — ваш голос")}</section>` : "";
  const voteStatus = focusVote ? "" : conferenceVoteStatusCard(openVote, closedVote);
  const activePresentation = state.presentations.find((item) => item.status === "active");
  const presentationOffer = activePresentation ? `<article class="panel panel-pad material-offer active-material-offer"><h4 class="panel-title">Материал отправлен в показ</h4><p class="active-material-name" title="${escapeHtml(activePresentation.title)}">${escapeHtml(activePresentation.title)}</p><div class="action-strip"><button class="button button-secondary" data-action="open-presentation-document" data-document-id="${activePresentation.documentId}" data-presentation-id="${activePresentation.id}">Открыть показ</button>${canManageContent() ? `<button class="button button-danger" data-action="stop-presentation" data-presentation-id="${activePresentation.id}">Убрать из показа</button>` : ""}</div></article>` : "";
  const programPanel = `<article class="panel conference-program-panel"><button type="button" class="program-fullscreen-button" data-action="toggle-program-fullscreen" aria-label="${document.documentElement.classList.contains("program-fullscreen-mode") ? "Свернуть трансляцию" : "Развернуть трансляцию на весь экран"}" title="На весь экран">${iconLabel("fullscreen", "На весь экран")}</button><div id="programStage" class="preview-stage program-stage-large"><div class="preview-empty">Трансляция зала пока не началась.</div></div></article>`;
  const channelsPanel = `<article class="panel panel-pad secretary-open-channels"><h4 class="panel-title">Открытые каналы</h4><div class="secretary-speakers">${secretarySpeakersHtml()}</div></article>`;
  const queuePanel = `<article class="panel panel-pad conference-queue-panel"><div class="section-title-row"><h4 class="panel-title">Очередь</h4><span class="count-badge">${state.meeting.floorQueue.length}</span></div>${showPresenterSchedule ? presenterSchedule : ""}${queue}${showPresenterSchedule ? "" : presenterSchedule}</article>`;
  const ucLiveCount = (state.ucSessions ?? []).filter((session) => !session.simulated && !session.muted).length;
  const ucSpeakerControl = state.ucControl;
  const ucSpeakerAdapters = new Map((ucSpeakerControl?.adapters ?? []).map((adapter) => [adapter.id, adapter]));
  const ucSpeakerActions = ["operator", "secretary", "admin"].includes(state.profile.role) && can("conference.lifecycle")
    ? (ucSpeakerControl?.plans ?? []).filter((plan) => !(ucSpeakerControl?.sessions ?? []).some((session) =>
      session.connectionPlanId === plan.id)).map((plan) => {
      const adapter = ucSpeakerAdapters.get(plan.providerId);
      const auto = ucAutoState(plan);
      const reason = !adapter?.capabilities?.join || plan.mode === "create" && !adapter.capabilities.create
        ? "Адаптер недоступен" : plan.mode === "existing" && !plan.targetConfigured
          ? "Ссылка на встречу не указана" : ucSpeakerControl.usedCapacity >= ucSpeakerControl.capacity
            ? "Достигнут лимит UC-подключений" : "";
      return auto.busy ? `<span class="chip" role="status">${escapeHtml(plan.title)} · ${escapeHtml(auto.label)}</span>`
        : `<button class="button button-quiet" data-action="uc-connect-plan" data-plan-id="${escapeHtml(plan.id)}" title="${escapeHtml(reason || auto.detail || plan.title)}" ${reason ? "disabled" : ""}>Подключить UC · ${escapeHtml(plan.title)}</button>`;
    }).join("") : "";
  const speakersPanel = `<article class="panel panel-pad conference-speakers-panel"><div class="section-title-row"><h4 class="panel-title">Выступают</h4><span class="live-badge">● В эфире ${state.meeting.activeSpeakerIds.length + ucLiveCount}</span></div>${activeSpeakers}${ucSpeakerActions ? `<div class="action-strip compact uc-speaker-actions">${ucSpeakerActions}</div>` : ""}</article>`;
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
    const panels = { program: programPanel, speakers: speakersPanel, queue: queuePanel, channels: channelsPanel,
      materials: presentationOffer || materialOffer ? `<div class="workspace-stack">${presentationOffer}${materialOffer}</div>`
        : emptyCard("Материалы к пункту", "К этому пункту материалов нет.", "material-offer"),
      vote: voteFocus || voteStatus || emptyCard("Голосование", "Голосований пока не было.", "conference-vote-status"),
      metrics,
      protocol: secretaryWorkspaceHtml(),
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
    const gridMode = workspaceGridMode(layout);
    workspaceDashboard = `<div class="workspace-area"><div class="secretary-layout-grid workspace-grid${gridMode === "percent" ? " is-percent-grid" : gridMode === "pixel" ? " is-pixel-grid" : ""}${state.secretaryLayoutDraft ? " is-editing" : ""}" style="grid-auto-rows:${WORKSPACE_ROW}px;column-gap:${gridMode === "span" ? WORKSPACE_GAP : 0}px;--workspace-body-font-size:${layout.bodyFontSize ?? state.workspaceRoleLayout?.bodyFontSize ?? 14}px;--workspace-title-font-size:${layout.titleFontSize ?? state.workspaceRoleLayout?.titleFontSize ?? 18}px">${layout.order.filter((id) => panels[id]).map((id) => secretaryLayoutPanel(id, panels[id])).join("")}</div></div>`;
    watchProgramTiles();
  }
  const standardDashboard = workspaceDashboard || `<div class="conference-dashboard ${focusVote ? "has-focus" : ""}"><div class="conference-main-column">${voteFocus}${programPanel}${belowProgram}</div><div class="conference-side-stack">${speakersPanel}${queuePanel}</div></div>`;
  return `
    ${cameraSetupNoticeHtml()}
    <header class="conference-agenda-bar"><span class="agenda-number">${activeAgendaIndex || "—"}</span><div><small>${state.meeting.pausedAt ? "Конференция на паузе" : activeAgenda ? "Обсуждается сейчас" : "Повестка"}</small><strong>${escapeHtml(activeAgenda?.title ?? "Текущий вопрос не выбран")}</strong></div><div class="conference-agenda-actions">${agendaAction}${pauseAction}${closeAction ? `<span class="conference-agenda-danger">${closeAction}</span>` : ""}</div></header>
    ${state.profile.role === "secretary" ? secretaryDashboard : standardDashboard}
    ${canViewMetrics && !workspaceDashboard ? `<div style="height:16px"></div><div class="grid grid-3">
      <article class="panel panel-pad metric"><span class="metric-tag">Очередь</span><strong>${state.meeting.floorQueue.length}</strong><span>участников ожидают слова</span></article>
      <article class="panel panel-pad metric"><span class="metric-tag">В эфире</span><strong>${state.meeting.activeSpeakerIds.length}</strong><span>активных микрофонов</span></article>
      <article class="panel panel-pad metric"><span class="metric-tag">Лимит</span><strong>${microphoneLimit}</strong><span>микрофонов одновременно</span></article>
    </div>` : ""}
    `;
}

function audioConferenceHtml() {
  if (!can("floor.audio") && !can("floor.discussion")) return "";
  const microphoneLimit = state.meeting.audioSettings?.maxOpenMicrophones ?? state.systemStatus?.capacity?.openMicrophonesPerMeeting ?? 3;
  const queuePolicy = state.meeting.audioSettings?.queuePolicy ?? (state.meeting.audioSettings?.fifoEnabled ? "fifo" : "manual");
  const limitControl = can("floor.audio") ? `<label class="inline-number">Одновременно открытых микрофонов <input id="maxOpenMicrophones" type="number" min="1" max="32" value="${microphoneLimit}"></label><button class="button button-secondary" data-action="save-microphone-limit">Применить</button>` : "";
  const discussionControls = can("floor.discussion") ? `<label class="inline-number">Режим <select id="discussionMode"><option value="managed" ${state.meeting.audioSettings?.discussionMode !== "open" ? "selected" : ""}>Запрос</option><option value="open" ${state.meeting.audioSettings?.discussionMode === "open" ? "selected" : ""}>Свободный</option></select></label><label class="inline-number">Очередь <select id="queuePolicy"><option value="manual" ${queuePolicy === "manual" ? "selected" : ""}>Вручную</option><option value="fifo" ${queuePolicy === "fifo" ? "selected" : ""}>По порядку запросов</option><option value="lifo" ${queuePolicy === "lifo" ? "selected" : ""}>Последний запрос — первым</option></select></label><button class="button button-secondary" data-action="save-discussion-mode">Применить режим</button>` : "";
  return `<article class="panel panel-pad audio-conference-panel"><h4 class="panel-title">Аудиоконференция</h4><div class="action-strip">${limitControl}${discussionControls}</div></article>`;
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

// Raw runtime states stay in the tooltip; the label says what they mean.
function runtimeStatusText(status) {
  const value = String(status ?? "unknown").toLowerCase();
  return ({ running: "Работает", active: "Работает", available: "Готов", ready: "Готов", ok: "Готов", installed: "Установлен",
    starting: "Запускается", stopping: "Останавливается", stopped: "Остановлен", pending: "Ожидает запуска",
    missing: "Не установлен", unavailable: "Недоступен", "not-installed": "Не установлен", failed: "Ошибка", error: "Ошибка",
    disabled: "Выключен", "blocked-runtime-missing": "Нет NDI Runtime", online: "В сети", offline: "Не в сети" })[value] ?? "Нет данных";
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
      ? `<button class="icon-action icon-action-warning" data-action="remove-participant" data-participant-id="${escapeHtml(participant.id)}" data-participant-name="${escapeHtml(participant.displayName)}" title="Отключить от конференции" aria-label="Отключить участника от конференции">${actionIcon("disconnect")}</button>` : "";
    const incoming = showAudioControls ? `<button class="icon-action ${participant.incomingAudioEnabled === false ? "icon-action-warning" : "icon-action-route"}" data-action="toggle-incoming-audio" data-participant-id="${escapeHtml(participant.id)}" data-enabled="${participant.incomingAudioEnabled !== false}" title="${participant.incomingAudioEnabled === false ? "Включить" : "Выключить"} звук зала в наушниках участника" aria-label="Звук зала в наушниках участника">${actionIcon("headphones")}</button>` : "";
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
  const sourceTypeLabel = (type) => ({ client_camera: "Камера участника", content_source: "Демонстрация экрана",
    system_camera: "Камера зала", external_uc: "Внешняя встреча", system_multiview: "Мозаика", synthetic: "Служебный кадр" })[type] ?? "Источник";
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
      audioState = audioOnline ? (!sourceMuted && gain > 0 ? "Аудио включено" : "Звук заглушён") : "Аудио выключено";
      stateClass = audioOnline ? (!sourceMuted && gain > 0 ? "on" : "mute") : "off";
      gainControl = audioCapable && showAudioControls
        ? `<label class="participant-gain"><input type="range" min="0" max="200" step="1" value="${gain}" data-source-gain="${escapeHtml(stream.id)}"><output>${gain}%</output></label>` : "—";
    }
    const owner = participant
      ? `<strong>${escapeHtml(participant.displayName)}</strong><br><small>${escapeHtml(labels[participant.role] ?? participant.role)}</small>`
      : `<strong>${escapeHtml(stream.label)}</strong><br><small>Системный источник</small>`;
    const sourceDetails = participant
      ? `<strong>${escapeHtml(stream.label)}</strong><br><small title="${escapeHtml(stream.sourceType)}">${escapeHtml(stream.protocol.toUpperCase())} · ${escapeHtml(sourceTypeLabel(stream.sourceType))}</small>`
      : `<strong>${escapeHtml(stream.protocol.toUpperCase())}</strong><br><small title="${escapeHtml(stream.sourceType)}">${escapeHtml(sourceTypeLabel(stream.sourceType))}</small>`;
    const previewButton = isAudioOnly || stream.sourceType === "system_multiview" ? "" : `<button class="icon-action icon-action-primary" data-action="preview-stream" data-stream-id="${escapeHtml(stream.id)}" title="Открыть просмотр" aria-label="Открыть просмотр источника">${actionIcon("preview")}</button>`;
    const muteButton = showAudioControls && stream.capabilities?.audio === true
      ? `<button class="icon-action ${sourceMuted ? "icon-action-warning" : "icon-action-neutral"}" data-action="toggle-source-mute" data-stream-id="${escapeHtml(stream.id)}" data-muted="${sourceMuted}" title="${sourceMuted ? "Включить аудио источника" : "Заглушить аудио источника"}" aria-label="Управление аудио источника">${actionIcon("mute")}</button>` : "";
    const tileButton = can("pgm.tiles") && stream.sourceType !== "system_multiview" && stream.capabilities?.video !== false
      ? `<button class="icon-action ${stream.pgmTileEnabled === false ? "icon-action-warning" : "icon-action-route"}" data-action="toggle-pgm-tile" data-stream-id="${escapeHtml(stream.id)}" data-enabled="${stream.pgmTileEnabled !== false}" title="${stream.pgmTileEnabled === false ? "Вернуть в плитки PGM" : "Исключить из плиток PGM"}" aria-label="${stream.pgmTileEnabled === false ? "Вернуть в плитки PGM" : "Исключить из плиток PGM"}">▦</button>` : "";
    const operatorActions = canOperateMedia() ? `<button class="icon-action icon-action-route" data-action="route-preview" data-stream-id="${escapeHtml(stream.id)}" title="Вывести в предпросмотр" aria-label="Вывести источник в предпросмотр">${actionIcon("route")}</button>${stream.protocol === "rtsp" && !stream.previewUrl ? `<button class="icon-action icon-action-route" data-action="start-media-worker" data-stream-id="${escapeHtml(stream.id)}" title="Запустить HLS-преобразование" aria-label="Запустить HLS-преобразование">${actionIcon("hls")}</button>` : ""}${["rtsp", "hls"].includes(stream.protocol) && stream.ingestUrl ? `<button class="icon-action icon-action-route" data-action="start-multicast" data-stream-id="${escapeHtml(stream.id)}" title="Запустить multicast" aria-label="Запустить multicast">${actionIcon("multicast")}</button>` : ""}${stream.protocol === "ndi" && !stream.previewUrl ? `<button class="icon-action icon-action-route" data-action="receive-ndi-stream" data-stream-id="${escapeHtml(stream.id)}" title="Преобразовать NDI в HLS" aria-label="Преобразовать NDI в HLS">${actionIcon("convert")}</button>` : ""}` : "";
    const adminActions = can("media.sources") && !stream.ownerParticipantId && stream.protocol !== "synthetic" ? `<button class="icon-action icon-action-neutral" data-action="edit-stream" data-stream-id="${escapeHtml(stream.id)}" title="Настроить системный источник" aria-label="Настроить системный источник">${actionIcon("edit")}</button><button class="icon-action icon-action-danger" data-action="delete-stream" data-stream-id="${escapeHtml(stream.id)}" title="Удалить системный источник" aria-label="Удалить системный источник">${actionIcon("delete")}</button>` : "";
    const managementActions = participantManagementActions(participant);
    const selfClass = participant?.id === state.participantId ? " participant-self" : "";
    if (participant) {
      return `<tr class="${speaking ? "source-row-speaking" : ""}" data-stream-row="${escapeHtml(stream.id)}"><td>${preview}</td><td class="participant-cell${selfClass}">${owner}</td><td class="participant-stream-summary">—</td><td>${streamStatusHtml(participant.state === "joined" ? "connected" : "offline")}</td><td><span class="audio-state audio-state-${stateClass}">${audioState}</span></td>${showAudioControls ? "<td>—</td>" : ""}<td><div class="source-row-actions">${previewButton}${muteButton}${tileButton}${operatorActions}${managementActions}</div></td></tr>`;
    }
    return `<tr class="${speaking ? "source-row-speaking" : ""}" data-stream-row="${escapeHtml(stream.id)}"><td>${preview}</td><td class="participant-cell${selfClass}">${owner}</td><td>${sourceDetails}</td><td>${streamStatusHtml(stream.status)}</td><td><span class="audio-state audio-state-${stateClass}">${sourceMuted ? "Звук заглушён" : audioState}</span><br><meter class="audio-meter" min="-60" max="0" low="-36" high="-12" optimum="-18" value="-60" data-audio-meter="${escapeHtml(meterId)}"></meter></td>${showAudioControls ? `<td>${gainControl}</td>` : ""}<td><div class="source-row-actions">${previewButton}${muteButton}${tileButton}${operatorActions}${managementActions}${adminActions}</div></td></tr>`;
  };
  const participantStreamRows = visibleStreams.filter((stream) => participantsById.has(stream.ownerParticipantId)).map(renderStreamRow);
  const participantsWithoutStreams = participants.filter((participant) =>
    !visibleStreams.some((stream) => stream.ownerParticipantId === participant.id)).map((participant) => {
    const { speaking, audioState, stateClass } = renderParticipantAudio(participant);
    const selfClass = participant.id === state.participantId ? " participant-self" : "";
    const previewText = !mayViewPersonalCameras && participant.id !== state.participantId ? "Камера участника скрыта" : "Камера не опубликована";
    return `<tr class="${speaking ? "source-row-speaking" : ""}"><td><div class="source-thumb"><div class="preview-empty">${previewText}</div></div></td><td class="participant-cell${selfClass}"><strong>${escapeHtml(participant.displayName)}</strong><br><small>${escapeHtml(labels[participant.role] ?? participant.role)}</small></td><td class="participant-stream-summary">—</td><td>${streamStatusHtml("connected")}</td><td><span class="audio-state audio-state-${stateClass}">${audioState}</span></td>${showAudioControls ? "<td>—</td>" : ""}<td><div class="source-row-actions">${participantManagementActions(participant)}</div></td></tr>`;
  });
  const systemStreamRows = visibleStreams.filter((stream) => !stream.ownerParticipantId).map(renderStreamRow);
  const unjoinedOwnedStreamRows = visibleStreams.filter((stream) => stream.ownerParticipantId && !participantsById.has(stream.ownerParticipantId)).map(renderStreamRow);
  const columnCount = showAudioControls ? 7 : 6;
  const participantRows = [...participantStreamRows, ...participantsWithoutStreams, ...unjoinedOwnedStreamRows];
  const participantGroup = participantRows.length ? `<tr class="source-group-row"><td colspan="${columnCount}">Участники</td></tr>${participantRows.join("")}` : "";
  const systemGroup = systemStreamRows.length ? `<tr class="source-group-row"><td colspan="${columnCount}">Камеры и внешние источники</td></tr>${systemStreamRows.join("")}` : "";
  const rows = participantGroup + systemGroup || `<tr><td colspan="${columnCount}" class="empty">Участники и источники пока не зарегистрированы.</td></tr>`;
  const masterRow = showAudioControls ? `<tr class="mix-master"><td><span class="master-waveform">${actionIcon("waveform")}</span></td><td><strong>Общий уровень зала</strong></td><td>Звук трансляции</td><td>${streamStatusHtml("active")}</td><td><meter class="audio-meter" min="-60" max="0" low="-36" high="-12" optimum="-18" value="-60" data-audio-meter="__mix_master__"></meter></td><td><label class="participant-gain"><input type="range" min="0" max="200" step="1" value="${state.meeting.audioSettings?.masterGain ?? 100}" data-mix-master><output>${state.meeting.audioSettings?.masterGain ?? 100}%</output></label></td><td></td></tr>` : "";
  return `<article class="panel panel-pad participant-media-console"><div class="participant-console-head"><div><h4 class="panel-title">Участники и источники</h4><p>${mayViewPersonalCameras ? "Доступны персональные камеры и внешние источники" : "Чужие персональные камеры скрыты; своя доступна"}</p></div></div><div class="source-wall-wrap"><table class="source-wall-table"><thead><tr><th>Превью</th><th>Участник / источник</th><th>Источник</th><th>Сеть</th><th>Микрофон / аудио</th>${showAudioControls ? "<th>Уровень</th>" : ""}<th>Действия</th></tr></thead><tbody>${rows}${masterRow}</tbody></table></div></article>`;
}

function streamsHtml() {
  const runtime = state.mediaRuntime;
  const previewSource = state.routing?.buses?.preview?.sourceId ?? null;
  const programSource = state.routing?.buses?.program?.sourceId ?? null;
  const autoDirectorEnabled = state.routing?.autoDirector?.enabled === true;
  const prestart = state.meeting.status === "ready";
  const manualDisabled = autoDirectorEnabled || prestart ? "disabled" : "";
  const manualTitle = prestart ? "Эфир доступен после запуска конференции"
    : autoDirectorEnabled ? "Автодиректор включён: выключите его для ручного переключения" : "Перевести источник из предпросмотра в эфир";
  const autoDirectorToggle = can("pgm.operate")
    ? `<button class="button ${autoDirectorEnabled ? "button-quiet" : "button-secondary"}" data-action="toggle-auto-director">${autoDirectorEnabled ? "Выключить" : "Включить"} Автодиректор</button>` : "";
  const autoDirectorStatus = autoDirectorEnabled
    ? `<div class="status-row manual-hold"><div><strong>${state.routing?.autoDirector?.manualHold ? "В эфире выбранный вручную источник" : "Эфир выбирается автоматически"}</strong><br><small>${state.routing?.autoDirector?.manualHold ? "Автоматические правила сохранены и возобновятся при следующем изменении микрофонов." : "Действуют автоматические правила. Чтобы вывести выбранный источник в эфир, выключите Автодиректор."}</small></div><div class="card-actions">${state.routing?.autoDirector?.manualHold ? `<button class="button button-secondary" data-action="resume-auto-director">Вернуть автоматику сейчас</button>` : ""}${autoDirectorToggle}</div></div>`
    : `<div class="status-row manual-hold"><div><strong>Ручное управление эфиром</strong><br><small>«В эфир» и «Плавно» переводят источник из предпросмотра в эфир.</small></div><div class="card-actions">${autoDirectorToggle}</div></div>`;
  const cameraStatusText = (status) => ({ configured: "Настроена", reachable: "RTSP доступен", "media-ready": "Медиа готово", warning: "Требует проверки", "video-uri-missing": "Нет адреса потока" }[status] ?? status);
  const cameras = state.cameras.map((camera) => {
    const attached = state.streams.some((stream) => stream.cameraId === camera.id);
    const verified = camera.status === "media-ready";
    const hallAction = attached
      ? `<span class="camera-on-air" title="Источник уже подключён к конференции">● В зале</span>`
      : `<button class="route-button" data-action="attach-camera" data-camera-id="${camera.id}" ${verified ? "" : "disabled"} title="${verified ? "Отправить проверенную камеру в зал" : "Сначала выполните полную проверку источника"}">В зал</button>`;
    const kind = camera.protocol === "ndi" ? "NDI" : (camera.serviceUrl ? "ONVIF" : "RTSP");
    return `<article class="panel stream-card ${attached ? "stream-card-on-air" : ""}"><div class="source-icon">${camera.hasPtz ? "PTZ" : kind}</div><div><h4>${escapeHtml(camera.name)}</h4><p>${escapeHtml(camera.model ?? kind)} · ${escapeHtml(cameraStatusText(camera.status))} · ${camera.hasPtz ? "поворотная (PTZ)" : "неподвижная"}</p></div><div class="card-actions"><button data-action="probe-camera" data-camera-id="${camera.id}" title="Проверить получение и декодирование медиапотока" aria-label="Проверить источник">⌁ Проверить</button>${hallAction}</div></article>`;
  }).join("") || `<article class="panel empty">Системные камеры ещё не добавлены.</article>`;
  const ndiSourceLabel = (source) => {
    if (!source || typeof source !== "object") return "Источник не назначен";
    if (source.kind === "program") return "Трансляция зала";
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
    const runtimeStatus = runtimeStatusText(job?.status ?? latestJob?.status ?? output.status ?? "pending");
    return `<div class="status-row ndi-output-row"><div class="ndi-output-copy"><strong>${escapeHtml(output.name)}</strong><small>${escapeHtml(ndiSourceLabel(output.source))} · ${escapeHtml(format)} ${escapeHtml(dimensions)} · ${escapeHtml(lifecycle)} · ${escapeHtml(runtimeStatus)}</small></div><div class="ndi-output-actions"><button class="button button-quiet" data-action="configure-ndi-output" data-output-id="${escapeHtml(output.id)}">Настроить</button><button class="button button-quiet" data-action="toggle-ndi-output" data-output-id="${escapeHtml(output.id)}" data-enabled="${output.enabled}">${output.enabled ? "Отключить" : "Включить"}</button>${jobButton}</div></div>`;
  }).join("") || `<div class="empty">Маршрутизатор NDI не инициализирован.</div>`;
  const runtimeCell = (label, value) => `<div><span>${label}</span><strong class="runtime-${escapeHtml(value ?? "unknown")}" title="${escapeHtml(value ?? "unknown")}">${escapeHtml(runtimeStatusText(value))}</strong></div>`;
  const advanced = canOperateMedia() ? `<section class="media-console">
      ${pageHead("Камеры и трансляция", "Камеры зала, предпросмотр, эфир и выходы NDI")}
      <div class="runtime-strip">
        ${runtimeCell("FFmpeg", runtime?.ffmpeg?.status)}
        ${runtimeCell("NDI Runtime", runtime?.ndi?.runtimeStatus)}
        ${runtimeCell("NDI Bridge", runtime?.ndi?.bridgeStatus)}
        <button class="button button-quiet" data-action="refresh-media-runtime">Проверить медиасервисы</button>
      </div>
      <div class="switcher-grid">
        <article class="studio-monitor bus-preview"><header><span>Предпросмотр</span><strong>${escapeHtml(streamLabel(previewSource))}</strong></header><div id="studioPreviewStage" class="preview-stage studio-stage"><div class="preview-empty">Источник для предпросмотра не выбран</div></div></article>
        <article class="take-panel"><span class="auto-director-state ${autoDirectorEnabled ? "is-on" : "is-off"}">Автодиректор ${autoDirectorEnabled ? "включён" : "выключен"}</span><button class="take-button" data-action="take-program" ${manualDisabled} title="${manualTitle}">В эфир →</button><button class="button button-quiet" data-action="fade-program" ${manualDisabled} title="${manualTitle} с плавным переходом 0,5 с">Плавно</button></article>
        <article class="studio-monitor bus-program" aria-label="Эфир: ${escapeHtml(streamLabel(programSource))}"><div id="studioProgramStage" class="preview-stage studio-stage"><div class="preview-empty">Трансляция зала пока не сформирована</div></div></article>
      </div>
      ${autoDirectorStatus}
      ${participantsAndSourcesHtml()}
      <p class="hint">Камеры и постоянные источники добавляются в служебном интерфейсе: «Видео» → «Каталог источников».</p>
      <div class="grid grid-2"><article><h4>Источники зала</h4><div class="grid">${cameras}</div></article><article class="panel panel-pad ndi-output-panel"><h4 class="panel-title">Выходы NDI</h4><div class="ndi-output-list">${ndiOutputs}</div></article></div>
    </section>` : "";
  return `
    ${pageHead("Камеры и потоки", "Камеры и источники")}
    ${prestart ? `<p class="waiting-section">Конференция ещё не начата. Источники можно обнаружить и проверить; вывод в PGM доступен после запуска.</p>` : ""}
    ${canOperateMedia() ? "" : participantsAndSourcesHtml()}
    ${can("pgm.operate") && !prestart ? pgmModeHtml() : ""}
    ${can("floor.discussion") || can("floor.audio") ? audioConferenceHtml() : ""}
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
        if (state.mediaViews.get(stageId)?.node === wrapper) {
          if (existing?.node?.isConnected) {
            state.mediaViews.set(stageId, existing);
            wrapper.remove();
          }
          notify(`Preview: ${error.message}`, 2500);
        }
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
    wrapper.innerHTML = `<div class="preview-empty">${stream?.protocol === "webrtc" ? "Подключение к WebRTC-камере…" : stream?.status === "offline" ? "Источник временно недоступен. Ожидается повторная публикация…" : stream?.protocol === "external_uc" ? "Внешняя встреча сейчас не передаёт изображение." : "Для просмотра требуется HLS, WebRTC или MJPEG."}</div>`;
  }
  setMediaCaptions(wrapper, label || stream?.label, captions, showCaption);
  state.mediaViews.set(stageId, { key, node: wrapper, hls, imageObjectUrl: null });
  const isPersistentProgramStage = stageId === "programStage" || stageId === "studioProgramStage" ||
    stageId === "studioPreviewStage" || (stream?.syntheticKind === "document" && stageId.startsWith("source-thumb-"));
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
    // A still image is fetched with authenticated headers; never expose its
    // empty replacement over the last good frame while that request is pending.
    if (!(visual instanceof HTMLImageElement)) fallback = setTimeout(reveal, 1500);
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
  const program = { id: `program:${state.profile.meetingId}`, protocol: "webrtc", label: "Эфир" };
  watchProgramStream(program).catch((error) => notify(`Эфир: ${error.message}`, 4000));
  mountMediaView("studioProgramStage", program, state.programMedia, {
    label: "Эфир", controls: false, muted: true
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

let streamPreviewRelease = null;
function closeStreamPreviewModal({ reconcile = true } = {}) {
  document.removeEventListener("keydown", handleStreamPreviewKeydown);
  const release = streamPreviewRelease;
  streamPreviewRelease = null;
  release?.();
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
  const previewDialog = backdrop.querySelector(".stream-preview-dialog");
  streamPreviewRelease = openModal(previewDialog, { onEscape: () => closeStreamPreviewModal(),
    initialFocus: () => previewDialog.querySelector("[data-dialog-close]") });
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeStreamPreviewModal(); });
  backdrop.querySelector('[data-action="close-stream-preview"]')
    ?.addEventListener("click", (event) => { event.stopPropagation(); closeStreamPreviewModal(); }, { once: true });
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
    if (stage) stage.innerHTML = '<div class="preview-empty">Трансляция зала пока не началась.</div>';
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
  if (!canCastVotes()) return false;
  if (typeof vote?.eligibleForParticipant === "boolean") return vote.eligibleForParticipant;
  return !vote?.eligibleParticipantIds?.length || vote.eligibleParticipantIds.includes(state.participantId) ||
    (me?.userId && vote.eligibleParticipantIds.includes(me.userId));
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
      vote.status === "open" && isEligibleForVote(vote) && (!vote.ballotType || vote.ballotType === "single")
        ? `<button class="button vote-choice ${semantic} ${selected ? "button-selected" : ""}" aria-pressed="${selected}" data-action="cast-vote" data-vote-id="${vote.id}" data-option-id="${option.id}" ${selectedOptionId || vote.hasVoted || pendingOptionId ? "disabled" : ""}>${selected ? "✓ Выбрано" : vote.hasVoted ? "Голос принят" : pendingOptionId === option.id ? "Отправляем…" : "Выбрать"}</button>`
        : vote.results ? `<strong>${vote.results[option.id] || 0}</strong>` : ""
    }</div>`;
    }).join("");
    const ballot = vote.status === "open" && isEligibleForVote(vote) && !vote.hasVoted ? advancedBallot(vote) : "";
    const controls = canManageVotes() ? `<div class="action-strip" style="margin-top:12px">${
      vote.status === "draft" ? `<label class="inline-number">Время, сек. <input data-vote-duration="${vote.id}" type="number" min="10" max="86400" value="${vote.durationSeconds ?? 60}"></label>${can("pgm.tiles") ? `<button class="button button-secondary" data-action="configure-vote-result" data-vote-id="${vote.id}">Настройки показа</button>` : ""}<button class="button button-secondary" data-action="open-vote" data-vote-id="${vote.id}">Открыть</button><button class="button button-danger" data-action="delete-vote" data-vote-id="${vote.id}">Удалить проект</button>` : ""
    }${vote.status === "open" ? `<button class="button button-danger" data-action="close-vote" data-vote-id="${vote.id}">Закрыть</button>` : ""}${vote.status === "closed" && vote.finalResult?.nextRoundAllowed ? `<button class="button button-secondary" data-action="next-vote-round" data-vote-id="${vote.id}">Следующий тур</button>` : ""}</div>` : "";
    const remaining = vote.status === "open" && vote.closesAt ? Math.max(0, Math.ceil((Date.parse(vote.closesAt) - Date.now()) / 1000)) : null;
    const summary = vote.electorateSummary ?? {};
    const outcome = vote.outcome ?? vote.finalResult?.outcome;
    const outcomeClass = outcome === "accepted" ? "is-accepted" : ["rejected", "vetoed"].includes(outcome) ? "is-rejected" : "is-undetermined";
    return `<article class="panel list-item vote-card"><div class="list-item-head"><div><h3 class="vote-question">${escapeHtml(vote.topic ?? vote.question)}</h3><p>${escapeHtml(vote.question)}</p>${vote.status === "closed" ? `<p class="vote-outcome ${outcomeClass}"><strong>Результат:</strong> ${escapeHtml(voteOutcomeLabel(vote))}</p>` : ""}<p>${escapeHtml(VOTE_MODE_LABELS[vote.mode] ?? vote.mode)} · ${escapeHtml(VOTE_RULE_LABELS[vote.ruleSetId] ?? "Правило голосования")} · тур ${vote.round ?? 1} · приглашены ${summary.invitedEligible ?? "—"} · подключены ${summary.connectedNow ?? summary.connectedAtOpen ?? "—"} · проголосовали ${summary.ballotsCast ?? vote.ballotsCast ?? 0} · не проголосовали ${summary.notVoted ?? "—"}</p></div><div class="vote-card-status">${voteTimer(vote, remaining)}<span class="chip">${escapeHtml(VOTE_STATUS_LABELS[vote.status] ?? vote.status)}</span></div></div>${ballot || options}${controls}</article>`;
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
    return `<div id="materials-document-${escapeHtml(document.id)}" class="list-item document-list-row" data-material-document-id="${escapeHtml(document.id)}" tabindex="-1"><div class="list-item-head"><div class="document-row-main"><h4>${documentFormatIcon(document.fileName)}<span>${escapeHtml(document.fileName)}</span></h4><p>${escapeHtml(ownerName(document))} · ${formatBytes(document.sizeBytes)}</p>${document.sourceMeetingId ? `<p>Из завершённой конференции${document.sourceMeetingTitle ? ` «${escapeHtml(document.sourceMeetingTitle)}»` : ""}</p>` : ""}${document.agendaItemId ? `<p><strong>Повестка:</strong> ${escapeHtml(agenda?.title ?? "Вопрос повестки")}</p>` : ""}</div><div class="action-strip"><button class="button button-quiet" data-action="download-document" data-document-id="${document.id}">Открыть</button>${canManageContent() ? `<button class="button button-secondary" data-action="create-presentation" data-document-id="${document.id}" data-file-name="${escapeHtml(document.fileName)}">В показ</button>` : ""}${mine ? `<button class="button button-danger" data-action="delete-own-document" data-document-id="${document.id}">Удалить</button>` : ""}</div></div></div>`;
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
    return `<div class="list-item document-list-row"><div class="document-row-main"><h4>${documentFormatIcon(item.title)}<span>${escapeHtml(item.title)}</span></h4>${state.meeting?.quick && item.status === "active" ? `<p>Показ ведёт: ${escapeHtml(item.leaderName || (item.leaderAssigned ? "ведущий не назначен" : item.startedByName || "ведущий не назначен"))}</p>` : ""}</div><div class="action-strip">${item.status === "active" ? `<button class="button button-secondary" data-action="open-presentation-document" data-document-id="${item.documentId}" data-presentation-id="${item.id}">Открыть показ</button>` : ""}${canManageContent() ? item.status !== "active" ? `<button class="button button-secondary" data-action="start-presentation" data-presentation-id="${item.id}">Начать показ</button>` : `<button class="button button-danger" data-action="stop-presentation" data-presentation-id="${item.id}">Завершить показ</button>` : `<span class="chip">${escapeHtml(({ active: "Идёт показ", stopped: "Показ завершён", draft: "Не начат", ready: "Не начат" })[item.status] ?? "Не начат")}</span>`}</div></div>`;
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
    .map((participant) => `<div class="list-item"><div class="list-item-head"><div><h4>${escapeHtml(participant.displayName)}</h4><p>${escapeHtml(CONFERENCE_ROLE_LABELS[participant.role] ?? "Участник")}</p></div><button class="button button-quiet" data-action="open-chat" data-participant-id="${escapeHtml(participant.id)}">Открыть</button></div></div>`)
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
    : `<div class="empty">Канал готовится. Отправить сообщение можно будет через несколько секунд.</div>`;
  const dialog = active
    ? `<article class="panel chat-dialog"><div class="chat-dialog-head"><div><h4>${escapeHtml(partnerFor(active).displayName)}</h4><p>Сообщения доступны участникам диалога и хранятся до завершения конференции</p></div><span class="chip">${channelOpen ? "Прямой канал" : "Через сервер"}</span></div><div class="chat-log">${messages || emptyChat}</div><form id="chatForm" class="chat-compose"><input id="chatMessage" data-session-id="${escapeHtml(active.id)}" maxlength="1000" value="${escapeHtml(state.chatDrafts.get(active.id) ?? "")}" placeholder="Личное сообщение" autocomplete="off"><button class="button button-primary" type="submit">Отправить</button></form></article>`
    : `<article class="panel empty">Выберите участника или существующий диалог.</article>`;
  return `${pageHead("Личный чат", "Личные сообщения участников")}
    <div class="grid chat-layout"><article class="panel"><div class="panel-pad"><h4 class="panel-title">Участники</h4></div><div class="list">${participants}</div><div class="panel-pad"><h4 class="panel-title">Диалоги</h4><div class="chat-sessions">${sessions}</div></div></article>${dialog}</div>`;
}

function requestItemsText(request) {
  return request.items.map((item) => `${serviceRequestCategoryLabel(item, interfaceLocale())}${["tea", "coffee", "water", "stationery"].includes(item.category) ? ` × ${item.quantity}` : ""}`).join(", ");
}

function updateSignagePreviews() {
  const players = (state.signagePlayers ?? []).filter((item) => item.roomId === (state.meeting?.roomId ?? "default-room"));
  const draft = document.querySelector("#signageDraftPreview");
  const paint = (target, scene) => {
    if (!target) return;
    const title = scene?.title || "Контент не опубликован";
    const body = scene?.body || (scene?.type === "document" ? "Документ" : "");
    target.replaceChildren();
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    target.append(titleNode);
    if (body) {
      const bodyNode = document.createElement("span");
      bodyNode.textContent = body;
      target.append(bodyNode);
    }
    target.dataset.sceneType = scene?.type || "empty";
    target.dataset.roomStatus = scene?.roomStatus || "";
  };
  for (const player of players) {
    const current = [...document.querySelectorAll("[data-signage-current]")]
      .find((node) => node.dataset.signageCurrent === player.id);
    paint(current, player.currentScene);
    const status = current?.closest(".signage-screen-preview")?.querySelector("[data-signage-status]");
    if (status) status.textContent = player.online ? "В сети" : "Не в сети";
  }
  const summary = document.querySelector("#signageTargetSummary");
  if (summary) summary.textContent = `Выбрано экранов: ${(state.signageForm?.playerIds ?? []).length} из ${players.length}`;
  if (draft) {
    const form = state.signageForm ?? {};
    paint(draft, form.type === "document" ? { type: "document", title: state.documents.find((item) => item.id === form.documentId)?.fileName || "Документ не выбран" } :
      form.type === "schedule" ? { type: "schedule", title: "Повестка", body: "Текущая повестка зала" } :
      form.type === "room-status" ? { type: "room-status", title: "Статус зала", body: state.meeting?.title ?? "" } :
      form.type === "conference-status" ? { type: "conference-status", title: state.meeting?.title ?? "Конференция", body: state.meeting?.agenda?.find((item) => item.id === state.meeting.activeAgendaItemId)?.title ?? "Текущий вопрос не выбран" } :
      form.type === "active-agenda" ? { type: "active-agenda", title: "Активная повестка", body: state.meeting?.agenda?.find((item) => item.id === state.meeting.activeAgendaItemId)?.title ?? "Текущий вопрос не выбран" } :
        { type: "text", title: form.title?.trim() || "Заголовок не введён", body: form.body?.trim() || "" });
  }
}

function ucAutoState(plan) {
  const auto = plan.autoConnect;
  const labels = { pending: "Ожидает автоподключения", connecting: "Автоподключение…",
    retrying: "Повторное подключение", "waiting-capacity": "Ожидает свободного UC-канала",
    blocked: "Автоподключение заблокировано", failed: "Не удалось подключить автоматически",
    "manual-off": "Отключено вручную" };
  return { label: labels[auto?.state] ?? "", detail: auto?.lastError ?? "",
    busy: ["pending", "connecting", "retrying", "waiting-capacity"].includes(auto?.state) };
}

// Before the start the operator checks what the external meeting sends: its
// picture in the connection row and, on request, its sound.
function ucPreviewHtml(session, prestart) {
  if (!prestart || session?.state !== "connected" || !session.streamId) return "";
  const listening = state.ucPreviewListen?.has(session.streamId);
  const talking = Boolean(session.talkbackBy) || state.ucTalkbackSessionId === session.id;
  const who = session.virtual ? "участников" : "участника";
  return `<div class="uc-preview"><div class="uc-preview-stage" id="uc-preview-${escapeHtml(session.id)}" aria-label="Изображение из внешней встречи"></div><div class="uc-preview-actions"><button class="button button-quiet" data-action="uc-preview-listen" data-uc-stream-id="${escapeHtml(session.streamId)}" data-uc-session-id="${escapeHtml(session.id)}" aria-pressed="${listening ? "true" : "false"}" title="Микрофон в Zoom включается на время прослушивания и выключается при начале конференции">${listening ? `Не слушать ${who}` : `Слушать ${who}`}</button>${can("audio.operate") ? `<button class="button ${talking ? "button-primary" : "button-quiet"}" data-action="uc-talkback" data-uc-session-id="${escapeHtml(session.id)}" aria-pressed="${talking}" title="Сказать во внешнюю встречу: зал не слышит">${talking ? "Закончить разговор" : "Говорить"}</button>` : ""}<button class="button button-quiet" data-action="uc-test-tone" data-uc-session-id="${escapeHtml(session.id)}" title="Звук до участника: VOX-S отправит во внешнюю встречу короткий сигнал">Отправить сигнал ${session.virtual ? "участникам" : "участнику"}</button></div></div>`;
}

async function mountUcPreviews() {
  state.ucPreviewListen ??= new Set();
  for (const session of state.ucControl?.sessions ?? []) {
    const stageId = `uc-preview-${session.id}`;
    if (!session.streamId || !document.getElementById(stageId)) continue;
    const stream = { id: session.streamId, protocol: "external_uc", label: session.displayName ?? "Внешняя встреча" };
    try {
      const media = mediaForStream(stream) ?? await subscribeMcuStream(stream, { includeVideo: true, includeAudio: true });
      if (!document.getElementById(stageId)) continue;
      mountMediaView(stageId, stream, media, { label: stream.label, controls: false,
        muted: !state.ucPreviewListen.has(session.streamId) });
      // A virtual hall's picture has no sound: each member is heard from their own source.
      if (session.virtual) await mountUcMemberAudio(session, state.ucPreviewListen.has(session.streamId));
    } catch (error) {
      const stage = document.getElementById(stageId);
      if (stage && !stage.childElementCount) stage.textContent = `Нет изображения: ${error.message}`;
    }
  }
}

async function mountUcMemberAudio(session, listening) {
  state.ucMemberAudio ??= new Map();
  const wanted = new Set(listening ? (session.members ?? []).map((member) => member.streamId).filter(Boolean) : []);
  for (const [streamId, element] of state.ucMemberAudio) {
    if (element.dataset.ucSessionId === session.id && !wanted.has(streamId)) { element.srcObject = null; element.remove(); state.ucMemberAudio.delete(streamId); }
  }
  for (const streamId of wanted) {
    if (state.ucMemberAudio.has(streamId)) continue;
    const stream = { id: streamId, protocol: "external_uc", label: "Участник Zoom" };
    const media = mediaForStream(stream) ?? await subscribeMcuStream(stream, { includeVideo: false, includeAudio: true });
    const element = document.createElement("audio");
    element.autoplay = true; element.hidden = true; element.dataset.ucSessionId = session.id;
    element.srcObject = media;
    document.body.append(element);
    state.ucMemberAudio.set(streamId, element);
    element.play?.().catch(() => {});
  }
}

async function playUcTestTone(target) {
  const sessionId = target?.dataset?.ucSessionId;
  if (!sessionId) return;
  target.disabled = true;
  try {
    await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/uc-control/sessions/${encodeURIComponent(sessionId)}/test-tone`, {});
    notify("Сигнал отправлен. Спросите участника, слышал ли он его");
  } catch (error) { notify(error); }
  finally { target.disabled = false; }
}

function toggleUcPreviewListen(target) {
  const streamId = target?.dataset?.ucStreamId;
  if (!streamId) return;
  state.ucPreviewListen ??= new Set();
  if (state.ucPreviewListen.has(streamId)) state.ucPreviewListen.delete(streamId);
  else state.ucPreviewListen.add(streamId);
  const listening = state.ucPreviewListen.has(streamId);
  const who = (globalThis.VoxLocale?.sourceText(target) ?? target.textContent).includes("участников") ? "участников" : "участника";
  target.textContent = listening ? `Не слушать ${who}` : `Слушать ${who}`;
  target.setAttribute("aria-pressed", String(listening));
  // Before the start the Zoom microphone follows listening: lifted while heard, muted again after.
  const sessionId = target.dataset.ucSessionId;
  if (sessionId) {
    state.api.put(`/meetings/${encodeURIComponent(state.profile.meetingId)}/uc-sessions/${encodeURIComponent(sessionId)}/preview-listen`,
      { on: listening }).catch((error) => notify(error));
  }
  void mountUcPreviews();
}

// A virtual hall is named as a hall, never after one of its members.
function ucHallTitle(title) {
  const value = String(title ?? "").trim();
  const personal = !value || value === "Персональное подключение" ||
    (state.meeting?.preparedParticipants ?? []).some((person) => person.displayName?.trim() === value);
  return personal ? "Виртуальный зал Zoom" : value;
}

// A virtual hall lists its members: several people join through one connection.
function ucPlanKindText(plan) {
  if (plan.kind === "room") return "удалённый зал";
  if (plan.kind !== "virtual") return "персональное подключение";
  const names = (plan.memberIds ?? []).map((id) => state.meeting?.preparedParticipants?.find((person) => person.id === id && !person.excludedAt)?.displayName)
    .filter(Boolean);
  return `виртуальный зал · участников: ${(plan.memberIds ?? []).length}${names.length ? ` (${names.join(", ")})` : ""}`;
}

function ucControlHtml(prestart = false) {
  if (!["operator", "secretary", "admin"].includes(state.profile.role) || !can("conference.lifecycle")) return "";
  const control = state.ucControl;
  if (!control) return "";
  const adapters = new Map((control.adapters ?? []).map((item) => [item.id, item]));
  const atCapacity = control.usedCapacity >= control.capacity;
  const sessions = control.sessions ?? [];
  const plans = (control.plans ?? []).map((plan) => {
    const adapter = adapters.get(plan.providerId);
    const session = sessions.find((item) => item.connectionPlanId === plan.id);
    const auto = ucAutoState(plan);
    const supported = adapter?.capabilities?.join && (plan.mode !== "create" || adapter.capabilities.create);
    const reason = !supported ? "Адаптер этой платформы не установлен или не лицензирован"
      : plan.mode === "existing" && !plan.targetConfigured ? "Ссылка на встречу не указана"
        : atCapacity && !session ? "Достигнут лимит одновременных UC-подключений" : "";
    const action = session ? `<span class="chip">${session.state === "connecting" ? "Подключается" : "Подключена"}</span><button class="button button-quiet" data-action="uc-disconnect" data-uc-session-id="${escapeHtml(session.id)}">Отключить</button>`
      : auto.busy ? `<span class="chip" role="status">${escapeHtml(auto.label)}</span>`
        : `<button class="button button-secondary" data-action="uc-connect-plan" data-plan-id="${escapeHtml(plan.id)}" ${reason ? `disabled title="${escapeHtml(reason)}"` : ""}>Подключить UC</button>`;
    return `<div class="uc-control-row${prestart && session ? " has-preview" : ""}"><div><strong>${escapeHtml(plan.kind === "virtual" ? ucHallTitle(plan.title) : plan.title)}</strong><small>${escapeHtml(adapter?.name ?? plan.providerId)} · ${ucPlanKindText(plan)}</small>${reason ? `<small>${escapeHtml(reason)}</small>` : ""}${!session && auto.label && !auto.busy ? `<small role="status">${escapeHtml(auto.label)}${auto.detail ? ` · ${escapeHtml(auto.detail)}` : ""}</small>` : ""}${auto.busy && auto.detail ? `<small>${escapeHtml(auto.detail)}</small>` : ""}${ucPreviewHtml(session, prestart)}</div><div class="uc-control-actions">${action}</div></div>`;
  }).join("");
  const unplanned = sessions.filter((item) => !item.connectionPlanId).map((session) =>
    `<div class="uc-control-row"><div><strong>${escapeHtml(adapters.get(session.providerId)?.name ?? session.providerId)}</strong><small>Подключение вне плана · ${session.state === "connecting" ? "подключается" : "подключено"}</small>${ucPreviewHtml(session, prestart)}</div><div class="uc-control-actions"><button class="button button-quiet" data-action="uc-disconnect" data-uc-session-id="${escapeHtml(session.id)}">Отключить</button></div></div>`).join("");
  // Both callers insert this markup synchronously; the previews attach right after.
  if (prestart && sessions.some((item) => item.streamId && item.state === "connected")) queueMicrotask(() => void mountUcPreviews());
  return `<section class="${prestart ? "waiting-section" : "panel panel-pad"} uc-control" aria-label="Внешние встречи"><div class="uc-control-heading"><div><h3>Внешние встречи</h3><p>${prestart ? "Подключите внешнюю встречу для проверки до начала конференции. Звук и PGM зала отправятся в неё только после запуска." : "Подключите запланированную встречу или присоединитесь к уже идущей."}</p><small>Лицензия: ${escapeHtml(control.usedCapacity)} из ${escapeHtml(control.capacity)} одновременных подключений</small></div>${!prestart && adapters.size ? `<button class="button button-secondary" data-action="uc-connect-live" ${atCapacity ? 'disabled title="Достигнут лимит одновременных UC-подключений"' : ""}>Подключиться к идущей UC</button>` : ""}</div><div class="uc-control-list">${plans || (prestart ? `<p class="waiting-empty">В подготовке UC-подключения не указаны.</p>` : "")}${unplanned}</div>${!adapters.size ? `<p class="waiting-empty">Нет доступного лицензированного UC-адаптера.</p>` : ""}</section>`;
}

function operationsHtml() {
  const role = state.profile.role;
  const canDevices = ["operator", "technician", "admin"].includes(role);
  const canReadiness = ["chair", "secretary", "operator", "technician", "admin"].includes(role);
  const canSignage = can("signage.manage");
  const canService = can("service.requests") || can("service.requests.supervise");
  const canAes67 = ["operator", "technician", "admin"].includes(role);
  const readiness = canReadiness && (state.readiness?.status !== "unconfigured" || state.devices.length > 0) ? `<article class="panel panel-pad"><div class="list-item-head"><div><h4 class="panel-title">Готовность зала</h4><p>${state.readiness?.status === "unconfigured" ? "Проверка не настроена: обязательные устройства не зарегистрированы" : state.readiness ? `${state.readiness.onlineDevices}/${state.readiness.requiredDevices} обязательных устройств доступны` : "Проверка не выполнялась"}</p></div><span class="chip ${state.readiness?.status === "ready" ? "" : "offline"}">${escapeHtml(({ ready: "Готов", warning: "Предупреждение", "not-ready": "Не готов", unconfigured: "Не настроено" })[state.readiness?.status] ?? "Не проверено")}</span></div>${(state.readiness?.checks ?? []).map((check) => `<p class="readiness-check">${escapeHtml(check.label ?? state.devices.find((item) => item.id === check.deviceId)?.name ?? check.deviceId)} · ${escapeHtml(({ online: "В сети", offline: "Не в сети", warning: "Предупреждение", disabled: "Выключено" })[check.status] ?? check.status)}${check.error ? ` · ${escapeHtml(check.error)}` : ""}</p>`).join("")}<div class="action-strip"><button class="button button-secondary" data-action="check-readiness">Проверить зал</button></div></article>` : "";
  const devices = canDevices ? `<article class="panel"><div class="panel-pad"><h4 class="panel-title">Устройства зала</h4></div><div class="list">${state.devices.map((device) => `<div class="list-item"><div class="list-item-head"><div><h4>${escapeHtml(device.name)}</h4><p>${escapeHtml(device.kind)} · ${escapeHtml(device.driverId)} · ${escapeHtml(device.id)}</p></div><span class="chip ${device.health?.status === "online" ? "" : "offline"}" title="${escapeHtml(device.health?.status ?? "unknown")}">${escapeHtml(runtimeStatusText(device.health?.status))}</span></div><div class="action-strip compact"><button class="button button-quiet" data-action="check-device" data-device-id="${device.id}">Проверить</button><button class="button button-quiet" data-action="device-command" data-device-id="${device.id}">Команда</button></div></div>`).join("") || `<div class="empty">Устройства не зарегистрированы.</div>`}</div></article>` : "";
  const roomPlayers = state.signagePlayers.filter((player) => player.roomId === (state.meeting.roomId ?? "default-room"));
  const signageDocuments = state.documents.filter((item) => item.meetingId === state.profile.meetingId);
  const signageForm = state.signageForm ?? { playerId: "", type: "text", title: "", body: "", documentId: "" };
  if (signageForm.playerId && !roomPlayers.some((player) => player.id === signageForm.playerId)) signageForm.playerId = "";
  if (!signageDocuments.some((item) => item.id === signageForm.documentId)) {
    signageForm.documentId = signageDocuments[0]?.id ?? "";
  }
  if (!signageForm.targetsInitialized) {
    signageForm.playerIds = roomPlayers.map((player) => player.id);
    signageForm.targetsInitialized = true;
  }
  signageForm.playerIds = (signageForm.playerIds ?? []).filter((id) => roomPlayers.some((player) => player.id === id));
  const currentPreviews = roomPlayers.map((player) => `<section class="signage-screen-preview"><div class="signage-preview-head"><strong>${escapeHtml(player.name || player.id)}</strong><small class="signage-online ${player.online ? "is-online" : "is-offline"}" data-signage-status>${player.online ? "В сети" : "Не в сети"}</small></div><div class="signage-preview-surface" data-signage-current="${escapeHtml(player.id)}"></div><label class="signage-target-choice"><input type="checkbox" data-signage-target value="${escapeHtml(player.id)}" ${(signageForm.playerIds ?? []).includes(player.id) ? "checked" : ""}><span>Отправлять на этот экран</span></label></section>`).join("") || `<div class="signage-preview signage-empty"><strong>Экранов пока нет</strong><span>Сначала добавьте вывеску в настройках системы.</span></div>`;
  const signagePreviews = `<p class="signage-target-instruction">Экраны для отправки выбираются под их превью.</p><div class="signage-preview-heading"><strong>Черновик</strong><strong>Сейчас на экранах</strong></div><div class="signage-preview-grid"><section class="signage-preview signage-draft-preview"><div class="signage-preview-head"><strong>После отправки</strong><small>Черновик</small></div><div class="signage-preview-surface" id="signageDraftPreview"></div></section><div class="signage-current-grid">${currentPreviews}</div></div>`;
  const signage = canSignage ? `<article class="panel panel-pad signage-control"><div class="signage-title-row"><div><h4 class="panel-title">Вывески</h4><p>${roomPlayers.length ? "Публикуйте статус или сообщение на экранах зала." : "Для этого зала ещё не зарегистрирован экран."}</p></div><span class="chip ${roomPlayers.some((player) => player.online) ? "" : "offline"}">${roomPlayers.filter((player) => player.online).length} из ${roomPlayers.length} в сети</span></div><p class="signage-target-summary" id="signageTargetSummary" aria-live="polite">Выбрано экранов: ${(signageForm.playerIds ?? []).length} из ${roomPlayers.length}</p>${signagePreviews}<section class="signage-compose"><h5>Отправить сообщение, расписание или документ</h5><div class="signage-compose-fields"><label>Тип содержимого<select id="signageSceneType"><option value="text" ${signageForm.type === "text" ? "selected" : ""}>Сообщение</option><option value="schedule" ${signageForm.type === "schedule" ? "selected" : ""}>Расписание</option><option value="document" ${signageForm.type === "document" ? "selected" : ""}>Документ</option><option value="room-status" ${signageForm.type === "room-status" ? "selected" : ""}>Статус зала</option><option value="conference-status" ${signageForm.type === "conference-status" ? "selected" : ""}>Статус конференции</option><option value="active-agenda" ${signageForm.type === "active-agenda" ? "selected" : ""}>Активная повестка</option><option value="participant-call" ${signageForm.type === "participant-call" ? "selected" : ""}>Вызов докладчика</option></select></label><label data-signage-text ${["text", "participant-call"].includes(signageForm.type) ? "" : "hidden"}><span id="signageSceneTitleLabel">${signageForm.type === "participant-call" ? "ФИО" : "Заголовок"}</span><input id="signageSceneTitle" maxlength="160" autocomplete="off" placeholder="Например, регистрация участников" value="${escapeHtml(signageForm.title)}"></label><label data-signage-text ${["text", "participant-call"].includes(signageForm.type) ? "" : "hidden"}>Текст<textarea id="signageSceneBody" rows="3" maxlength="2000" placeholder="Дополнительная информация">${escapeHtml(signageForm.body)}</textarea></label><div class="signage-document-fields" data-signage-document ${signageForm.type === "document" ? "" : "hidden"}><label>Документ<select id="signageSceneDocument">${signageDocuments.map((item) => `<option value="${escapeHtml(item.id)}" ${signageForm.documentId === item.id ? "selected" : ""}>${escapeHtml(item.fileName)}</option>`).join("")}</select></label>${can("documents.upload") ? `<label class="button button-quiet signage-file-button">Загрузить с диска<input id="signageDocumentUpload" class="file-input" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.odt,.odp,.png,.jpg,.jpeg" aria-label="Загрузить документ с диска для экрана"></label>` : ""}</div><div class="signage-compose-actions"><button class="button button-primary" data-action="publish-signage-scene" ${roomPlayers.length ? "" : "disabled"}>Отправить на экран</button><a class="button button-quiet" href="/service/?tab=signage-core" target="_blank" rel="noopener">Настройки вывесок</a></div></div></section><p class="signage-feedback" id="signageFeedback" role="status" aria-live="polite">${escapeHtml(state.signageFeedback ?? "")}</p></article>` : "";
  const aes67Running = ["starting", "running"].includes(state.aes67?.state);
  const aes67 = canAes67 ? `<article class="panel panel-pad"><div class="list-item-head"><div><h4 class="panel-title">AES67 / RTP L24</h4><p>${escapeHtml(state.aes67?.settings?.name ?? "VOX-S Program Audio")} · ${escapeHtml(state.aes67?.settings?.bus ?? "program")} · автозапуск при старте конференции</p></div><span class="chip ${state.aes67?.state === "running" ? "" : "offline"}">${escapeHtml(state.aes67?.state ?? "stopped")}</span></div>${state.aes67?.error ? `<p class="form-error">${escapeHtml(state.aes67.error)}</p>` : ""}<div class="action-strip"><button class="button ${aes67Running ? "button-danger" : "button-secondary"}" data-action="${aes67Running ? "stop-aes67" : "start-aes67"}">${aes67Running ? "Выключить AES67" : "Включить AES67"}</button></div></article>` : "";
  return `${pageHead("Операции", "Зал, вывески и сервис")}${ucControlHtml()}<div class="grid grid-2 operations-grid ${canSignage ? "has-signage" : ""}">${serviceCardHtml()}${signage}${devices}${readiness}</div>`;
}

const SERVICE_ACTIVE = new Set(["new", "accepted", "needs-clarification", "in-progress", "delivered", "not-delivered"]);
const SERVICE_PRIORITY = { critical: 0, medium: 1, normal: 2 };

function serviceMinutes(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return minutes < 1 ? "меньше минуты" : `${minutes} мин`;
}

function serviceLastNote(request) {
  return [...(request.history ?? [])].reverse().find((entry) => entry.note)?.note ?? "";
}

// Staff (technician, service): the place first, then who and what, how long it
// waits and who has it; one button per next step of the request.
function serviceStaffCard(request) {
  const next = {
    new: [["accepted", "Принять"], ["rejected", "Отклонить", "danger"]],
    accepted: [["in-progress", "В работу"], ["needs-clarification", "Уточнить"]],
    "needs-clarification": [["accepted", "Принять снова"]],
    "in-progress": [["delivered", "Выполнено"], ["needs-clarification", "Уточнить"]],
    "not-delivered": [["in-progress", "Снова в работу"], ["closed", "Закрыть"]],
    delivered: [["closed", "Закрыть"]]
  }[request.status] ?? [];
  const waiting = request.status === "new" ? `ждёт ${serviceMinutes(request.createdAt)}` : `${serviceRequestStatusLabel(request.status, interfaceLocale()).toLowerCase()} · ${serviceMinutes(request.updatedAt)}`;
  const note = serviceLastNote(request);
  const canAssign = request.status === "new" || can("service.requests.supervise") && SERVICE_ACTIVE.has(request.status);
  const assigneePicker = canAssign && state.serviceAssignees?.length ? `<div class="service-assignee-control"><label>Исполнитель
    <select data-service-assignee aria-label="Исполнитель заявки"><option value="">${request.status === "new" ? "Принять самому" : "Выберите сотрудника"}</option>
    ${state.serviceAssignees.map((person) => `<option value="${escapeHtml(person.id)}" ${request.assignedToId === person.id ? "selected" : ""}>${escapeHtml(person.displayName)}</option>`).join("")}</select></label>
    ${request.status === "new" ? "" : `<button type="button" class="button button-secondary" data-action="service-reassign" data-request-id="${escapeHtml(request.id)}">Переназначить</button>`}</div>` : "";
  return `<div class="list-item service-request service-${escapeHtml(request.priority ?? "normal")}" data-service-request="${escapeHtml(request.id)}">
    <div class="service-request-place"><strong>${escapeHtml(request.seatLabel && request.seatLabel !== "не указано" ? `Место ${request.seatLabel}` : "Место не указано")}</strong><span>${escapeHtml(request.roomName ?? "")}${request.locationNote ? ` · ${escapeHtml(request.locationNote)}` : ""}</span></div>
    <div class="list-item-head"><div><h4>${escapeHtml(requestItemsText(request))}</h4><p>${escapeHtml(request.participantName)}${request.comment ? ` · ${escapeHtml(request.comment)}` : ""}</p>${note ? `<p class="service-note">${escapeHtml(note)}</p>` : ""}</div>
      <span class="chip ${request.priority === "critical" ? "danger" : ""}">${escapeHtml(waiting)}</span></div>
    ${request.assignedTo ? `<p class="service-assignee">В работе у: <strong>${escapeHtml(request.assignedTo)}</strong></p>` : ""}
    ${request.cameraSnapshot ? `<img class="service-snapshot" src="${escapeHtml(request.cameraSnapshot)}" alt="Снимок с камеры участника">` : ""}
    ${assigneePicker}
    <div class="action-strip compact">${next.map(([status, label, tone]) =>
      `<button class="button ${tone === "danger" ? "button-danger" : "button-secondary"}" data-action="service-status" data-request-id="${escapeHtml(request.id)}" data-status="${status}">${label}</button>`).join("")}</div></div>`;
}

// The participant: where the request is, a question from the staff, and the
// answer the participant can give at this step.
function serviceParticipantCard(request) {
  const note = serviceLastNote(request);
  const actions = request.status === "delivered"
    ? [["closed", "Всё в порядке", "button-primary"], ["not-delivered", "Не выполнено", "button-secondary"]]
    : ["new", "accepted", "needs-clarification"].includes(request.status) ? [["cancelled", "Отменить", "button-quiet"]] : [];
  return `<div class="list-item service-request" data-service-request="${escapeHtml(request.id)}"><div class="list-item-head"><div><h4>${escapeHtml(requestItemsText(request))}</h4>
    <p>${escapeHtml(serviceRequestProgress(request, interfaceLocale()))}${SERVICE_ACTIVE.has(request.status) ? ` · ${escapeHtml(serviceMinutes(request.updatedAt))}` : ""}${request.assignedTo && SERVICE_ACTIVE.has(request.status) ? ` · ${escapeHtml(request.assignedTo)}` : ""}</p>
    ${note ? `<p class="service-note">Персонал: ${escapeHtml(note)}</p>` : ""}</div>
    <span class="chip ${SERVICE_ACTIVE.has(request.status) ? "" : "offline"}">${escapeHtml(serviceRequestStatusLabel(request.status, interfaceLocale()))}</span></div>
    ${actions.length ? `<div class="action-strip compact">${actions.map(([status, label, tone]) => `<button class="button ${tone}" data-action="service-confirm" data-request-id="${escapeHtml(request.id)}" data-status="${status}">${label}</button>`).join("")}</div>` : ""}</div>`;
}

function serviceRoomPlanHtml() {
  const room = state.serviceRoomPlan;
  if (!room || !productModuleEnabled("roomPlannerPro") || !Number(room.widthMm) || !Number(room.heightMm)) return "";
  const activeStations = new Set(state.serviceRequests.filter((request) => SERVICE_ACTIVE.has(request.status))
    .map((request) => request.stationId));
  const stations = (room.stations ?? []).map((station) => {
    const x = Math.max(0, Math.min(100, Number(station.xMm) / Number(room.widthMm) * 100));
    const y = Math.max(0, Math.min(100, Number(station.yMm) / Number(room.heightMm) * 100));
    return `<span class="service-plan-seat${activeStations.has(station.id) ? " has-request" : ""}" style="left:${x}%;top:${y}%"
      title="${escapeHtml(station.name)}" aria-label="Место ${escapeHtml(station.number)}: ${escapeHtml(station.name)}">${escapeHtml(station.number)}</span>`;
  }).join("");
  return `<details class="service-room-plan"><summary>План зала · ${escapeHtml(room.name)}</summary><div class="service-plan-map"
    role="img" aria-label="План зала ${escapeHtml(room.name)} с отмеченными местами обслуживания">${stations}</div>
    <p>Красным отмечены места с активными заявками.</p></details>`;
}

// Service calls card: on the Service tab and as a block of the conference workspace.
function serviceCardHtml(extraClass = "") {
  const role = state.profile.role;
  const canService = can("service.requests") || can("service.requests.supervise");
  const requestButton = !["observer", "service", "technician"].includes(role) ? `<button class="button button-primary" data-action="service-request">Вызвать персонал</button>` : "";
  const seatButton = ["delegate", "operator"].includes(role) ? `<button class="button button-secondary" data-action="change-room-seat">Изменить место</button>` : "";
  const filter = state.serviceFilter ?? "active";
  const ordered = [...state.serviceRequests].sort((a, b) => (SERVICE_ACTIVE.has(b.status) - SERVICE_ACTIVE.has(a.status)) ||
    ((SERVICE_PRIORITY[a.priority] ?? 2) - (SERVICE_PRIORITY[b.priority] ?? 2)) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const visible = canService ? ordered.filter((request) => filter === "all" ||
    (filter === "mine" ? (request.assignedToId === state.profile.userId || !request.assignedToId && request.assignedTo === state.profile.displayName) && SERVICE_ACTIVE.has(request.status) : SERVICE_ACTIVE.has(request.status)))
    : ordered;
  const filters = canService ? `<div class="segmented service-filter" role="group" aria-label="Какие заявки показать">${[["active", "Активные"], ["mine", "Мои"], ["all", "Все"]].map(([value, label]) =>
    `<button class="button ${filter === value ? "button-primary" : "button-quiet"}" data-action="service-filter" data-filter="${value}" aria-pressed="${filter === value}">${label}</button>`).join("")}</div>` : "";
  const cards = visible.map((request) => canService ? serviceStaffCard(request) : serviceParticipantCard(request)).join("");
  const requests = cards;
  return `<article class="panel ${extraClass}"><div class="panel-pad"><div class="list-item-head"><div><h4 class="panel-title">${uiText("service.title")}</h4><p>${uiText("service.description")}</p></div><div class="action-strip compact service-card-actions">${seatButton}${requestButton}</div></div>${canService ? serviceRoomPlanHtml() : ""}${filters}</div><div class="list">${requests || `<div class="empty">${uiText("service.empty")}</div>`}</div></article>`;
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
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Версия сервера</h4><div class="status-row"><span>Релиз</span><code>${state.systemStatus?.version ? `v${escapeHtml(state.systemStatus.version)}` : "—"}</code></div><div class="status-row"><span>Сборка</span><code>${escapeHtml(state.systemStatus?.build ?? "—")}</code></div></article>
      ${pinPanel}
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Подключение</h4><div class="status-row"><span>Сервер</span><code>${escapeHtml(state.profile.serverUrl)}</code></div><div class="status-row"><span>Конференция</span><code>${escapeHtml(state.meeting?.title ?? state.profile.meetingId)}</code></div><div class="status-row"><span>Устройство</span><code>${escapeHtml(state.profile.deviceId)}</code></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Терминал</h4><div class="status-row"><div><strong>${escapeHtml(state.profile.displayName)}</strong><br><small>${escapeHtml(state.profile.deviceId)}</small></div><span class="chip">онлайн</span></div><div class="status-row"><div><strong>Лицензия места</strong><br><small>${escapeHtml(state.leaseId)}</small></div><span>${escapeHtml(CONFERENCE_ROLE_LABELS[state.profile.role] ?? "Участник")}</span></div></article>
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Доверие HTTPS</h4><p>Если браузер показывает предупреждение сертификата, установите локальный корневой сертификат VOX-S на планшет.</p><a class="button button-secondary" href="/client/root-ca.cer" download>Скачать сертификат</a></article>
      <article class="panel panel-pad settings-block"><h4 class="panel-title">Установка как приложение</h4><p>Android: установите через меню Chrome. iPad: «Поделиться» → «На экран Домой».</p><div class="action-strip"><button class="button button-quiet" data-action="install-pwa">Установить как приложение</button></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Камера и микрофон на этом устройстве</h4><p>Сейчас: камера ${localStorage.getItem(CAMERA_AUTO_KEY) === "off" ? "не включается" : "включается"}, микрофон ${localStorage.getItem(MICROPHONE_AUTO_KEY) === "off" ? "не подключается" : "подключается"} при входе. Выбор сохранится в браузере; системное разрешение меняется в настройках устройства.</p><div class="action-strip"><button class="button button-secondary" data-action="toggle-auto-camera-pref" aria-pressed="${localStorage.getItem(CAMERA_AUTO_KEY) !== "off"}">${localStorage.getItem(CAMERA_AUTO_KEY) === "off" ? "Включать камеру при входе" : "Не включать камеру при входе"}</button><button class="button button-secondary" data-action="toggle-auto-microphone-pref" aria-pressed="${localStorage.getItem(MICROPHONE_AUTO_KEY) !== "off"}">${localStorage.getItem(MICROPHONE_AUTO_KEY) === "off" ? "Подключать микрофон при входе" : "Не подключать микрофон при входе"}</button></div></article>
      <article class="panel panel-pad"><h4 class="panel-title">Полноэкранный режим</h4><p>Убирает адресную строку браузера прямо во вкладке, без установки приложения.</p><button class="button button-quiet" data-action="toggle-fullscreen">${document.fullscreenElement ? "Выйти из полноэкранного" : "На весь экран"}</button></article>
      ${canConfigureAutoDirector ? `<article class="panel panel-pad"><h4 class="panel-title">Автопереключение трансляции</h4><p>Трансляция зала следует за выступающим. При выключении источник выбирается вручную.</p><button class="button button-secondary" data-action="toggle-auto-director">${state.routing?.autoDirector?.enabled ? "Выключить" : "Включить"} автопереключение</button></article>` : ""}
      ${["operator", "technician", "admin"].includes(state.profile.role) ? `<article class="panel panel-pad"><div class="list-item-head"><div><h4 class="panel-title">AES67 / RTP L24</h4><p>${escapeHtml(state.aes67?.settings?.name ?? "VOX-S Program Audio")} · ${escapeHtml(state.aes67?.settings?.bus ?? "program")}</p></div><span class="chip ${state.aes67?.state === "running" ? "" : "offline"}">${escapeHtml(state.aes67?.state ?? "stopped")}</span></div>${state.aes67?.error ? `<p class="form-error">${escapeHtml(state.aes67.error)}</p>` : ""}<div class="action-strip"><button class="button ${["starting", "running"].includes(state.aes67?.state) ? "button-danger" : "button-secondary"}" data-action="${["starting", "running"].includes(state.aes67?.state) ? "stop-aes67" : "start-aes67"}">${["starting", "running"].includes(state.aes67?.state) ? "Выключить AES67" : "Включить AES67"}</button></div></article>` : ""}
    </div>`;
}

// Non-WebRTC tiles (e.g. an RTSP/HLS room camera) have no MCU producer to
// compose server-side, so they keep rendering individually, same as before.
// Streams the server has as MCU producers: participants' WebRTC cameras and
// room cameras it ingested (RTSP/HLS/NDI/MJPEG). They are part of the server
// Multiview mosaic; anything else is shown as its own preview tile.

export { toggleUcPreviewListen, playUcTestTone, canEditWorkspaceLayout, handleWorkspaceUiAction, applyWorkspaceLayout, renderPage, updateNavigationVisibility, translationHtml, unreadChatCount, updateChatNotice,
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
  contentHtml, partnerFor, chatPartnerId, isLiveChatSession, closeChatSessionLocally, reconcileChatSessions, ucControlHtml,
  chatHtml, requestItemsText, operationsHtml, settingsHtml, updateSignagePreviews, updateSecretaryWorkspace, refreshVoteResultsModal };
