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
  applyAudioMeters, setEventConnectionStatus, startEventStream, refreshProgram, refreshAll, updateBuildLabels,
  selectTab, activateStreamsPreview, syncSourceWall, budgetedThumbnailStreams, disconnect, exitClosedConference,
  handleMicrophoneAction, bootstrapClient, renderPage, updateNavigationVisibility, translationHtml,
  unreadChatCount, updateChatNotice, markChatRead, pageHead, VOTE_OUTCOME_LABELS, advancedBallot,
  voteOutcomeLabel, conferenceVoteCard, conferenceVoteStatusCard, closeVoteResultsModal, openVoteResultsModal,
  microphoneIcon, renderMicrophoneDock, renderFixedControls, can, pgmModeHtml, hydrateSlatePreviews,
  uploadPgmSlate, selectPgmSlate, deletePgmSlate, syncSecretaryTurn, secretarySpeakersHtml, secretaryWorkspaceHtml,
  saveSecretaryTranscript, saveSecretaryEditor, clearSecretaryEditor, secretaryLayoutPanel, moveSecretaryLayoutPanel,
  handleSecretaryLayoutAction, secretaryLayoutGesture, startSecretaryLayoutGesture, moveSecretaryLayoutGesture,
  finishSecretaryLayoutGesture, conferenceHtml, audioConferenceHtml, canOperateMedia, streamLabel,
  actionIcon, streamStatusHtml, participantsAndSourcesHtml, streamsHtml, localAvDevicesHtml, absoluteMediaUrl,
  resumeVideoElement, programCaption, normalizedCaption, setMediaCaptions, mountMediaView, mountStudioMonitors,
  stopThumbnailLoop, drawThumbnails, mountStreamThumbnails, handleStreamPreviewKeydown, closeStreamPreviewModal,
  openStreamPreviewModal, mountStreamPreviewModal, mountProgram, canManageVotes, canCastVotes,
  isEligibleForVote, canViewFiles, canUploadFiles, canShareScreen, canSpeak, votingHtml, canManageContent,
  contentHtml, partnerFor, chatPartnerId, isLiveChatSession, closeChatSessionLocally, reconcileChatSessions,
  chatHtml, requestItemsText, operationsHtml, settingsHtml, encodeIdentityHeader, observeBottomControls,
  serviceRequestCategoryLabel, serviceRequestStatusLabel, serviceRequestCategoryOptions, eventRetryDelay,
  PARTICIPANT_LANGUAGES, participantLanguage, setParticipantLanguage, participantText, openDocumentViewer,
  closeDocumentViewer, updateDocumentViewerRights, updateDocumentViewerBadge, documentSceneEvent
} from "./app.js";

function inMcu(stream) {
  return stream.protocol === "webrtc" || (state.programDescriptor?.mcuVideoStreamIds ?? []).includes(stream.id);
}

async function runAction(action, success = null) {
  try {
    const result = await action();
    if (result === false) return;
    if (success) notify(success);
    await refreshAll();
  } catch (error) {
    notify(error.message);
  }
}

async function requestFloor() {
  // Safari/iPadOS may reject or postpone getUserMedia even after a visible
  // tap.  A media permission error must never swallow the floor request.
  const microphonePreparation = ensureMicrophone().catch((error) => {
    notify(`Запрос слова принят; микрофон пока недоступен: ${error.message}`);
    return null;
  });
  const participant = await state.api.post(`/meetings/${state.profile.meetingId}/floor/request`, { participantId: state.participantId });
  // Audio is normally pre-published muted during join. If Safari delayed the
  // permission prompt, complete that recovery in the background: the floor
  // command and its button feedback must not wait on media negotiation.
  microphonePreparation.then((track) => track && ensurePublishedMedia())
    .catch((error) => notify(`Микрофон пока недоступен: ${error.message}`));
  return participant;
}

function applyLocalFloorResult(participant) {
  if (participant?.participants && participant?.activeSpeakerIds) {
    state.meeting = participant;
    renderMicrophoneDock();
    renderFixedControls();
    return;
  }
  const id = state.participantId;
  if (!state.meeting || !id || !participant) return;
  const active = participant.floorState === "granted" || participant.microphone === "open";
  const requested = participant.floorState === "requested";
  state.meeting.activeSpeakerIds = (state.meeting.activeSpeakerIds ?? []).filter((item) => item !== id);
  state.meeting.floorQueue = (state.meeting.floorQueue ?? []).filter((item) => item !== id);
  if (active) state.meeting.activeSpeakerIds.push(id);
  else if (requested) state.meeting.floorQueue.push(id);
  if (state.meeting.participants?.[id]) Object.assign(state.meeting.participants[id], participant);
  renderMicrophoneDock();
  renderFixedControls();
}

async function runMicrophoneAction(action, success = null) {
  try {
    const participant = await action();
    applyLocalFloorResult(participant);
    if (success) notify(success);
  } catch (error) {
    notify(error.message);
    refreshAll().catch(() => {});
  }
}

async function activateChairMicrophone(mode = "normal") {
  await ensureMicrophone();
  await ensurePublishedMedia();
  return state.api.post(`/meetings/${state.profile.meetingId}/floor/chair-activate`, { participantId: state.participantId, mode });
}

async function grantFloor(participantId) {
  await state.api.post(`/meetings/${state.profile.meetingId}/floor/grant`, { participantId });
}

async function releaseFloor(participantId) {
  await state.api.post(`/meetings/${state.profile.meetingId}/floor/release`, { participantId });
}

async function selfRelease() {
  return state.api.post(`/meetings/${state.profile.meetingId}/floor/self-release`, { participantId: state.participantId });
}

async function saveMicrophoneLimit() {
  const value = Number($("#maxOpenMicrophones")?.value);
  if (!Number.isInteger(value) || value < 1 || value > 32) throw new Error("Допустимый лимит микрофонов: от 1 до 32");
  state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, {
    maxOpenMicrophones: value
  });
}

async function toggleFifo() {
  state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, {
    fifoEnabled: !state.meeting.audioSettings?.fifoEnabled
  });
}

async function saveDiscussionMode() {
  state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, {
    discussionMode: $("#discussionMode").value,
    queuePolicy: $("#queuePolicy").value
  });
}

async function toggleChairPriority(mode) {
  if (state.meeting.chairPriority?.mode !== mode) {
    await ensureMicrophone();
    await ensurePublishedMedia();
  }
  state.meeting = await state.api.post(`/meetings/${state.profile.meetingId}/floor/chair-priority`, {
    participantId: state.participantId, mode
  });
  return state.meeting;
}

async function muteAllMicrophones() {
  state.meeting = await state.api.post(`/meetings/${state.profile.meetingId}/floor/mute-all`);
}

async function activateAgenda(agendaItemId) {
  state.meeting = await state.api.post(`/meetings/${state.profile.meetingId}/agenda/${encodeURIComponent(agendaItemId)}/activate`);
}

async function revealAccessPin() {
  const result = await state.api.get(`/meetings/${state.profile.meetingId}/access-pin`);
  state.accessPin = result.accessPin;
}

async function editAccessPin() {
  const values = await httpForm("ПИН конференции", [{
    name: "accessPin", label: "Новый ПИН (4-8 цифр)", type: "text", value: state.accessPin ?? "", required: true
  }]);
  if (!values) return;
  const result = await state.api.patch(`/meetings/${state.profile.meetingId}/access-pin`, { accessPin: values.accessPin });
  state.accessPin = result.accessPin;
}

async function changeParticipantRole(participantId, currentRole) {
  const secretary = state.profile.role === "secretary";
  const roleOptions = state.meeting.quick ? [
    { value: "delegate", label: "Делегат" }, { value: "presenter", label: "Приглашённый докладчик" }, { value: "observer", label: "Наблюдатель" },
    { value: "chair", label: "Председатель" }, { value: "secretary", label: "Секретарь" },
    ...(!secretary ? [{ value: "operator", label: "Оператор" }] : [])
  ] : [
    { value: "delegate", label: "Делегат" }, { value: "presenter", label: "Приглашённый докладчик" }, { value: "observer", label: "Наблюдатель" },
    { value: "chair", label: "Председатель" }, { value: "secretary", label: "Секретарь" },
    ...(!secretary ? [{ value: "operator", label: "Оператор" }] : []),
    ...(state.translateStatus?.licensed ? [{ value: "interpreter", label: "Переводчик" }] : []),
    ...(!secretary ? [{ value: "technician", label: "Техник" }, { value: "admin", label: "Администратор" }] : [])
  ];
  if (state.meeting.participants?.[participantId]?.userId)
    roleOptions.push({ value: "av_operator", label: "Назначить оператором A/V на эту конференцию" });
  const values = await httpForm("Роль участника", [{
    name: "role", label: "Роль", type: "select", value: currentRole,
    options: roleOptions
  }]);
  if (!values) return;
  if (values.role === "av_operator") {
    await state.api.put(`/meetings/${state.profile.meetingId}/av-operator/${encodeURIComponent(participantId)}`, {});
    return;
  }
  state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/participants/${encodeURIComponent(participantId)}`, { role: values.role });
}

async function toggleIncomingAudio(participantId, currentlyEnabled) {
  const participant = await state.api.patch(`/meetings/${state.profile.meetingId}/participants/${encodeURIComponent(participantId)}`, {
    incomingAudioEnabled: !currentlyEnabled
  });
  if (state.meeting.participants?.[participantId]) Object.assign(state.meeting.participants[participantId], participant);
  renderPage();
}

async function removeParticipant(participantId) {
  await state.api.post(`/meetings/${state.profile.meetingId}/participants/${encodeURIComponent(participantId)}/leave`);
}

async function confirmRemoveParticipant(participantId, participantName) {
  const confirmed = await confirmDialog(`Отключить «${participantName}»?`, "Да", "Нет");
  if (!confirmed) return;
  await runAction(() => removeParticipant(participantId), "Участник отключён");
}

async function ensureMicrophone() {
  const existing = state.localMedia?.getAudioTracks().find((track) => track.readyState === "live");
  if (existing) return existing;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Микрофон требует доверенного HTTPS");
  const audio = await navigator.mediaDevices.getUserMedia({
    audio: {
      ...deviceConstraint(state.selectedAudioInputId),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });
  const track = audio.getAudioTracks()[0];
  if (!track) throw new Error("Браузер не вернул аудиотрек");
  state.localMedia ??= new MediaStream();
  state.localMedia.addTrack(track);
  // Capture remains live from join so AudioCore owns the mute gate and keeps
  // its decoder warm. Closed microphones are never exposed as consumable
  // delegate sources; only the server core receives this producer.
  track.enabled = true;
  await refreshMediaDevices().catch(() => {});
  return track;
}

async function syncLocalMicrophone() {
  const track = state.localMedia?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = true;
}

async function startCamera() {
  if (state.localMedia?.getVideoTracks().some((track) => track.readyState === "live")) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Камера недоступна: откройте VOX-S по доверенному HTTPS.");
  }
  let media;
  try {
    media = await navigator.mediaDevices.getUserMedia({
      // Microphone ownership is independent. Reopening/changing the camera
      // must not replace its track and force AudioCore to reconnect.
      audio: false,
      video: {
        ...deviceConstraint(state.selectedVideoInputId),
        facingMode: state.selectedVideoInputId ? undefined : { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 }
      }
    });
  } catch (preferredError) {
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    } catch (fallbackError) {
      throw new Error(`Камера ноутбука не открылась: ${fallbackError.message || preferredError.message}`);
    }
  }
  const track = media.getVideoTracks()[0];
  if (!track || track.readyState !== "live") {
    media.getTracks().forEach((item) => item.stop());
    throw new Error("Браузер не вернул активный видеотрек");
  }
  installLocalVideoTrack(track);
  await refreshMediaDevices().catch(() => {});
  await syncLocalMicrophone();
  if (state.publishedStream) await ensurePublishedMedia();
  state.selectedStream = null;
  renderPage();
}

async function stopCamera() {
  // Video and audio have independent producer lifecycles on one transport.
  // Turning the camera off must not interrupt an open microphone or force
  // AudioCore to reconnect its warmed input.
  for (const track of state.localMedia?.getVideoTracks() ?? []) {
    track.onended = null; track.stop(); state.localMedia.removeTrack(track);
  }
  if (state.publishedStream) await ensurePublishedMedia();
  if (!state.localMedia?.getTracks().length) state.localMedia = null;
  renderPage();
}

async function startPublishing() {
  await startCamera();
  const stream = await ensurePublishedMedia();
  state.selectedStream = stream;
  state.selectedSourceIdentity = { ownerParticipantId: stream.ownerParticipantId, sourceType: stream.sourceType, label: stream.label };
  state.remoteMedia = state.localMedia;
  renderPage();
}

async function ensurePublishedMedia() {
  if (!state.localMedia?.getTracks().length) throw new Error("Нет локальных аудио/видеодорожек для публикации");
  const hasVideo = state.localMedia.getVideoTracks().some((track) => track.readyState === "live");
  const hasAudio = state.localMedia.getAudioTracks().some((track) => track.readyState === "live");
  const description = { label: state.profile.displayName,
    capabilities: { video: hasVideo, audio: hasAudio } };
  const current = state.publishedStream;
  const descriptionChanged = current && (current.label !== description.label ||
    Boolean(current.capabilities?.video) !== description.capabilities.video ||
    Boolean(current.capabilities?.audio) !== description.capabilities.audio);
  // Opening/closing the floor used to PATCH an unchanged stream description
  // every time requestFloor() ensured the already-warmed publication. That
  // emitted stream.updated, refreshed every source wall and could race PGM
  // reconciliation even though neither producer nor tracks had changed.
  const stream = current
    ? (descriptionChanged
      ? await state.api.patch(`/streams/${encodeURIComponent(current.id)}`, description)
      : current)
    : await state.api.post(`/meetings/${state.profile.meetingId}/streams`, {
      sourceType: "client_camera", ownerParticipantId: state.participantId,
      protocol: "webrtc", cameraPosition: "front", ...description
    });
  state.publishedStream = stream;
  await publishMediaToMcu(stream, state.localMedia);
  return stream;
}

async function registerSystemCamera() {
  const values = await httpForm("Добавить системный видеопоток", [
    { name:"label", label:"Название", value:"Обзор зала" },
    { name:"protocol", label:"Тип потока", type:"select", value:"rtsp", options:["rtsp","hls","mjpeg","ndi"].map((value)=>({value,label:value.toUpperCase()})) },
    { name:"rtspUrl", label:"RTSP URL", value:"rtsp://", visibleWhen:{name:"protocol",values:["rtsp"]} },
    { name:"streamUrl", label:"URL потока", value:"", visibleWhen:{name:"protocol",values:["hls","mjpeg"]} },
    { name:"ndiSourceName", label:"Имя NDI Source", value:"", visibleWhen:{name:"protocol",values:["ndi"]} },
    { name:"ndiAddress", label:"IP:порт NDI (необязательно)", value:"", required:false, visibleWhen:{name:"protocol",values:["ndi"]} },
    { name:"cameraPosition", label:"Назначение", type:"select", value:"external", options:[{value:"external",label:"Внешний источник"},{value:"overview",label:"Обзорная камера зала"}] }
  ]); if (!values) return;
  const { label, protocol, rtspUrl, streamUrl, ndiSourceName, ndiAddress, cameraPosition } = values;
  if (protocol === "hls" || protocol === "mjpeg") {
    await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/streams`, {
      sourceType:"system_camera", label, protocol, previewUrl:streamUrl,
      ingestUrl:streamUrl, cameraPosition, capabilities:{video:true,audio:false,ptz:false}
    });
    notify(`${protocol.toUpperCase()}-поток добавлен в зал.`, 5000);
    return;
  }
  const camera = await state.api.post("/cameras", protocol === "ndi" ? {
    name:label, protocol:"ndi", ndiSourceName, ndiAddress,
    roomId:"default-room", autoAttachToQuick:false, required:false
  } : {
    name:label, protocol:"rtsp", rtspUrl, roomId:"default-room", probe:false,
    autoAttachToQuick:false, required:false, cameraPosition
  });
  if (!state.cameras.some((item) => item.id === camera.id)) state.cameras.push(camera);
  if (protocol === "rtsp") await quickProbeCamera(camera.id);
  notify(`${protocol.toUpperCase()}-источник сохранён в каталоге. Выполните полную проверку перед отправкой в зал.`, 8000);
  renderPage();
}

async function editStream(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream) return;
  const fields = [{ name:"label", label:"Название источника", value:stream.label }];
  if (stream.sourceType === "system_camera" && stream.protocol === "ndi") fields.push({name:"ndiSourceName",label:"Имя NDI source",value:stream.ndiSourceName||stream.label},{name:"ingestUrl",label:"IP:порт NDI",value:stream.ingestUrl||""});
  else if (stream.sourceType === "system_camera" && stream.protocol === "rtsp") fields.push({name:"ingestUrl",label:"RTSP URL",value:stream.ingestUrl||""});
  else if (stream.sourceType === "system_camera" && ["hls","mjpeg"].includes(stream.protocol)) fields.push({name:"previewUrl",label:"URL предпросмотра",value:stream.previewUrl||""});
  const values = await httpForm("Редактировать источник", fields); if (!values) return;
  const patch = values;
  const updated = await state.api.patch(`/streams/${encodeURIComponent(streamId)}`, patch);
  const index = state.streams.findIndex((item) => item.id === streamId);
  if (index >= 0) state.streams[index] = updated;
  if (state.selectedStream?.id === streamId) state.selectedStream = updated;
  if (state.programDescriptor?.source?.id === streamId) state.programDescriptor.source = updated;
  renderPage();
}

async function deleteStream(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream) return; const accepted = await httpForm("Удаление источника", [{name:"confirmation",label:`Введите УДАЛИТЬ для «${stream.label}»`,value:""}]);
  if (accepted?.confirmation !== "УДАЛИТЬ") return;
  await state.api.delete(`/streams/${encodeURIComponent(streamId)}`);
  if (state.selectedStream?.id === streamId) state.selectedStream = null;
}

async function deleteCamera(cameraId) {
  const camera = state.cameras.find((item) => item.id === cameraId);
  if (!camera) return;
  const accepted = await httpForm("Удаление системной камеры", [{ name:"confirmation", label:`Введите УДАЛИТЬ для «${camera.name}»`, value:"" }]);
  if (accepted?.confirmation !== "УДАЛИТЬ") return;
  await state.api.delete(`/cameras/${encodeURIComponent(cameraId)}`);
}

async function refreshMediaRuntime() {
  state.mediaRuntime = await state.api.get("/media/runtime?refresh=true");
}

async function discoverOnvifCameras() {
  state.onvifDiscoveries = await state.api.get("/cameras/discover");
  if (!state.onvifDiscoveries.length) throw new Error("ONVIF-камеры не найдены. Проверьте VLAN, multicast и Windows Firewall.");
  const first = state.onvifDiscoveries[0]?.xaddrs?.[0];
  notify(`Найдено ONVIF-устройств: ${state.onvifDiscoveries.length}. Первый адрес: ${first ?? "не указан"}`, 10000);
}

async function addOnvifCamera() {
  const suggested = state.onvifDiscoveries[0]?.xaddrs?.[0] ?? "http://192.168.1.100/onvif/device_service";
  const values = await httpForm("Добавить ONVIF-камеру", [{name:"serviceUrl",label:"Device Service URL",value:suggested},{name:"username",label:"Пользователь",value:"admin",required:false},{name:"password",label:"Пароль",type:"password",value:"",required:false},{name:"name",label:"Название",value:"Камера зала"}]);
  if (!values) return; const { serviceUrl, username, password, name } = values;
  const camera = await state.api.post("/cameras", { serviceUrl, username, password, name, roomId: "default-room", probe: true });
  state.cameras.push(camera);
  await quickProbeCamera(camera.id);
}

async function quickProbeCamera(cameraId) {
  try {
    const result = await state.api.post(`/cameras/${encodeURIComponent(cameraId)}/probe`, { mode: "quick" });
    const index = state.cameras.findIndex((camera) => camera.id === cameraId);
    if (index >= 0) state.cameras[index] = { ...state.cameras[index], status: "reachable", lastProbe: result };
  } catch (error) {
    notify(`Источник сохранён, но быстрая проверка не пройдена: ${error.message}`, 9000);
  }
}

async function probeCamera(cameraId) {
  notify("Проверяем доступность и реальный медиапоток…", 15000);
  const result = await state.api.post(`/cameras/${cameraId}/probe`, { mode: "media" });
  const video = result.media?.firstVideo;
  const audio = result.media?.streams?.find((stream) => stream.kind === "audio");
  const dimensions = video?.width && video?.height ? `${video.width}×${video.height}` : "размер неизвестен";
  const fps = video?.fps ? `${video.fps} fps` : "FPS не определён";
  const audioText = audio ? `аудио ${audio.codec ?? "есть"}` : "без аудио";
  const index = state.cameras.findIndex((camera) => camera.id === cameraId);
  if (index >= 0) state.cameras[index] = { ...state.cameras[index], status: "media-ready", lastProbe: result };
  renderPage();
  notify(`Источник исправен: ${video?.codec ?? "video"}, ${dimensions}, ${fps}, декодировано ${result.media?.decodedVideoFrames ?? 0} кадров, ${audioText}`, 12000);
}

async function attachCamera(cameraId) {
  if (state.streams.some((stream) => stream.cameraId === cameraId)) {
    notify("Камера уже находится в зале", 4000);
    return;
  }
  const stream = await state.api.post(`/cameras/${cameraId}/attach`, { meetingId: state.profile.meetingId });
  if (!state.streams.some((item) => item.id === stream.id)) state.streams.push(stream);
  renderPage();
}

async function startMediaWorker(streamId) {
  const job = await state.api.post("/media/workers", { streamId, profile: "transcode-h264", transport: "auto" });
  state.mediaWorkers.push(job);
  const stream = state.streams.find((item) => item.id === streamId);
  if (stream) stream.previewUrl = job.playlistUrl;
}

async function startMulticast(streamId) {
  const values = await httpForm("Multicast-выход", [
    { name: "address", label: "IPv4 multicast-группа", value: "239.255.0.1" },
    { name: "port", label: "UDP-порт", type: "number", value: "5000" },
    { name: "ttl", label: "TTL", type: "number", value: "1" }
  ], "Запустить");
  if (!values) return;
  const job = await state.api.post("/media/multicast", { streamId, address: values.address, port: Number(values.port), ttl: Number(values.ttl) });
  state.multicastJobs.push(job);
  notify(`Multicast запущен: ${job.targetUrl}`, 8000);
}

async function routePreview(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (stream) await ensureStreamPreview(stream);
  await state.api.post("/media/routing/buses/preview", { sourceId: streamId, transition: "cut" });
  state.routing = await state.api.get(`/media/routing?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
  state.selectedStream = stream ?? state.selectedStream;
  renderPage();
}

async function takeProgram(transition = "cut") {
  if (state.routing?.autoDirector?.enabled) throw new Error("Ручной TAKE заблокирован: сначала выключите автодиректор");
  const previewId = state.routing?.buses?.preview?.sourceId;
  const previewStream = state.streams.find((item) => item.id === previewId);
  if (previewStream) await ensureStreamPreview(previewStream);
  await state.api.post("/media/routing/take", { transition, durationMs: transition === "fade" ? 500 : 0 });
  state.routing = await state.api.get(`/media/routing?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
}

async function resumeAutoDirector() {
  await state.api.post("/media/routing/auto-director/resume", { meetingId: state.profile.meetingId });
  state.routing = await state.api.get(`/media/routing?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
  await refreshProgram();
}

async function discoverNdiSources() {
  state.ndiSources = await state.api.get("/media/ndi/sources?timeoutMs=1800");
  renderPage();
  notify(state.ndiSources.length ? `Найдено NDI sources: ${state.ndiSources.length}` : "NDI sources не найдены. Discovery остаётся работоспособным без NDI Runtime.", 9000);
}

async function attachNdiSource(id) {
  const source = state.ndiSources.find((item) => item.id === id);
  if (!source) return;
  const stream = await state.api.post(`/meetings/${state.profile.meetingId}/streams`, {
    sourceType: "system_camera", label: source.name, protocol: "ndi", ndiSourceName: source.name,
    ingestUrl: source.address && source.port ? `${source.address}:${source.port}` : (source.host && source.port ? `${source.host}:${source.port}` : null),
    capabilities: { video: true, audio: true, ptz: false }
  });
  state.streams.push(stream);
  return stream;
}

async function saveNdiCamera(id) {
  const source = state.ndiSources.find((item) => item.id === id);
  if (!source) return;
  const ndiAddress = source.address && source.port ? `${source.address}:${source.port}` : (source.host && source.port ? `${source.host}:${source.port}` : "");
  const camera = await state.api.post("/cameras", {
    name: source.name, protocol: "ndi", ndiSourceName: source.name, ndiAddress,
    roomId: "default-room", autoAttachToQuick: false, required: false
  });
  if (!state.cameras.some((item) => item.id === camera.id)) state.cameras.push(camera);
  notify("NDI-источник сохранён в каталоге. Проверьте его перед отправкой в зал.", 8000);
  renderPage();
}

async function toggleCameraAutoAttach(cameraId, enabled) {
  const updated = await state.api.patch(`/cameras/${encodeURIComponent(cameraId)}`, { autoAttachToMeeting: !enabled });
  const index = state.cameras.findIndex((camera) => camera.id === cameraId);
  if (index >= 0) state.cameras[index] = updated;
  renderPage();
}

async function receiveNdiSource(id) {
  // Stream creation is the single owner of ingest lifecycle. Starting a
  // second receive job here raced MediaIngestService and exposed a 404 HLS
  // playlist before the first NDI frame existed.
  await attachNdiSource(id);
  notify("NDI-источник добавлен. VideoCore подключит его после появления первого кадра.", 7000);
}

async function receiveNdiStream(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream?.ndiSourceName) throw new Error("Для источника не задано имя NDI source");
  const job = await state.api.post("/media/ndi/recv", {
    url: stream.ingestUrl || undefined,
    ndiName: stream.ndiSourceName,
    streamId: stream.id
  });
  state.ndiJobs.push(job);
  stream.previewUrl = job.playlistUrl;
}

async function toggleNdiOutput(outputId, enabled) {
  const meetingId = encodeURIComponent(state.profile.meetingId);
  const output = await state.api.patch(`/media/routing/ndi-outputs/${encodeURIComponent(outputId)}?meetingId=${meetingId}`, { enabled: !enabled });
  state.routing.ndiOutputs[outputId] = output;
  if (output.status === "blocked-runtime-missing") notify("Маршрут сохранён, но передача кадров заблокирована: установите официальный NDI Runtime и VOX-S NDI Bridge.", 10000);
}

async function configureNdiOutput(outputId) {
  const output = state.routing?.ndiOutputs?.[outputId];
  if (!output) throw new Error("NDI-выход не найден");
  const meetingId = encodeURIComponent(state.profile.meetingId);
  const network = await state.api.get(`/media/ndi/network-summary?meetingId=${meetingId}`);
  const multicastProfiles = network.multicastProfiles ?? [];
  const videoStreams = state.streams.filter((stream) => stream.kind === "video" || stream.hasVideo !== false);
  const values = await httpForm(`Настройка ${output.name}`, [
    { name: "name", label: "Имя NDI-потока", value: output.name },
    { name: "sourceKind", label: "Выходной сигнал", type: "select", value: output.source?.kind ?? "program", options: [
      { value: "program", label: "PGM" },
      { value: "mosaic-all", label: "Мозаика всех участников" },
      { value: "mosaic-speakers", label: "Мозаика говорящих участников" },
      { value: "stream", label: "Конкретный видеопоток" }
    ] },
    { name: "streamId", label: "Видеопоток", type: "select", value: output.source?.streamId ?? videoStreams[0]?.id ?? "", options: [
      { value: "", label: "Выберите источник" },
      ...videoStreams.map((stream) => ({ value: stream.id, label: stream.label ?? stream.name ?? stream.id }))
    ], visibleWhen: { name: "sourceKind", values: ["stream"] } },
    { name: "audioSource", label: "Аудиосигнал", type: "select", value: output.audio?.source ?? "program-mix", options: [
      { value: "program-mix", label: "Программный микс AudioCore" },
      { value: "source", label: "Аудиодорожка выбранного источника" },
      { value: "none", label: "Без аудио" }
    ] },
    { name: "autoStart", label: "Запуск", type: "select", value: output.autoStart ?? "manual", options: [
      { value: "conference-active", label: "Автоматически при запуске конференции" },
      { value: "manual", label: "Вручную" }
    ] },
    { name: "resolution", label: "Формат видео High Bandwidth", type: "select", value: `${output.video?.width ?? 1280}x${output.video?.height ?? 720}`, options: [
      { value: "1280x720", label: "1280×720" },
      { value: "1920x1080", label: "1920×1080" }
    ] },
    { name: "fps", label: "Частота кадров", type: "select", value: String(Math.round((output.video?.fpsN ?? 25) / (output.video?.fpsD ?? 1))), options: [
      { value: "25", label: "25 fps" },
      { value: "30", label: "30 fps" },
      { value: "50", label: "50 fps" },
      { value: "60", label: "60 fps" }
    ] },
    { name: "transportMode", label: "Транспорт NDI", type: "select", value: output.transport?.mode ?? "unicast", options: [
      { value: "unicast", label: "Unicast / RUDP" },
      ...(multicastProfiles.length ? [{ value: "multicast", label: "Multicast (проверенный профиль)" }] : [])
    ] },
    { name: "multicastProfileId", label: "Multicast-профиль", type: "select",
      value: output.transport?.multicastProfileId ?? multicastProfiles[0]?.id ?? "",
      options: [{ value: "", label: "Выберите профиль" }, ...multicastProfiles.map((profile) => ({
        value: profile.id, label: `${profile.name} · ${profile.netprefix}/${profile.netmask} · TTL ${profile.ttl}`
      }))], visibleWhen: { name: "transportMode", values: ["multicast"] } }
  ]);
  if (!values) return;
  if (values.sourceKind === "stream" && !values.streamId) throw new Error("Выберите конкретный видеопоток");
  if (values.audioSource === "source" && values.sourceKind !== "stream") {
    throw new Error("Аудиодорожку источника можно выбрать только вместе с конкретным видеопотоком");
  }
  if (values.transportMode === "multicast" && !values.multicastProfileId) {
    throw new Error("Выберите проверенный multicast-профиль администратора");
  }
  const [width, height] = values.resolution.split("x").map(Number);
  const outputPatch = {
    name: values.name.trim(),
    source: { kind: values.sourceKind, streamId: values.sourceKind === "stream" ? values.streamId : null },
    audio: { source: values.audioSource },
    autoStart: values.autoStart,
    video: { format: "high-bandwidth", width, height, fpsN: Number(values.fps), fpsD: 1 },
    transport: {
      mode: values.transportMode,
      multicastProfileId: values.transportMode === "multicast" ? values.multicastProfileId : null
    }
  };
  const configured = await state.api.patch(`/media/routing/ndi-outputs/${encodeURIComponent(outputId)}?meetingId=${meetingId}`, outputPatch);
  state.routing.ndiOutputs[outputId] = configured;
  notify("Настройки NDI-выхода сохранены и переданы контроллеру.");
}

async function startNdiOutput(outputId) {
  const job = await state.api.post(`/media/routing/ndi-outputs/${encodeURIComponent(outputId)}/start`, { meetingId: state.profile.meetingId });
  state.ndiJobs.push(job);
}

async function stopNdiJob(jobId) {
  const stopped = await state.api.post(`/media/ndi/jobs/${encodeURIComponent(jobId)}/stop`, {});
  const index = state.ndiJobs.findIndex((item) => item.id === jobId);
  if (index >= 0) state.ndiJobs[index] = stopped;
}

async function toggleAutoDirector() {
  const enabled = !state.routing?.autoDirector?.enabled;
  state.routing.autoDirector = await state.api.patch("/media/routing/auto-director", { enabled });
}

async function savePgmMode() {
  await state.api.put(`/media/pgm-policy/meetings/${encodeURIComponent(state.profile.meetingId)}`, {
    idleMode: $("#pgmIdleMode").value,
    singleMode: $("#pgmSingleMode").value,
    multiMode: $("#pgmMultiMode").value,
    agendaUseSlate: $("#pgmAgendaUseSlate").checked
  });
}

async function resetPgmMode() {
  await state.api.delete(`/media/pgm-policy/meetings/${encodeURIComponent(state.profile.meetingId)}`);
}

async function selectStream(streamId) {
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream) return;
  if (!inMcu(stream)) await ensureStreamPreview(stream);
  state.selectedStream = stream;
  state.selectedSourceIdentity = { ownerParticipantId: stream.ownerParticipantId, sourceType: stream.sourceType, label: stream.label };
  state.remoteMedia = mediaForStream(stream);
  renderPage();
  if (inMcu(stream) && stream.ownerParticipantId !== state.participantId) await watchClientStream(stream);
}

async function ensureStreamPreview(stream) {
  if (stream.sourceType === "system_multiview") return;
  if (stream.protocol === "synthetic" && stream.syntheticKind === "document") return;
  if (stream.protocol === "webrtc" || stream.protocol === "mjpeg" || stream.protocol === "hls" || stream.previewUrl) return;
  if (!canOperateMedia()) throw new Error("Источник ещё не преобразован в HLS. Оператор должен запустить Media Worker.");
  if (stream.protocol === "rtsp") {
    const job = await state.api.post("/media/workers", {
      streamId: stream.id,
      profile: "transcode-h264",
      transport: "auto"
    });
    if (job.status === "failed") throw new Error(job.error || job.logTail?.at(-1) || "RTSP Media Worker не запустился");
    stream.previewUrl = job.playlistUrl;
    if (!state.mediaWorkers.some((item) => item.id === job.id)) state.mediaWorkers.push(job);
    return;
  }
  if (stream.protocol === "ndi") {
    await receiveNdiStream(stream.id);
    return;
  }
  throw new Error(`Для протокола ${stream.protocol.toUpperCase()} не настроен браузерный просмотр`);
}

function mediaForStream(stream) {
  if (!stream || !inMcu(stream)) return null;
  return state.peerMediaByStream.get(stream.id) ?? null;
}

// ADR-006 Phase 1: mediasoup does not speak plain SDP offer/answer like the
// previous werift-based MCU. Negotiation is multi-step via mediasoupClient
// (vendor/mediasoup-client.js): load a Device with the meeting's router RTP
// capabilities once, then create send/recv WebRtcTransports and
// produce/consume individual tracks through them. See docs/API.md
// "Central MCU WebRTC" for the full server-side contract.

async function getMcuDevice() {
  const meetingId = state.profile.meetingId;
  if (state.mcuDevice?.meetingId === meetingId) return state.mcuDevice.device;
  const routerRtpCapabilities = await state.api.get(
    `/mcu/rtp-capabilities?meetingId=${encodeURIComponent(meetingId)}`
  );
  const device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
  state.mcuDevice = { meetingId, device };
  return device;
}

async function createMcuTransport(direction) {
  const device = await getMcuDevice();
  const params = await state.api.post("/mcu/transports", {
    meetingId: state.profile.meetingId,
    participantId: state.participantId,
    direction
  });
  const factory = direction === "send" ? "createSendTransport" : "createRecvTransport";
  try {
    const transport = device[factory]({
      id: params.id,
      iceParameters: params.iceParameters,
      iceCandidates: params.iceCandidates,
      dtlsParameters: params.dtlsParameters
    });
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      state.api.post(`/mcu/transports/${encodeURIComponent(params.id)}/connect`, { dtlsParameters })
        .then(() => callback()).catch(errback);
    });
    if (direction === "send") {
      transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
        state.api.post("/mcu/producers", {
          meetingId: state.profile.meetingId,
          participantId: state.participantId,
          transportId: params.id,
          streamId: appData.streamId,
          kind,
          rtpParameters,
          captureProcessing: appData.captureProcessing
        }).then((session) => callback({ id: session.id })).catch(errback);
      });
    }
    return transport;
  } catch (error) {
    await state.api.delete(`/mcu/transports/${encodeURIComponent(params.id)}`).catch(() => {});
    throw error;
  }
}

async function publishMediaToMcu(stream, media) {
  const generation = state.mediaGeneration ?? 0;
  let entry = state.mcuPublishers.get(stream.id);
  if (entry && (entry.transport.closed || ["failed", "closed", "disconnected"].includes(entry.transport.connectionState))) {
    await closeMcuPublisher(stream.id); entry = null;
  }
  const transport = entry?.transport ?? await createMcuTransport("send");
  const producers = entry?.producers ?? new Map();
  const desired = new Map(media.getTracks().filter((track) => track.readyState === "live").map((track) => [track.kind, track]));
  try {
    // Add/remove individual tracks on one long-lived send transport. Camera
    // toggles must never tear down the participant's already-warmed audio.
    for (const [kind, producer] of [...producers]) {
      const track = desired.get(kind);
      if (!track) {
        await state.api.delete(`/mcu/sessions/${encodeURIComponent(producer.id)}`).catch(() => {});
        producer.close(); producers.delete(kind);
      } else if (producer.track !== track) {
        // Capture-processing settings belong to the audio producer. Recreate
        // only that producer after an input-device change; retain transport
        // and every unrelated track.
        if (kind === "audio" || (kind === "video" && state.forceVideoProducerRestart)) {
          await state.api.delete(`/mcu/sessions/${encodeURIComponent(producer.id)}`).catch(() => {});
          producer.close(); producers.delete(kind);
        } else {
          await producer.replaceTrack({ track }); desired.delete(kind);
        }
      } else desired.delete(kind);
    }
    for (const track of desired.values()) {
      const settings = track.getSettings?.() ?? {};
      const captureProcessing = track.kind === "audio" ? {
        echoCancellation: typeof settings.echoCancellation === "boolean" ? settings.echoCancellation : null,
        noiseSuppression: typeof settings.noiseSuppression === "boolean" ? settings.noiseSuppression : null,
        autoGainControl: typeof settings.autoGainControl === "boolean" ? settings.autoGainControl : null
      } : null;
      const iosCamera = track.kind === "video" && typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
      if (track.kind === "video") track.contentHint = "motion";
      // Safari on iPadOS was asked to hardware-encode three simultaneous
      // simulcast layers.  The low Preview layer remained healthy while the
      // full layer feeding VideoCore stopped for 12+ seconds, causing native
      // input retries and visible PGM freezes.  Publish one bounded 720p layer
      // on iOS; the server still produces every required Preview/PGM raster.
      const simulcast = track.kind === "video" ? iosCamera
        ? { encodings: [{ maxBitrate: 900_000, maxFramerate: 24 }], codecOptions: { videoGoogleStartBitrate: 600 } }
        : { encodings: [
          { rid: "q", scaleResolutionDownBy: 4, maxBitrate: 180_000, maxFramerate: 8 },
          { rid: "h", scaleResolutionDownBy: 2, maxBitrate: 550_000, maxFramerate: 15 },
          { rid: "f", scaleResolutionDownBy: 1, maxBitrate: 1_500_000, maxFramerate: 30 }
        ], codecOptions: { videoGoogleStartBitrate: 700 } } : {};
      const producer = await transport.produce({ track, stopTracks: false, ...simulcast,
        appData: { streamId: stream.id, captureProcessing } });
      producers.set(track.kind, producer);
    }
    if (generation !== (state.mediaGeneration ?? 0)) throw new Error("Публикация отменена: сессия закрыта");
    if (!entry) transport.on("connectionstatechange", (connectionState) => {
      if (["failed", "closed"].includes(connectionState) && state.mcuPublishers.get(stream.id)?.transport === transport) closeMcuPublisher(stream.id).catch(() => {});
    });
    state.mcuPublishers.set(stream.id, { transport, producers });
    state.forceVideoProducerRestart = false;
    return { id: producers.values().next().value?.id };
  } catch (error) {
    if (!entry) {
      producers.forEach((producer) => producer.close());
      closeMcuTransport(transport);
    }
    throw error;
  }
}

// transport.close() (mediasoup-client) only tears down the local
// RTCPeerConnection - it never told the server, so the Media Plane's
// WebRtcTransport (and the UDP ICE port pair it holds, from a small fixed
// range) stayed allocated forever. Every camera toggle and PGM switch
// leaked one more; over a real meeting this exhausted the whole port range,
// after which every new transport failed server-side and everything looked
// like infinite-loading video. Always pair the local close with this.
function closeMcuTransport(transport) {
  state.api?.delete(`/mcu/transports/${encodeURIComponent(transport.id)}`).catch(() => {});
  transport.close();
}

async function closeMcuPublisher(streamId) {
  const entry = state.mcuPublishers.get(streamId);
  if (!entry) return;
  state.mcuPublishers.delete(streamId);
  entry.producers.forEach((producer) => producer.close());
  closeMcuTransport(entry.transport);
}

async function subscribeMcuStream(stream, { includeVideo = true, includeAudio = true, previewQuality = "full" } = {}) {
  const generation = state.mediaGeneration ?? 0;
  const candidates = await state.api.get(
    `/mcu/consumable-producers?meetingId=${encodeURIComponent(state.profile.meetingId)}` +
    `&participantId=${encodeURIComponent(state.participantId)}&mode=source&streamId=${encodeURIComponent(stream.id)}` +
    `&includeAudio=${includeAudio}&includeVideo=${includeVideo}`
  );
  const key = candidates.map((item) => item.producerId).sort().join("|");
  const existing = state.mcuSubscribers.get(stream.id);
  const existingCoversRequest = existing?.requested &&
    (!includeVideo || existing.requested.includeVideo) &&
    (!includeAudio || existing.requested.includeAudio) &&
    (!includeVideo || existing.requested.previewQuality === previewQuality);
  if (existing && existing.key === key && existingCoversRequest && subscriptionHealthy(existing)) {
    return state.peerMediaByStream.get(stream.id) ?? null;
  }
  // A stream still on screen (source wall, PGM, own-required set) but with no
  // current producer candidates means its old subscription's producer(s) are
  // gone server-side. Close it explicitly instead of leaving the transport
  // and consumers open and returning stale cached media forever - the only
  // other place that could close them (pruneUnusedViewerPeers) only reacts
  // to a stream no longer being *required*, not to it becoming un-live while
  // still required.
  if (!candidates.length) {
    if (existing) await closeMcuSubscriber(stream.id);
    return null;
  }
  const device = await getMcuDevice();
  // The NDI receive bridge publishes a single, already-normalized H.264
  // Baseline representation. A browser whose negotiated device capabilities
  // lack that profile must use the existing HLS compatibility preview, not
  // repeatedly create a doomed WebRTC consumer (HTTP 500 every retry).
  if (stream.protocol === "ndi" && includeVideo && !device.rtpCapabilities.codecs.some((codec) =>
    codec.mimeType?.toLowerCase() === "video/h264" &&
    /^(42c0|42e0)/.test(String(codec.parameters?.["profile-level-id"] ?? "").toLowerCase()) &&
    Number(codec.parameters?.["packetization-mode"] ?? 0) === 1)) {
    if (existing) await closeMcuSubscriber(stream.id);
    state.viewerRetryAt.set(stream.id, Date.now() + 30_000);
    return null;
  }
  const transport = await createMcuTransport("recv");
  const incoming = new MediaStream();
  const consumers = [];
  try {
    for (const candidate of candidates) {
      const result = await state.api.post("/mcu/consumers", {
        meetingId: state.profile.meetingId,
        participantId: state.participantId,
        transportId: transport.id,
        producerId: candidate.producerId,
        rtpCapabilities: device.rtpCapabilities,
        preferredLayers: candidate.kind === "video" && previewQuality === "thumbnail"
          ? { spatialLayer: 0, temporalLayer: 0 } : null
      });
      const consumer = await transport.consume({
        id: result.session.id, producerId: result.producerId,
        kind: result.session.kind, rtpParameters: result.rtpParameters
      });
      incoming.addTrack(consumer.track);
      consumers.push(consumer);
      await state.api.post(`/mcu/consumers/${encodeURIComponent(consumer.id)}/resume`, {});
    }
    if (generation !== (state.mediaGeneration ?? 0)) throw new Error("Подписка отменена: сессия закрыта");
    if (includeVideo && candidates.some((item) => item.kind === "video")) await waitForVideoFrame(incoming);
    const previous = state.mcuSubscribers.get(stream.id);
    const entry = { key, transport, consumers, requested: { includeVideo, includeAudio, previewQuality }, connectionState: transport.connectionState, disconnectedAt: null, needsReplacement: false };
    state.mcuSubscribers.set(stream.id, entry);
    state.peerMediaByStream.set(stream.id, incoming);
    if (state.selectedStream?.id === stream.id) state.remoteMedia = incoming;
    if (state.activeTab === "streams") mountStudioMonitors();
    if (state.activeTab === "conference") mountProgram();
    observeReceiveTransport(entry,
      () => state.mcuSubscribers.get(stream.id) === entry,
      () => watchClientStream(stream, { includeVideo, includeAudio, previewQuality }).catch(() => {}));
    if (previous) await closeProgramSubscriberEntry(previous);
    return incoming;
  } catch (error) {
    consumers.forEach((consumer) => consumer.close());
    closeMcuTransport(transport);
    throw error;
  }
}

async function closeProgramSubscriberEntry(entry) {
  if (!entry) return;
  await Promise.allSettled(entry.consumers.map((consumer) =>
    state.api?.delete(`/mcu/sessions/${encodeURIComponent(consumer.id)}`)));
  entry.consumers.forEach((consumer) => consumer.close());
  closeMcuTransport(entry.transport);
}

const RECEIVE_DISCONNECTED_GRACE_MS = 2200;

function observeReceiveTransport(entry, isCurrent, retry) {
  entry.connectionState = entry.transport.connectionState;
  entry.transport.on("connectionstatechange", (connectionState) => {
    entry.connectionState = connectionState;
    if (connectionState === "connected") {
      entry.disconnectedAt = null;
      entry.needsReplacement = false;
      return;
    }
    if (connectionState === "disconnected") {
      entry.disconnectedAt ??= Date.now();
      // ICE may recover by itself. If it does not, the regular 1.5/4-second
      // reconciliation starts a replacement after the grace period while the
      // old video element keeps its last frame.
      return;
    }
    if (["failed", "closed"].includes(connectionState) && isCurrent()) {
      entry.needsReplacement = true;
      // Never destroy the current media first. Build and display a live
      // replacement, then close this transport (make-before-break).
      setTimeout(() => { if (isCurrent()) retry(); }, 0);
    }
  });
}

function subscriptionHealthy(entry) {
  if (!entry || entry.transport.closed || entry.needsReplacement ||
      ["failed", "closed"].includes(entry.connectionState ?? entry.transport.connectionState) ||
      !entry.consumers.length || entry.consumers.some((consumer) => consumer.closed || consumer.track.readyState !== "live")) return false;
  if ((entry.connectionState ?? entry.transport.connectionState) === "disconnected") {
    return Date.now() - (entry.disconnectedAt ?? Date.now()) < RECEIVE_DISCONNECTED_GRACE_MS;
  }
  return true;
}

async function inboundProgramVideoCounters(entry) {
  let bytes = 0, packets = 0, frames = 0, video = false, hasFrameCounter = false;
  for (const consumer of entry?.consumers ?? []) {
    if (consumer.kind !== "video" || consumer.closed) continue;
    video = true;
    const report = await consumer.getStats();
    for (const stat of report.values()) {
      if (stat.type !== "inbound-rtp" || (stat.kind && stat.kind !== "video")) continue;
      bytes += Number(stat.bytesReceived ?? 0);
      packets += Number(stat.packetsReceived ?? 0);
      if (stat.framesDecoded !== undefined || stat.framesReceived !== undefined) hasFrameCounter = true;
      frames += Number(stat.framesDecoded ?? stat.framesReceived ?? 0);
    }
  }
  return { bytes, packets, frames, video, hasFrameCounter };
}

async function checkProgramVideoHealth() {
  const entry = state.programSubscriber;
  if (!entry || document.hidden || entry.healthCheckPending || !subscriptionHealthy(entry)) return;
  entry.healthCheckPending = true;
  try {
    const next = await inboundProgramVideoCounters(entry);
    if (!next.video) return;
    const previous = entry.videoHealth;
    const progressed = !previous || (next.hasFrameCounter
      ? next.frames > previous.frames
      : next.bytes > previous.bytes || next.packets > previous.packets);
    entry.videoHealth = { ...next, stalledSamples: progressed ? 0 : (previous?.stalledSamples ?? 0) + 1 };
    // A connected ICE transport and a live MediaStreamTrack do not prove that
    // WebKit still decodes PGM.  After three bad samples build a fresh receive
    // subscription first, then retire the frozen one (make-before-break).
    if (!progressed && entry.videoHealth.stalledSamples >= 3 && state.programSubscriber === entry) {
      entry.needsReplacement = true;
      entry.videoHealth.stalledSamples = 0;
      watchProgramStream(state.programDescriptor?.source).catch(() => {});
    }
  } catch (_) {
    // Transport state and the next bounded sample remain recovery paths.
  } finally {
    entry.healthCheckPending = false;
  }
}

async function closeProgramSubscriber() {
  const entry = state.programSubscriber;
  state.programDesiredKey = null;
  state.programSubscriber = null;
  state.programMedia = null;
  await closeProgramSubscriberEntry(entry);
}

async function waitForVideoFrame(media, timeoutMs = 8000) {
  const probe = document.createElement("video");
  probe.muted = true;
  probe.playsInline = true;
  probe.srcObject = media;
  let timer, frame;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Видеопоток не передал первый кадр")), timeoutMs);
      probe.onerror = () => reject(new Error("Ошибка декодирования видеопотока"));
      if (probe.requestVideoFrameCallback) frame = probe.requestVideoFrameCallback(resolve);
      else probe.onloadeddata = resolve;
      probe.play().catch(reject);
    });
  } finally {
    clearTimeout(timer);
    if (frame !== undefined) probe.cancelVideoFrameCallback?.(frame);
    probe.onloadeddata = null;
    probe.onerror = null;
    probe.pause();
    probe.srcObject = null;
  }
}

async function watchProgramStream(stream) {
  const descriptor = state.programDescriptor;
  // The descriptor and the consumable-producers endpoint are read in two
  // separate HTTP requests.  During an atomic floor scene commit the former
  // can already describe the new scene while the latter still exposes the
  // same long-lived VideoCore producer.  Keying the subscription from the
  // descriptor made that harmless control-plane transition look like a media
  // replacement and Safari briefly rendered black.  The actual producer set
  // is the only authoritative identity of a receiving subscription.
  const candidates = (await state.api.get(
    `/mcu/consumable-producers?meetingId=${encodeURIComponent(state.profile.meetingId)}` +
    `&participantId=${encodeURIComponent(state.participantId)}&mode=program&includeAudio=false`
  )).filter((item) => item.kind === "video");
  if (!candidates.length) return;
  const key = candidates.map((item) => item.producerId).sort().join("|");
  state.programDesiredKey = key;
  if (state.programSubscriber?.key === key && subscriptionHealthy(state.programSubscriber)) return;
  if (state.programPending === key) return;
  state.programPending = key;
  try {
    const device = await getMcuDevice();
    const transport = await createMcuTransport("recv");
    const incoming = new MediaStream();
    const consumers = [];
    try {
      for (const candidate of candidates) {
        const result = await state.api.post("/mcu/consumers", {
          meetingId: state.profile.meetingId, participantId: state.participantId,
          transportId: transport.id, producerId: candidate.producerId,
          rtpCapabilities: device.rtpCapabilities
        });
        const consumer = await transport.consume({
          id: result.session.id, producerId: result.producerId,
          kind: result.session.kind, rtpParameters: result.rtpParameters
        });
        consumers.push(consumer);
        incoming.addTrack(consumer.track);
        await state.api.post(`/mcu/consumers/${encodeURIComponent(consumer.id)}/resume`, {});
      }
      // Discard a subscription that was overtaken by a newer PGM source while
      // it was being set up, instead of letting it replace the newer one.
      if (!consumers.length || state.programDesiredKey !== key) {
        await closeProgramSubscriberEntry({ transport, consumers });
        return;
      }
      await waitForVideoFrame(incoming);
      if (state.programDesiredKey !== key) {
        await closeProgramSubscriberEntry({ transport, consumers }); return;
      }
      // Make-before-break: the new transport/consumers are already live and
      // resumed above, so swap them in and only close the previous
      // subscription afterwards - a viewer never sees a black/empty gap
      // between the old stream stopping and the new one starting, even
      // when this genuinely is a real source change.
      const previous = state.programSubscriber;
      const entry = { key, transport, consumers, connectionState: transport.connectionState, disconnectedAt: null,
        needsReplacement: false, videoHealth: null, healthCheckPending: false };
      state.programSubscriber = entry;
      observeReceiveTransport(entry,
        () => state.programSubscriber === entry,
        () => watchProgramStream(stream).catch(() => {}));
      state.programMedia = incoming;
      if (state.activeTab === "conference") mountProgram();
      if (state.activeTab === "streams") mountStudioMonitors();
      await closeProgramSubscriberEntry(previous);
    } catch (error) {
      consumers.forEach((consumer) => consumer.close());
      closeMcuTransport(transport);
      throw error;
    }
  } finally {
    if (state.programPending === key) state.programPending = null;
  }
}

async function closeMcuSubscriber(streamId) {
  const entry = state.mcuSubscribers.get(streamId);
  if (!entry) return;
  state.mcuSubscribers.delete(streamId);
  state.peerMediaByStream.delete(streamId);
  detachAudioMixInput(streamId);
  await Promise.all(entry.consumers.map((consumer) =>
    state.api?.delete(`/mcu/sessions/${encodeURIComponent(consumer.id)}`).catch(() => {})));
  entry.consumers.forEach((consumer) => consumer.close());
  closeMcuTransport(entry.transport);
}

async function watchClientStream(stream, options = {}) {
  if (!inMcu(stream) || stream.protocol === "synthetic" || stream.ownerParticipantId === state.participantId) return null;
  const { includeVideo = true, includeAudio = true, previewQuality = "full" } = options;
  const pending = state.viewerPromises.get(stream.id);
  if (pending) {
    // A stream can only have one live MCU subscription at a time, so a
    // second concurrent caller must not start its own - but if it wants a
    // capability (video/audio) the in-flight call didn't ask for, silently
    // returning that call's result would leave the second caller's need
    // unmet indefinitely. Wait for it, then reconcile with one more call
    // instead of dropping the request.
    const requested = state.viewerPromiseOptions.get(stream.id) ?? { includeVideo: true, includeAudio: true };
    if ((includeVideo && !requested.includeVideo) || (includeAudio && !requested.includeAudio) ||
        (includeVideo && requested.previewQuality !== previewQuality)) {
      return pending.then(() => watchClientStream(stream, options), () => watchClientStream(stream, options));
    }
    return pending;
  }
  if ((state.viewerRetryAt.get(stream.id) ?? 0) > Date.now()) return null;
  state.viewerPromiseOptions.set(stream.id, { includeVideo, includeAudio, previewQuality });
  const task = subscribeMcuStream(stream, { includeVideo, includeAudio, previewQuality }).catch((error) => {
    state.viewerRetryAt.set(stream.id, Date.now() + (error?.status === 409 ? 8000 : 3000));
    throw error;
  }).finally(() => { state.viewerPromises.delete(stream.id); state.viewerPromiseOptions.delete(stream.id); });
  state.viewerPromises.set(stream.id, task);
  return task;
}

async function reconcileSelectedStream() {
  if (!state.selectedSourceIdentity && state.selectedStream) {
    state.selectedSourceIdentity = { ownerParticipantId: state.selectedStream.ownerParticipantId, sourceType: state.selectedStream.sourceType, label: state.selectedStream.label };
  }
  if (!state.selectedSourceIdentity) return;
  let current = state.streams.find((item) => item.id === state.selectedStream?.id);
  if (!current && state.selectedSourceIdentity.ownerParticipantId) {
    current = state.streams.find((item) => item.ownerParticipantId === state.selectedSourceIdentity.ownerParticipantId && item.status === "available");
  }
  if (!current) {
    state.selectedStream = { ...state.selectedStream, status: "offline" };
    state.remoteMedia = null;
    state.watchingStreamId = null;
    return;
  }
  const changed = current.id !== state.selectedStream?.id;
  state.selectedStream = current;
  if (changed && inMcu(current) && current.ownerParticipantId !== state.participantId) {
    state.remoteMedia = null;
    state.watchingStreamId = null;
    await watchClientStream(current).catch((error) => notify(`Повторное подключение: ${error.message}`, 4000));
  }
}

async function pollSignaling() {
  if (!state.api) return;
  if (state.signaling) { state.signalPending = true; return; }
  state.signaling = true;
  try {
    await pollChatSignaling();
    state.signalFailures = 0;
  } catch (error) {
    notify(`WebRTC: ${error.message}`, 2500);
    state.signalFailures += 1;
    // Keep published camera/content tracks alive during a temporary signaling
    // outage. Existing peer connections can continue carrying media.
    state.signalFailures = Math.min(state.signalFailures, 1000);
  } finally {
    state.signaling = false;
    if (state.signalPending) { state.signalPending = false; queueMicrotask(pollSignaling); }
  }
}

async function closeViewerStream(streamId) {
  await closeMcuSubscriber(streamId);
  detachAudioMixInput(streamId);
}

async function pruneUnusedViewerPeers() {
  const required = new Set();
  if (state.selectedStream && inMcu(state.selectedStream) && state.selectedStream.ownerParticipantId !== state.participantId) required.add(state.selectedStream.id);
  // Full Preview is an on-demand slot. It must not reshuffle or evict the
  // stable low-quality source-wall slots above.
  if (state.previewModalStreamId) required.add(state.previewModalStreamId);
  // Speaker audio is delivered exclusively by the long-lived server mix-minus
  // bus. Keeping a per-speaker source subscription here was a legacy of the
  // browser mixer: every microphone press allocated a recv transport/consumer
  // and every release destroyed it, despite PGM already being a stable server
  // composite. That churn was especially visible on iPad.
  if (state.activeTab === "streams" || Date.now() < state.streamsWarmUntil)
    for (const stream of budgetedThumbnailStreams()) required.add(stream.id);
  for (const streamId of [...state.mcuSubscribers.keys()]) {
    if (!required.has(streamId)) await closeViewerStream(streamId);
  }
}

async function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Браузер не поддерживает Web Audio mixer");
    state.audioContext = new AudioContextClass();
    state.audioContext.onstatechange = updateAudioUnlock;
    if (state.audioContext.setSinkId) {
      await state.audioContext.setSinkId(state.selectedAudioOutputId || "default").catch(() => {});
    }
  }
  if (state.audioContext.state === "suspended") {
    // Autoplay may leave this promise pending until a gesture. Never block polling.
    state.audioContext.resume().then(updateAudioUnlock).catch(updateAudioUnlock);
  }
  updateAudioUnlock();
  return state.audioContext;
}

function updateAudioUnlock() {
  state.audioUnlockRequired = Boolean((state.audioContext && state.audioContext.state !== "running") ||
    (state.serverAudioElement?.srcObject && state.serverAudioElement.paused));
  const button = $("#enableAudioBtn");
  if (button) button.hidden = !state.audioUnlockRequired;
}

const mobileAudioEndpoint = () => /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) || matchMedia("(pointer: coarse) and (max-width: 1100px)").matches;

async function updateHeadphoneWarning() {
  const banner = $("#headphoneWarning");
  const nonTechnical = !TECHNICAL_CONFERENCE_ROLES.has(state.profile?.role);
  if (!banner || !nonTechnical) { if (banner) banner.hidden = true; return; }
  let detected = false;
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
    detected = devices.some((device) => device.kind === "audiooutput" && /head(phone|set)|airpods|bluetooth|гарнитур|наушник/i.test(device.label));
  } catch (_) {
    // iOS Safari does not expose a dependable output-route API. Keep the
    // explicit confirmation visible instead of pretending detection worked.
  }
  state.headphonesReady ||= detected;
  banner.hidden = state.headphonesReady;
}

async function attachAudioMixInput(streamId, media) {
  if (!streamId || !media?.getAudioTracks().length) return;
  const tracks = media.getAudioTracks().filter((track) => track.readyState === "live");
  const previous = state.audioMixInputs.get(streamId);
  if (previous && previous.media.getAudioTracks().length === tracks.length &&
      previous.media.getAudioTracks().every((track, index) => track === tracks[index])) return;
  detachAudioMixInput(streamId);
  if (!tracks.length) return;
  const stream = state.streams.find((item) => item.id === streamId);
  if (!stream) return;
  try {
    const context = await ensureAudioContext();
    const audioOnly = new MediaStream(tracks);
    const source = context.createMediaStreamSource(audioOnly);
    const gain = context.createGain();
    gain.gain.value = state.meeting?.activeSpeakerIds.includes(stream.ownerParticipantId) ? 1 : 0;
    source.connect(gain).connect(context.destination);
    state.audioMixInputs.set(streamId, { source, gain, media: audioOnly });
  } catch (error) {
    state.audioUnlockRequired = true;
    updateAudioUnlock();
    notify(`Аудиомикшер: ${error.message}`, 4000);
  }
}

function detachAudioMixInput(streamId) {
  const input = state.audioMixInputs.get(streamId);
  input?.source.disconnect();
  input?.gain.disconnect();
  state.audioMixInputs.delete(streamId);
}

async function syncConferenceAudio() {
  if (!state.meeting) return;
  const me = state.meeting.participants?.[state.participantId];
  if (me?.incomingAudioEnabled === false) {
    await closeServerAudioSubscriber();
    updateAudioUnlock();
    return;
  }
  // The conference bus is rendered by AudioCore per recipient.  Do not
  // subscribe to every remote microphone and reconstruct mix-minus in the
  // browser: that leaked policy into the endpoint and made audio depend on
  // the video/source-wall subscriptions.
  await watchServerAudioMix().catch((error) => notify(`Аудиоканал конференции: ${error.message}`, 4000));
  for (const streamId of [...state.audioMixInputs.keys()]) detachAudioMixInput(streamId);
  await pruneUnusedViewerPeers();
  return;
  /* Legacy endpoint-side mixer retained only as a migration reference. */
  const desired = new Set();
  for (const participantId of state.meeting.activeSpeakerIds ?? []) {
    if (participantId === state.participantId) continue;
    const stream = state.streams.find((item) =>
      item.ownerParticipantId === participantId && item.protocol === "webrtc" && item.capabilities?.audio && item.status === "available"
    );
    if (!stream) continue;
    desired.add(stream.id);
    const wantsVideo = state.activeTab === "streams" || state.selectedStream?.id === stream.id;
    await watchClientStream(stream, { includeVideo: wantsVideo, includeAudio: true })
      .catch((error) => notify(`Микрофон ${stream.label}: ${error.message}`, 4000));
    await attachAudioMixInput(stream.id, state.peerMediaByStream.get(stream.id));
    const input = state.audioMixInputs.get(stream.id);
    if (input) {
      const active = state.meeting.activeSpeakerIds.includes(participantId);
      const ducked = active && state.meeting.chairPriority?.mode === "soft" && participantId !== state.meeting.chairPriority.chairId;
      input.gain.gain.setTargetAtTime(active ? (ducked ? 0.2 : 1) : 0, state.audioContext.currentTime, 0.02);
    }
  }
  for (const streamId of [...state.audioMixInputs.keys()]) {
    if (!desired.has(streamId)) detachAudioMixInput(streamId);
  }
  await pruneUnusedViewerPeers();
}

async function reconcileServerAudioMix() {
  const device = await getMcuDevice();
  const candidates = await state.api.get(
    `/mcu/consumable-producers?meetingId=${encodeURIComponent(state.profile.meetingId)}` +
    `&participantId=${encodeURIComponent(state.participantId)}&mode=delegate-audio&includeVideo=false`
  );
  const candidate = candidates.find((item) => item.kind === "audio");
  const current = state.serverAudioSubscriber;
  // A server-side AudioCore generation can replace its producer without
  // closing the browser's recv transport. mediasoup-client then leaves a
  // formally live but permanently muted track behind. Producer identity is
  // therefore part of subscription health, just like it is for video/source
  // subscriptions.
  if (candidate && current?.producerId === candidate.producerId && subscriptionHealthy(current)) return;
  // The initial polling request creates a demand-driven bus. A subsequent
  // state refresh obtains its producer without reconnecting video.
  if (!candidate) {
    // First request creates the demand-driven server bus. Poll it quickly
    // once so a floor-open does not wait for the normal UI refresh interval.
    setTimeout(() => watchServerAudioMix().catch(() => {}), 120);
    return;
  }
  const transport = await createMcuTransport("recv"), consumers = [];
  try {
    const result = await state.api.post("/mcu/consumers", {
      meetingId: state.profile.meetingId, participantId: state.participantId,
      transportId: transport.id, producerId: candidate.producerId, rtpCapabilities: device.rtpCapabilities
    });
    const consumer = await transport.consume({ id: result.session.id, producerId: result.producerId,
      kind: result.session.kind, rtpParameters: result.rtpParameters });
    consumers.push(consumer);
    await state.api.post(`/mcu/consumers/${encodeURIComponent(consumer.id)}/resume`, {});
    const media = new MediaStream([consumer.track]);
    let audio = state.serverAudioElement;
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.hidden = true;
      audio.dataset.role = "conference-mix-minus";
      document.body.append(audio);
      state.serverAudioElement = audio;
    }
    audio.srcObject = media;
    audio.volume = state.translationVolume;
    if (audio.setSinkId) await audio.setSinkId(state.selectedAudioOutputId || "default").catch(() => {});
    await audio.play().catch(() => { state.audioUnlockRequired = true; });
    updateAudioUnlock();
    const previous = state.serverAudioSubscriber;
    state.serverAudioSubscriber = { producerId: candidate.producerId, transport, consumers, audio,
      connectionState: transport.connectionState, disconnectedAt: null, needsReplacement: false };
    state.serverAudioMedia = media;
    observeReceiveTransport(state.serverAudioSubscriber, () => state.serverAudioSubscriber?.transport === transport,
      () => watchServerAudioMix().catch(() => {}));
    await closeServerAudioSubscriber(previous);
  } catch (error) {
    consumers.forEach((consumer) => consumer.close()); closeMcuTransport(transport); throw error;
  }
}

async function watchServerAudioMix() {
  if (state.serverAudioSync) return state.serverAudioSync;
  const attempt = reconcileServerAudioMix();
  state.serverAudioSync = attempt;
  try {
    return await attempt;
  } finally {
    if (state.serverAudioSync === attempt) state.serverAudioSync = null;
  }
}

async function closeServerAudioSubscriber(entry = state.serverAudioSubscriber) {
  if (!entry) return;
  if (entry === state.serverAudioSubscriber) { state.serverAudioSubscriber = null; state.serverAudioMedia = null; }
  if (entry.audio && entry.audio === state.serverAudioElement && state.serverAudioSubscriber?.audio !== entry.audio) {
    entry.audio.pause();
    entry.audio.srcObject = null;
  }
  await closeProgramSubscriberEntry(entry);
}

async function closeAllPeers({ notifyServer = true } = {}) {
  state.mediaGeneration = (state.mediaGeneration ?? 0) + 1;
  await closeProgramSubscriber();
  await Promise.allSettled([...state.mcuSubscribers.keys()].map((streamId) => closeMcuSubscriber(streamId)));
  await Promise.allSettled([...state.mcuPublishers.keys()].map((id) => closeMcuPublisher(id)));
  state.mcuPublishers.clear();
  state.mcuSubscribers.clear();
  state.peerMediaByStream.clear();
  for (const streamId of [...state.audioMixInputs.keys()]) detachAudioMixInput(streamId);
  await closeServerAudioSubscriber();
  await state.audioContext?.close().catch(() => {});
  state.audioContext = null;
  updateAudioUnlock();
  state.remoteMedia = null;
}

function bindChatChannel(sessionId, channel) {
  state.chatChannels.set(sessionId, channel);
  channel.onopen = () => {
    state.activeChatId ??= sessionId;
    if (state.activeTab === "chat") renderPage();
  };
  channel.onmessage = (event) => {
    let payload;
    try { payload = JSON.parse(event.data); } catch (_) { payload = { text: String(event.data), at: new Date().toISOString() }; }
    const messages = state.chatMessages.get(sessionId) ?? [];
    if (payload.id && messages.some((item) => item.id === payload.id)) return;
    messages.push({ id: payload.id, text: String(payload.text ?? ""), at: payload.at ?? new Date().toISOString(), own: false });
    state.chatMessages.set(sessionId, messages.slice(-200));
    if (state.activeTab === "chat" && state.activeChatId === sessionId) {
      markChatRead(sessionId); renderPage();
    } else {
      state.chatUnread.set(sessionId, (state.chatUnread.get(sessionId) ?? 0) + 1);
      updateChatNotice();
      notify(`Новое личное сообщение от ${partnerFor(state.chatSessions.find((item) => item.id === sessionId) ?? {}).displayName ?? "участника"}`);
    }
  };
  channel.onclose = () => { if (state.activeTab === "chat") renderPage(); };
}

function newChatPeer(session, initiator) {
  const existing = state.chatPeers.get(session.id);
  if (existing) return existing;
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    state.api.post(`/chat/sessions/${session.id}/signals`, {
      participantId: state.participantId,
      type: "ice",
      payload: event.candidate.toJSON()
    }).catch((error) => notify(`P2P chat: ${error.message}`));
  };
  pc.ondatachannel = (event) => bindChatChannel(session.id, event.channel);
  pc.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(pc.connectionState)) {
      state.chatPeers.delete(session.id);
      state.chatChannels.delete(session.id);
      state.chatSignalSequence.delete(session.id);
      state.chatPendingIce.delete(session.id);
    }
  };
  state.chatPeers.set(session.id, pc);
  state.chatSignalSequence.set(session.id, 0);
  state.chatPendingIce.set(session.id, []);
  if (initiator) bindChatChannel(session.id, pc.createDataChannel("edge-s-private-chat", { ordered: true }));
  return pc;
}

async function startChatOffer(session) {
  const pc = newChatPeer(session, true);
  if (pc.signalingState !== "stable" || pc.localDescription) return;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await state.api.post(`/chat/sessions/${session.id}/signals`, {
    participantId: state.participantId,
    type: "offer",
    payload: { type: offer.type, sdp: offer.sdp }
  });
}

async function openChat(participantId) {
  const session = await state.api.post("/chat/sessions", {
    meetingId: state.profile.meetingId,
    participantA: state.participantId,
    participantB: participantId
  });
  if (!state.chatSessions.some((item) => item.id === session.id)) state.chatSessions.push(session);
  state.activeChatId = session.id;
  await startChatOffer(session);
  renderPage();
}

async function pollChatSignaling() {
  const query = new URLSearchParams({ meetingId: state.profile.meetingId, participantId: state.participantId });
  const sessions = await state.api.get(`/chat/sessions?${query}`);
  reconcileChatSessions(sessions);
  for (const session of state.chatSessions) {
    const persisted = (session.messages ?? []).map((message) => ({
      id: message.id, text: message.text, at: message.at, own: message.participantId === state.participantId
    }));
    if (persisted.length) state.chatMessages.set(session.id, persisted);
    let pc = state.chatPeers.get(session.id);
    if (!pc && session.initiatorParticipantId === state.participantId) {
      await startChatOffer(session);
      pc = state.chatPeers.get(session.id);
    } else if (!pc) {
      pc = newChatPeer(session, false);
    }
    const signalQuery = new URLSearchParams({
      participantId: state.participantId,
      after: String(state.chatSignalSequence.get(session.id) || 0)
    });
    const signals = await state.api.get(`/chat/sessions/${session.id}/signals?${signalQuery}`);
    for (const signal of signals) {
      state.chatSignalSequence.set(session.id, signal.sequence);
      if (signal.type === "offer") {
        if (pc.signalingState !== "stable") {
          if (pc.remoteDescription?.type === "offer" && pc.remoteDescription.sdp === signal.payload.sdp) continue;
          continue;
        }
        await pc.setRemoteDescription(signal.payload);
        for (const candidate of state.chatPendingIce.get(session.id) ?? []) await pc.addIceCandidate(candidate);
        state.chatPendingIce.set(session.id, []);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await state.api.post(`/chat/sessions/${session.id}/signals`, {
          participantId: state.participantId,
          type: "answer",
          payload: { type: answer.type, sdp: answer.sdp }
        });
      } else if (signal.type === "answer") {
        if (pc.signalingState !== "have-local-offer") {
          if (pc.signalingState === "stable") continue;
          continue;
        }
        await pc.setRemoteDescription(signal.payload);
        for (const candidate of state.chatPendingIce.get(session.id) ?? []) await pc.addIceCandidate(candidate);
        state.chatPendingIce.set(session.id, []);
      } else if (signal.type === "ice") {
        if (pc.signalingState === "closed") continue;
        if (pc.remoteDescription) await pc.addIceCandidate(signal.payload).catch(() => {});
        else state.chatPendingIce.get(session.id)?.push(signal.payload);
      } else if (signal.type === "end") {
        pc.close();
        state.chatPeers.delete(session.id);
        state.chatChannels.delete(session.id);
      } else if (signal.type === "message") {
        const messages = state.chatMessages.get(session.id) ?? [];
        if (!messages.some((item) => item.id === signal.id)) {
          messages.push({ id: signal.id, text: String(signal.payload?.text ?? ""), at: signal.payload?.at ?? signal.createdAt, own: false });
          state.chatMessages.set(session.id, messages.slice(-200));
          if (state.activeTab === "chat" && state.activeChatId === session.id) markChatRead(session.id);
          else state.chatUnread.set(session.id, (state.chatUnread.get(session.id) ?? 0) + 1);
          updateChatNotice();
        }
      }
    }
  }
}

async function sendChatMessage(text) {
  const sessionId = state.activeChatId;
  const channel = state.chatChannels.get(sessionId);
  const payload = { text: String(text).slice(0, 1000), at: new Date().toISOString() };
  const signal = await state.api.post(`/chat/sessions/${sessionId}/signals`, {
    participantId: state.participantId, type: "message", payload
  });
  if (channel?.readyState === "open") channel.send(JSON.stringify({ ...payload, id: signal.id }));
  const messages = state.chatMessages.get(sessionId) ?? [];
  messages.push({ ...payload, id: signal.id, own: true });
  state.chatMessages.set(sessionId, messages.slice(-200));
  const input = $("#chatMessage");
  if (input) input.value = "";
  state.chatDrafts.set(sessionId, "");
  renderPage();
}

async function closeAllChats() {
  for (const [sessionId, channel] of state.chatChannels) {
    if (channel.readyState === "open") {
      await state.api.post(`/chat/sessions/${sessionId}/signals`, {
        participantId: state.participantId, type: "end", payload: {}
      }).catch(() => {});
    }
    channel.close();
  }
  for (const pc of state.chatPeers.values()) pc.close();
  state.chatPeers.clear();
  state.chatChannels.clear();
  state.chatSignalSequence.clear();
  state.chatPendingIce.clear();
}

async function checkReadiness() {
  state.readiness = await state.api.get(`/rooms/default-room/readiness?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
}

async function checkDevice(deviceId) {
  await state.api.post(`/devices/${deviceId}/check?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
}

async function deviceCommand(deviceId) {
  const device = state.devices.find((item) => item.id === deviceId);
  const suggestion = Array.isArray(device?.capabilities) ? device.capabilities[0] : "custom";
  const values=await httpForm("Команда устройства",[{name:"command",label:"Команда",value:suggestion||"custom"},{name:"raw",label:"Параметры JSON",type:"textarea",value:suggestion==="ptz.gotoPreset"?'{"preset":"1"}':suggestion==="volume.set"?'{"value":50}':"{}"}]);if(!values)return;const {command,raw}=values;
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { throw new Error("Параметры должны быть корректным JSON"); }
  await state.api.post(`/devices/${deviceId}/commands?meetingId=${encodeURIComponent(state.profile.meetingId)}`, { command, payload });
}

async function publishRoom(status) {
  await state.api.post(`/signage/scenes?meetingId=${encodeURIComponent(state.profile.meetingId)}`, {
    type: "room-status",
    title: status === "free" ? "Зал свободен" : state.meeting.title,
    body: status === "free" ? "Следующее мероприятие — по расписанию" : "Идёт заседание · просьба не входить",
    roomStatus: status,
    target: { roomId: "default-room" }
  });
}

async function callParticipant() {
  const source = state.meeting.quick ? Object.values(state.meeting.participants ?? {}).filter((item) => item.state === "joined") : [
    ...(state.meeting.preparedParticipants ?? []), ...Object.values(state.meeting.participants ?? {}).filter((item) => item.state === "joined")
  ];
  const presenters = [...new Map(source.filter((item) => (item.reports || item.role === "presenter") && item.displayName)
    .map((item) => [item.id, item])).values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));
  const values = await httpForm("Вызов из фойе", [
    { name: "presenterId", label: "Докладчик", type: "select", value: presenters[0]?.id ?? "manual",
      options: [...presenters.map((item) => ({ value: item.id, label: item.displayName })), { value: "manual", label: "Ввести ФИО вручную" }] },
    { name: "name", label: "ФИО", value: "", visibleWhen: { name: "presenterId", values: ["manual"] } },
    { name: "room", label: "Текст вызова", value: "Просим пройти в зал для доклада" }
  ], "Отправить вызов");
  if (!values) return;
  const presenter = presenters.find((item) => item.id === values.presenterId);
  const name = presenter?.displayName ?? values.name?.trim();
  if (!name) throw new Error("Укажите ФИО участника");
  await state.api.post(`/signage/scenes?meetingId=${encodeURIComponent(state.profile.meetingId)}`, {
    type: "participant-call", title: name, body: values.room, roomStatus: "busy",
    participant: { ...(presenter ? { id: presenter.id } : {}), displayName: name }, sound: { enabled: true, tone: "chime", repeats: 2 },
    durationSeconds: 30, target: { group: "foyer" }
  });
}

async function startAes67() {
  state.aes67 = await state.api.post("/media/aes67/start", { meetingId: state.profile.meetingId });
}

async function stopAes67() {
  state.aes67 = await state.api.post("/media/aes67/stop", { meetingId: state.profile.meetingId });
}

async function createServiceRequest() {
  const values=await httpForm("Сервисный запрос",[{name:"category",label:"Категория",type:"select",value:"water",options:serviceRequestCategoryOptions(interfaceLocale())},{name:"quantity",label:"Количество",type:"number",value:"1"},{name:"comment",label:"Комментарий",type:"textarea",value:"",required:false},{name:"includeVideo",label:"Приложить видео (yes/no)",value:"no",required:false}]);if(!values)return;const category=values.category;
  const quantity = Number(values.quantity || 1); const comment=values.comment||""; const includeVideo=Boolean(state.publishedStream&&/^y|да|1$/i.test(values.includeVideo));
  const request = await state.api.post("/service/requests", {
    meetingId: state.profile.meetingId,
    participantId: state.participantId,
    roomId: "default-room",
    items: [{ category, label: serviceRequestCategoryLabel({ category }, "ru"), quantity }],
    comment,
    videoStreamId: includeVideo ? state.publishedStream.id : null
  });
  state.serviceRequests.unshift(request);
}

async function serviceStatus(requestId, status) {
  await state.api.patch(`/service/requests/${requestId}`, { status, assignedTo: state.profile.displayName });
}

async function assignSeat(seatId) {
  const values=await httpForm("Назначить общее место",[{name:"userId",label:"ID сотрудника",value:"reporter-1"},{name:"displayName",label:"ФИО",value:"Иванов Сергей Петрович"}]);if(!values)return;const {userId,displayName}=values;
  const session = await state.api.post(`/shared-seats/${seatId}/assign`, {
    userId, displayName, meetingId: state.profile.meetingId, ttlMinutes: 30
  });
  notify(`Одноразовый PIN для ${displayName}: ${session.oneTimePin}`, 15000);
}

async function assignPresenterWorkplace(presenterId) {
  const presenter = state.meeting.preparedParticipants?.find((item) => item.id === presenterId &&
    (item.reports || item.role === "presenter"));
  if (!presenter) throw new Error("Докладчик не найден в регламенте конференции");
  const seats = state.sharedSeats.filter((item) => !item.session ||
    !["pending", "active", "finishing"].includes(item.session.status));
  if (!seats.length) throw new Error("Нет свободного логического места. Создайте его в служебном интерфейсе.");
  const values = await httpForm(`Место докладчика: ${presenter.displayName}`, [{
    name: "presenterSeatId", label: "Логическое рабочее место", type: "select",
    value: presenter.presenterSeatId ?? seats[0].id,
    options: seats.map((seat) => ({ value: seat.id,
      label: `${seat.name} (${seat.id})${seat.online ? " · устройство в сети" : " · устройство не в сети"}` }))
  }], "Назначить");
  if (!values) return;
  const selected = seats.find((seat) => seat.id === values.presenterSeatId);
  if (values.presenterSeatId === presenter.presenterSeatId && !selected?.online) {
    throw new Error("Устройство этого места не в сети. Привяжите его на странице входа либо выберите другое место.");
  }
  state.meeting = await state.api.patch(`/meetings/${encodeURIComponent(state.profile.meetingId)}/presenters/${encodeURIComponent(presenterId)}/workplace`,
    { presenterSeatId: values.presenterSeatId });
}

async function releaseSeat(seatId) {
  await state.api.post(`/shared-seats/${seatId}/release`);
}

async function claimSeat() {
  const values=await httpForm("Войти на общее место",[{name:"seatId",label:"ID места",value:"report-seat-01"},{name:"pin",label:"Одноразовый PIN",value:""}]);if(!values)return;const {seatId,pin}=values;
  state.claimedSeat = await state.api.post(`/shared-seats/${seatId}/claim`, { pin });
}

async function createVote() {
  const voteCore = await state.api.get("/vote-core/status");
  const pro = voteCore.licenseTier === "pro";
  const ruleLabels = { "standard-majority":"Обычное большинство", "supermajority-two-thirds":"Квалифицированное большинство 2/3",
    "double-majority":"Двойное большинство", "cumulative-board":"Кумулятивное", "ranked-choice-irv":"Рейтинговое IRV",
    "stv-droop":"STV / квота Друпа", "veto-consensus":"Вето" };
  const ruleOptions = (voteCore.ruleSets ?? []).map((item) => ({ value:item.id, label:item.name ?? ruleLabels[item.id] ?? item.id }));
  const electorate = voteElectorateCandidates();
  const fields = [
    {name:"topic",label:"Тема",value:"Принятие решения"}, {name:"question",label:"Вопрос",type:"textarea",value:"Утвердить решение?"},
    {name:"raw",label:"Варианты через ;",type:"textarea",value:(voteCore.defaults?.quickOptions ?? ["За","Против","Воздержался"]).join("; ")},
    {name:"mode",label:"Режим",type:"select",value:"named",options:[{value:"named",label:"Поимённое"},{value:"secret",label:"Тайное"}]},
    ...(pro ? [{name:"weightMode",label:"Подсчёт голоса участника",type:"select",
      value:voteCore.defaults?.governance?.profile === "board" ? "one-person" : "weighted",
      options:[{value:"one-person",label:"1 участник = 1 голос, даже при весе 0"},{value:"weighted",label:"По весу из состава совещания, включая 0"}]}] : []),
    {name:"durationSeconds",label:"Длительность, секунд",type:"number",value:voteCore.defaults?.durationSeconds ?? 60},
    {name:"ruleSetId",label:"Набор правил",type:"select",value:voteCore.defaults?.ruleSetId ?? "standard-majority",options:ruleOptions},
    {name:"quorumKind",label:"Кворум",type:"select",value:voteCore.defaults?.quorumRule?.kind ?? "majority",options:[{value:"majority",label:"50% + 1"},{value:"percent",label:"Процент"},{value:"governance-percent-plus-one",label:"% + 1 от общего объёма голосов/мандатов"},{value:"fixed",label:"Фиксированное число"}]},
    {name:"quorumValue",label:"Значение кворума",type:"number",value:voteCore.defaults?.quorumRule?.value ?? 50,visibleWhen:{name:"quorumKind",values:["percent","governance-percent-plus-one","fixed"]}},
    {name:"quorumParticipation",label:"Источник участия",type:"select",value:voteCore.defaults?.quorumRule?.participation ?? "connected-at-open",options:[{value:"connected-at-open",label:"Подключённые при открытии"},{value:"ballots-cast",label:"Фактически проголосовавшие"}]}
  ];
  if (can("pgm.tiles")) fields.push(
    {name:"resultTarget",label:"Итоги после закрытия",type:"select",value:"none",options:[{value:"none",label:"Не отправлять в PGM"},{value:"tiles",label:"Плиткой в PGM"},{value:"program",label:"Во весь PGM"}]},
    {name:"resultHoldSeconds",label:"Показывать итоги, сек.",type:"number",value:voteCore.defaults?.displayPolicy?.resultHoldSeconds ?? 30}
  );
  if (pro) fields.push(
    {name:"customize",label:"Изменить параметры выбранного шаблона",type:"select",value:"false",options:[{value:"false",label:"Нет"},{value:"true",label:"Да"}]},
    {name:"ballotType",label:"Тип бюллетеня",type:"select",value:"single",options:[{value:"single",label:"Один вариант"},{value:"approval",label:"Одобрение нескольких"},{value:"cumulative",label:"Кумулятивный"},{value:"ranked",label:"Рейтинговый"},{value:"veto",label:"Вето"}],visibleWhen:{name:"customize",values:["true"]}},
    {name:"decisionKind",label:"Метод подсчёта",type:"select",value:"simple-majority",options:[{value:"simple-majority",label:"Простое большинство"},{value:"absolute-majority",label:"Абсолютное большинство"},{value:"plurality",label:"Относительное большинство"},{value:"supermajority",label:"Квалифицированное большинство"},{value:"double-majority",label:"Двойное большинство"},{value:"ranked-choice",label:"IRV"},{value:"stv",label:"STV"},{value:"veto",label:"Вето"}],visibleWhen:{name:"customize",values:["true"]}},
    {name:"thresholdPercent",label:"Порог решения, %",type:"number",value:66.67,visibleWhen:{name:"customize",values:["true"]}},
    {name:"groupThresholdPercent",label:"Порог каждой группы, %",type:"number",value:50,visibleWhen:{name:"customize",values:["true"]}},
    {name:"seats",label:"Количество избираемых мест",type:"number",value:1,visibleWhen:{name:"customize",values:["true"]}},
    {name:"ballotLimit",label:"Баллы / максимум вариантов / порог вето",type:"number",value:10,visibleWhen:{name:"customize",values:["true"]}},
    {name:"multiRound",label:"Несколько туров",type:"select",value:String(Boolean(voteCore.defaults?.multiRound?.enabled)),options:[{value:"false",label:"Нет"},{value:"true",label:"Да"}]},
    {name:"maxRounds",label:"Максимум туров",type:"number",value:voteCore.defaults?.multiRound?.maxRounds ?? 2,visibleWhen:{name:"multiRound",values:["true"]}},
    {name:"advanceCount",label:"Проходит в следующий тур",type:"number",value:voteCore.defaults?.multiRound?.advanceCount ?? 2,visibleWhen:{name:"multiRound",values:["true"]}}
  );
  const values=await voteCreationForm(pro ? "Новое голосование · VoteCore Pro" : "Новое голосование · VoteCore Basic",fields,electorate,pro,voteCore.defaults?.governance ?? {},"Создать проект");if(!values)return;
  const {topic,question,raw,mode,ruleSetId}=values;
  const options = raw?.split(";").map((item) => item.trim()).filter(Boolean) || [];
  if (options.length < 2) throw new Error("Нужно не менее двух вариантов.");
  const body = { topic, question, options, mode, weightMode: pro ? values.weightMode : "one-person",
    ruleSetId, durationSeconds:Number(values.durationSeconds),
    quorumRule:{ basis:"eligible", participation:values.quorumParticipation, kind:values.quorumKind,
      ...(values.quorumKind === "majority" ? {} : { value:Number(values.quorumValue) }) } };
  if (can("pgm.tiles")) body.displayPolicy = { resultTarget: values.resultTarget, resultHoldSeconds: Number(values.resultHoldSeconds) };
  body.eligibleParticipantIds = values.electorate.map((item) => item.id);
  if (pro) {
    body.multiRound = { enabled:values.multiRound === "true", maxRounds:Number(values.maxRounds || 1), advanceCount:Number(values.advanceCount || 2) };
    body.voterWeights = Object.fromEntries(values.electorate.map((item) => [item.id, item.weight]));
    body.voterGroups = Object.fromEntries(values.electorate.map((item) => [item.id, item.group]));
    if (values.customize === "true") {
      body.ballotType = values.ballotType;
      const limit = Number(values.ballotLimit) || 1;
      body.ballotConfig = values.ballotType === "cumulative" ? {points:limit} : values.ballotType === "approval" ? {maxSelections:limit} : values.ballotType === "veto" ? {maxVetoes:limit} : {};
      body.decisionRule = {kind:values.decisionKind,thresholdPercent:Number(values.thresholdPercent),groupThresholdPercent:Number(values.groupThresholdPercent),seats:Number(values.seats)||1,vetoThreshold:limit};
    }
  }
  await state.api.post(`/meetings/${state.profile.meetingId}/votes`, body);
}

async function castVote(voteId, optionId) {
  state.voteCastPending ??= new Map();
  if (state.voteCastPending.has(voteId)) return false;
  if (state.voteSelections.has(voteId) || state.votes.find((vote) => vote.id === voteId)?.hasVoted) {
    notify("Ваш голос уже принят");
    return false;
  }
  state.voteCastPending.set(voteId, optionId);
  renderPage();
  try {
    await state.api.post(`/votes/${voteId}/cast`, {
      participantId: state.participantId,
      optionIds: [optionId]
    });
    state.voteSelections.set(voteId, optionId);
    saveVoteSelections();
  } catch (error) {
    if (error.status !== 409 || error.serverMessage !== "Participant has already voted") throw error;
    const vote = state.votes.find((item) => item.id === voteId);
    if (vote) vote.hasVoted = true;
    notify("Ваш голос уже принят");
    return false;
  } finally {
    state.voteCastPending.delete(voteId);
    renderPage();
  }
}

async function castAdvancedVote(voteId) {
  const vote = state.votes.find((item) => item.id === voteId);
  const root = document.querySelector(`[data-ballot-vote="${CSS.escape(voteId)}"]`);
  if (!vote || !root) throw new Error("Бюллетень не найден");
  const ballot = {};
  if (vote.ballotType === "cumulative") ballot.allocations = Object.fromEntries([...root.querySelectorAll("[data-ballot-allocation]")].map((field) => [field.dataset.ballotAllocation, Number(field.value)]));
  else if (vote.ballotType === "ranked") ballot.ranking = [...root.querySelectorAll("[data-ballot-rank]")].sort((a, b) => Number(a.value) - Number(b.value)).filter((field) => Number(field.value) > 0).map((field) => field.dataset.ballotRank);
  else if (vote.ballotType === "veto") ballot.vetoOptionIds = [...root.querySelectorAll("[data-ballot-veto]:checked")].map((field) => field.dataset.ballotVeto);
  else ballot.optionIds = [...root.querySelectorAll("[data-ballot-approval]:checked")].map((field) => field.dataset.ballotApproval);
  await state.api.post(`/votes/${voteId}/cast`, { participantId: state.participantId, ballot });
  state.voteSelections.set(voteId, "advanced"); saveVoteSelections();
}

async function createNextVoteRound(voteId) {
  await state.api.post(`/votes/${voteId}/next-round`, {});
}

async function uploadDocument(file, agendaItemId = null) {
  if (!file) return;
  await state.api.request(`/meetings/${state.profile.meetingId}/documents`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeIdentityHeader(file.name), ...(agendaItemId ? { "X-Agenda-Item-Id": agendaItemId } : {}) },
    body: file
  });
}

async function importArchivedDocument() {
  const entries = await state.api.get(`/meetings/${encodeURIComponent(state.profile.meetingId)}/archive-documents`);
  if (!entries.length) throw new Error("В сохранённом архиве завершённых конференций нет документов");
  const values = await httpForm("Документ из завершённой конференции", [{ name: "documentId", label: "Исходный документ",
    type: "select", value: entries[0].id, options: entries.map((item) => ({ value: item.id,
      label: `${item.sourceMeetingTitle || item.sourceMeetingId} · ${item.fileName}` })) }], "Добавить в мои документы");
  if (values) await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/documents/import-archive`,
    { documentId: values.documentId });
}

async function uploadAgendaDocument(file) {
  if (!file) return;
  const items = state.meeting.agenda ?? [];
  if (!items.length) throw new Error("Сначала добавьте вопросы повестки");
  const values = await httpForm("Прикрепить документ к повестке", [{ name: "agendaItemId", label: "Вопрос повестки", type: "select", value: state.meeting.activeAgendaItemId ?? items[0].id, options: items.map((item) => ({ value: item.id, label: item.title })) }], "Прикрепить");
  if (values) await uploadDocument(file, values.agendaItemId);
}

async function openDocument(documentId, presentationId = null) {
  const item = state.documents.find((entry) => entry.id === documentId)
    ?? await state.api.get(`/documents/${encodeURIComponent(documentId)}`);
  const presentation = presentationId
    ? state.presentations.find((entry) => entry.id === presentationId)
      ?? await state.api.get(`/presentations/${encodeURIComponent(presentationId)}`)
    : null;
  const me = state.meeting?.participants?.[state.participantId];
  await openDocumentViewer({
    api: state.api, document: item, presentation,
    userId: state.profile.userId,
    draft: !presentation && item.uploadedBy === state.profile.userId,
    canAnnotate: Boolean(presentation && (canViewFiles() || canManageContent()) &&
      (me?.permissions?.canAnnotatePresentation === true || canManageContent())) ||
      (!presentation && item.uploadedBy === state.profile.userId),
    canControl: Boolean(presentation && canManageContent()),
    onSendToHall: async (id, target) => {
      const route = { program: "send-to-program", multiview: "send-to-program-tile",
        "remove-program": "remove-from-program", "remove-multiview": "remove-from-program-tile" }[target];
      if (!route) throw new Error("Неизвестное направление показа");
      const updated = await state.api.post(`/presentations/${id}/${route}`);
      const index = state.presentations.findIndex((entry) => entry.id === id);
      if (index >= 0) state.presentations[index] = updated;
      notify(target.startsWith("remove-") ? "Трансляция документа завершена" :
        target === "program" ? "Документ отправлен в PGM" : "Документ добавлен плиткой в PGM");
      return updated;
    }
  });
}

async function startPresentationBroadcast(presentationId) {
  const current = await state.api.get(`/meetings/${state.profile.meetingId}/presentations`);
  const alreadyActive = current.find((item) => item.status === "active" && item.id === presentationId);
  if (alreadyActive) {
    await openDocument(alreadyActive.documentId, alreadyActive.id);
    return;
  }
  const active = current.find((item) => item.status === "active" && item.id !== presentationId);
  if (active) {
    const replace = await confirmDialog(`Сейчас в показе «${active.title}». Завершить его показ и открыть новый документ?`,
      "Транслировать новый", "Оставить текущий");
    if (!replace) return false;
    await state.api.post(`/presentations/${active.id}/stop`);
    state.presentations = state.presentations.map((item) => item.id === active.id ? { ...item, status: "stopped" } : item);
  }
  const presentation = await state.api.post(`/presentations/${presentationId}/start`);
  const index = state.presentations.findIndex((item) => item.id === presentation.id);
  if (index >= 0) state.presentations[index] = presentation;
  else state.presentations.push(presentation);
  await openDocument(presentation.documentId, presentation.id);
  notify("Показ открыт участникам. PGM не переключён.", 6000);
}

async function shareScreen() {
  if (!canShareScreen()) throw new Error("Для вашей учётной записи демонстрация экрана отключена");
  if (state.contentPublishedStream && state.contentMedia) return;
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Браузер не поддерживает демонстрацию экрана");
  const media = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: true });
  const stream = await state.api.post(`/meetings/${state.profile.meetingId}/streams`, {
    sourceType: "content_source", ownerParticipantId: state.participantId,
    label: `${state.profile.displayName} — демонстрация экрана`, protocol: "webrtc",
    capabilities: { video: true, audio: media.getAudioTracks().length > 0, content: true }
  });
  state.contentMedia = media;
  state.contentPublishedStream = stream;
  media.getVideoTracks()[0].onended = () => stopScreenShare().catch(() => {});
  await publishMediaToMcu(stream, media);
  notify("Демонстрация экрана запущена", 6000);
}

async function stopScreenShare() {
  const streamId = state.contentPublishedStream?.id;
  const media = state.contentMedia;
  state.contentPublishedStream = null;
  state.contentMedia = null;
  for (const track of media?.getTracks?.() ?? []) { track.onended = null; track.stop(); }
  if (streamId) await closeMcuPublisher(streamId);
  if (streamId) await state.api.delete(`/streams/${encodeURIComponent(streamId)}`).catch((error) => {
    if (error.status !== 404) throw error;
  });
  notify("Демонстрация экрана остановлена", 4000);
}

async function installPwa() {
  if (state.installPrompt) {
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    $$('[data-action="install-pwa"]').forEach((button) => { button.hidden = true; });
  } else {
    notify("Android: меню браузера → «Установить». iPadOS: «Поделиться» → «На экран Домой».", 8000);
  }
}

// Fullscreen API as a one-tap alternative to installing the PWA: the
// address bar eating screen space during scroll on a tablet is exactly
// what this avoids, without requiring the "Add to Home Screen" step (which
// iOS Safari in particular buries and never exposes via beforeinstallprompt).
async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
    return;
  }
  if (!document.documentElement.requestFullscreen) {
    notify("Браузер не поддерживает полноэкранный режим по кнопке; используйте «Установить PWA».", 6000);
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
  } catch (error) {
    notify(`Полноэкранный режим недоступен: ${error.message}`, 6000);
  }
}

export { inMcu, runAction, requestFloor, applyLocalFloorResult, runMicrophoneAction, activateChairMicrophone,
  grantFloor, releaseFloor, selfRelease, saveMicrophoneLimit, toggleFifo, saveDiscussionMode,
  toggleChairPriority, muteAllMicrophones, activateAgenda, revealAccessPin, editAccessPin, changeParticipantRole,
  toggleIncomingAudio, removeParticipant, confirmRemoveParticipant, ensureMicrophone, syncLocalMicrophone,
  startCamera, stopCamera, startPublishing, ensurePublishedMedia, registerSystemCamera, editStream,
  deleteStream, deleteCamera, refreshMediaRuntime, discoverOnvifCameras, addOnvifCamera, quickProbeCamera,
  probeCamera, attachCamera, startMediaWorker, startMulticast, routePreview, takeProgram, resumeAutoDirector,
  discoverNdiSources, attachNdiSource, saveNdiCamera, toggleCameraAutoAttach, receiveNdiSource,
  receiveNdiStream, toggleNdiOutput, configureNdiOutput, startNdiOutput, stopNdiJob, toggleAutoDirector,
  savePgmMode, resetPgmMode, selectStream, ensureStreamPreview, mediaForStream, getMcuDevice,
  createMcuTransport, publishMediaToMcu, closeMcuTransport, closeMcuPublisher, subscribeMcuStream,
  closeProgramSubscriberEntry, RECEIVE_DISCONNECTED_GRACE_MS, observeReceiveTransport, subscriptionHealthy,
  inboundProgramVideoCounters, checkProgramVideoHealth, closeProgramSubscriber, waitForVideoFrame,
  watchProgramStream, closeMcuSubscriber, watchClientStream, reconcileSelectedStream, pollSignaling,
  closeViewerStream, pruneUnusedViewerPeers, ensureAudioContext, updateAudioUnlock, mobileAudioEndpoint,
  updateHeadphoneWarning, attachAudioMixInput, detachAudioMixInput, syncConferenceAudio, reconcileServerAudioMix,
  watchServerAudioMix, closeServerAudioSubscriber, closeAllPeers, bindChatChannel, newChatPeer,
  startChatOffer, openChat, pollChatSignaling, sendChatMessage, closeAllChats, checkReadiness,
  checkDevice, deviceCommand, publishRoom, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote,
  castAdvancedVote, createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument,
  openDocument, startPresentationBroadcast, shareScreen, stopScreenShare, installPwa, toggleFullscreen };
