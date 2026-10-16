import { encodeIdentityHeader } from "./identityEncoding.js";
import { observeBottomControls } from "./dockLayout.js";
import { serviceRequestCategoryLabel, serviceRequestStatusLabel,
  serviceRequestCategoryOptions } from "./serviceRequestLocale.js";
import { eventRetryDelay } from "./eventConnection.js";
import { clientBuildReady } from "./clientBuild.js";
import { PARTICIPANT_LANGUAGES, participantLanguageOptions, configureParticipantLanguages,
  participantLanguage, setParticipantLanguage, applyParticipantLanguage,
  participantText, participantFormatTime } from "./i18n.js";
import { openDocumentViewer, closeDocumentViewer, minimizeDocumentViewer, updateDocumentViewerRights,
  updateDocumentViewerBadge, documentSceneEvent } from "./documentViewer.js";

const VoxNoticeLocale = globalThis.VoxNoticeLocale;
let canEditWorkspaceLayout, handleWorkspaceUiAction, applyWorkspaceLayout, renderPage, updateNavigationVisibility, translationHtml, unreadChatCount, updateChatNotice, markChatRead, pageHead, VOTE_OUTCOME_LABELS, updateVoteCountdowns,
  advancedBallot, voteOutcomeLabel, conferenceVoteCard, conferenceVoteStatusCard, closeVoteResultsModal, openVoteResultsModal, microphoneIcon, renderMicrophoneDock,
  renderFixedControls, can, pgmModeHtml, hydrateSlatePreviews, uploadPgmSlate, selectPgmSlate, deletePgmSlate, syncSecretaryTurn,
  secretarySpeakersHtml, secretaryWorkspaceHtml, saveSecretaryTranscript, saveSecretaryEditor, clearSecretaryEditor, secretaryLayoutPanel, moveSecretaryLayoutPanel, handleSecretaryLayoutAction,
  secretaryLayoutGesture, startSecretaryLayoutGesture, moveSecretaryLayoutGesture, finishSecretaryLayoutGesture, conferenceHtml, audioConferenceHtml, canOperateMedia, streamLabel,
  actionIcon, streamStatusHtml, participantsAndSourcesHtml, streamsHtml, localAvDevicesHtml, absoluteMediaUrl, resumeVideoElement, programCaption,
  normalizedCaption, setMediaCaptions, mountMediaView, mountStudioMonitors, stopThumbnailLoop, drawThumbnails, mountStreamThumbnails, handleStreamPreviewKeydown,
  closeStreamPreviewModal, openStreamPreviewModal, mountStreamPreviewModal, mountProgram, canManageVotes, canCastVotes, isEligibleForVote, canViewFiles,
  canUploadFiles, canShareScreen, canSpeak, votingHtml, canManageContent, contentHtml, partnerFor, chatPartnerId,
  isLiveChatSession, closeChatSessionLocally, reconcileChatSessions, chatHtml, requestItemsText, operationsHtml, settingsHtml, inMcu,
  runAction, requestFloor, applyLocalFloorResult, runMicrophoneAction, activateChairMicrophone, grantFloor, releaseFloor, selfRelease,
  saveMicrophoneLimit, toggleFifo, saveDiscussionMode, toggleChairPriority, muteAllMicrophones, activateAgenda, revealAccessPin, editAccessPin,
  changeParticipantRole, toggleIncomingAudio, removeParticipant, confirmRemoveParticipant, ensureMicrophone, syncLocalMicrophone, startCamera, stopCamera,
  startPublishing, ensurePublishedMedia, registerSystemCamera, editStream, deleteStream, deleteCamera, refreshMediaRuntime, discoverOnvifCameras,
  addOnvifCamera, quickProbeCamera, probeCamera, attachCamera, startMediaWorker, startMulticast, routePreview, takeProgram,
  resumeAutoDirector, discoverNdiSources, attachNdiSource, saveNdiCamera, toggleCameraAutoAttach, receiveNdiSource, receiveNdiStream, toggleNdiOutput,
  configureNdiOutput, startNdiOutput, stopNdiJob, toggleAutoDirector, savePgmMode, resetPgmMode, selectStream, ensureStreamPreview,
  mediaForStream, getMcuDevice, createMcuTransport, publishMediaToMcu, closeMcuTransport, closeMcuPublisher, subscribeMcuStream, closeProgramSubscriberEntry,
  RECEIVE_DISCONNECTED_GRACE_MS, observeReceiveTransport, subscriptionHealthy, inboundProgramVideoCounters, checkProgramVideoHealth, closeProgramSubscriber, waitForVideoFrame, watchProgramStream,
  closeMcuSubscriber, watchClientStream, reconcileSelectedStream, pollSignaling, closeViewerStream, pruneUnusedViewerPeers, ensureAudioContext, updateAudioUnlock,
  mobileAudioEndpoint, updateHeadphoneWarning, attachAudioMixInput, detachAudioMixInput, syncConferenceAudio, reconcileServerAudioMix, watchServerAudioMix, closeServerAudioSubscriber,
  closeAllPeers, bindChatChannel, newChatPeer, startChatOffer, openChat, pollChatSignaling, sendChatMessage, closeAllChats,
  checkReadiness, checkDevice, deviceCommand, publishRoom, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote, castAdvancedVote,
  createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument, openDocument, startPresentationBroadcast, shareScreen, stopScreenShare,
  installPwa, toggleFullscreen;
let featureModulesPromise = null;
async function loadFeatureModules() {
  if (!featureModulesPromise) featureModulesPromise = Promise.all([
    import("./clientViews.js"), import("./clientOperations.js")
  ]).then(([views, operations]) => {
    canEditWorkspaceLayout = views.canEditWorkspaceLayout;
    handleWorkspaceUiAction = views.handleWorkspaceUiAction;
    applyWorkspaceLayout = views.applyWorkspaceLayout;
    renderPage = views.renderPage;
    updateNavigationVisibility = views.updateNavigationVisibility;
    translationHtml = views.translationHtml;
    unreadChatCount = views.unreadChatCount;
    updateChatNotice = views.updateChatNotice;
    markChatRead = views.markChatRead;
    pageHead = views.pageHead;
    VOTE_OUTCOME_LABELS = views.VOTE_OUTCOME_LABELS;
    updateVoteCountdowns = views.updateVoteCountdowns;
    advancedBallot = views.advancedBallot;
    voteOutcomeLabel = views.voteOutcomeLabel;
    conferenceVoteCard = views.conferenceVoteCard;
    conferenceVoteStatusCard = views.conferenceVoteStatusCard;
    closeVoteResultsModal = views.closeVoteResultsModal;
    openVoteResultsModal = views.openVoteResultsModal;
    microphoneIcon = views.microphoneIcon;
    renderMicrophoneDock = views.renderMicrophoneDock;
    renderFixedControls = views.renderFixedControls;
    can = views.can;
    pgmModeHtml = views.pgmModeHtml;
    hydrateSlatePreviews = views.hydrateSlatePreviews;
    uploadPgmSlate = views.uploadPgmSlate;
    selectPgmSlate = views.selectPgmSlate;
    deletePgmSlate = views.deletePgmSlate;
    syncSecretaryTurn = views.syncSecretaryTurn;
    secretarySpeakersHtml = views.secretarySpeakersHtml;
    secretaryWorkspaceHtml = views.secretaryWorkspaceHtml;
    saveSecretaryTranscript = views.saveSecretaryTranscript;
    saveSecretaryEditor = views.saveSecretaryEditor;
    clearSecretaryEditor = views.clearSecretaryEditor;
    secretaryLayoutPanel = views.secretaryLayoutPanel;
    moveSecretaryLayoutPanel = views.moveSecretaryLayoutPanel;
    handleSecretaryLayoutAction = views.handleSecretaryLayoutAction;
    secretaryLayoutGesture = views.secretaryLayoutGesture;
    startSecretaryLayoutGesture = views.startSecretaryLayoutGesture;
    moveSecretaryLayoutGesture = views.moveSecretaryLayoutGesture;
    finishSecretaryLayoutGesture = views.finishSecretaryLayoutGesture;
    conferenceHtml = views.conferenceHtml;
    audioConferenceHtml = views.audioConferenceHtml;
    canOperateMedia = views.canOperateMedia;
    streamLabel = views.streamLabel;
    actionIcon = views.actionIcon;
    streamStatusHtml = views.streamStatusHtml;
    participantsAndSourcesHtml = views.participantsAndSourcesHtml;
    streamsHtml = views.streamsHtml;
    localAvDevicesHtml = views.localAvDevicesHtml;
    absoluteMediaUrl = views.absoluteMediaUrl;
    resumeVideoElement = views.resumeVideoElement;
    programCaption = views.programCaption;
    normalizedCaption = views.normalizedCaption;
    setMediaCaptions = views.setMediaCaptions;
    mountMediaView = views.mountMediaView;
    mountStudioMonitors = views.mountStudioMonitors;
    stopThumbnailLoop = views.stopThumbnailLoop;
    drawThumbnails = views.drawThumbnails;
    mountStreamThumbnails = views.mountStreamThumbnails;
    handleStreamPreviewKeydown = views.handleStreamPreviewKeydown;
    closeStreamPreviewModal = views.closeStreamPreviewModal;
    openStreamPreviewModal = views.openStreamPreviewModal;
    mountStreamPreviewModal = views.mountStreamPreviewModal;
    mountProgram = views.mountProgram;
    canManageVotes = views.canManageVotes;
    canCastVotes = views.canCastVotes;
    isEligibleForVote = views.isEligibleForVote;
    canViewFiles = views.canViewFiles;
    canUploadFiles = views.canUploadFiles;
    canShareScreen = views.canShareScreen;
    canSpeak = views.canSpeak;
    votingHtml = views.votingHtml;
    canManageContent = views.canManageContent;
    contentHtml = views.contentHtml;
    partnerFor = views.partnerFor;
    chatPartnerId = views.chatPartnerId;
    isLiveChatSession = views.isLiveChatSession;
    closeChatSessionLocally = views.closeChatSessionLocally;
    reconcileChatSessions = views.reconcileChatSessions;
    chatHtml = views.chatHtml;
    requestItemsText = views.requestItemsText;
    operationsHtml = views.operationsHtml;
    settingsHtml = views.settingsHtml;
    inMcu = operations.inMcu;
    runAction = operations.runAction;
    requestFloor = operations.requestFloor;
    applyLocalFloorResult = operations.applyLocalFloorResult;
    runMicrophoneAction = operations.runMicrophoneAction;
    activateChairMicrophone = operations.activateChairMicrophone;
    grantFloor = operations.grantFloor;
    releaseFloor = operations.releaseFloor;
    selfRelease = operations.selfRelease;
    saveMicrophoneLimit = operations.saveMicrophoneLimit;
    toggleFifo = operations.toggleFifo;
    saveDiscussionMode = operations.saveDiscussionMode;
    toggleChairPriority = operations.toggleChairPriority;
    muteAllMicrophones = operations.muteAllMicrophones;
    activateAgenda = operations.activateAgenda;
    revealAccessPin = operations.revealAccessPin;
    editAccessPin = operations.editAccessPin;
    changeParticipantRole = operations.changeParticipantRole;
    toggleIncomingAudio = operations.toggleIncomingAudio;
    removeParticipant = operations.removeParticipant;
    confirmRemoveParticipant = operations.confirmRemoveParticipant;
    ensureMicrophone = operations.ensureMicrophone;
    syncLocalMicrophone = operations.syncLocalMicrophone;
    startCamera = operations.startCamera;
    stopCamera = operations.stopCamera;
    startPublishing = operations.startPublishing;
    ensurePublishedMedia = operations.ensurePublishedMedia;
    registerSystemCamera = operations.registerSystemCamera;
    editStream = operations.editStream;
    deleteStream = operations.deleteStream;
    deleteCamera = operations.deleteCamera;
    refreshMediaRuntime = operations.refreshMediaRuntime;
    discoverOnvifCameras = operations.discoverOnvifCameras;
    addOnvifCamera = operations.addOnvifCamera;
    quickProbeCamera = operations.quickProbeCamera;
    probeCamera = operations.probeCamera;
    attachCamera = operations.attachCamera;
    startMediaWorker = operations.startMediaWorker;
    startMulticast = operations.startMulticast;
    routePreview = operations.routePreview;
    takeProgram = operations.takeProgram;
    resumeAutoDirector = operations.resumeAutoDirector;
    discoverNdiSources = operations.discoverNdiSources;
    attachNdiSource = operations.attachNdiSource;
    saveNdiCamera = operations.saveNdiCamera;
    toggleCameraAutoAttach = operations.toggleCameraAutoAttach;
    receiveNdiSource = operations.receiveNdiSource;
    receiveNdiStream = operations.receiveNdiStream;
    toggleNdiOutput = operations.toggleNdiOutput;
    configureNdiOutput = operations.configureNdiOutput;
    startNdiOutput = operations.startNdiOutput;
    stopNdiJob = operations.stopNdiJob;
    toggleAutoDirector = operations.toggleAutoDirector;
    savePgmMode = operations.savePgmMode;
    resetPgmMode = operations.resetPgmMode;
    selectStream = operations.selectStream;
    ensureStreamPreview = operations.ensureStreamPreview;
    mediaForStream = operations.mediaForStream;
    getMcuDevice = operations.getMcuDevice;
    createMcuTransport = operations.createMcuTransport;
    publishMediaToMcu = operations.publishMediaToMcu;
    closeMcuTransport = operations.closeMcuTransport;
    closeMcuPublisher = operations.closeMcuPublisher;
    subscribeMcuStream = operations.subscribeMcuStream;
    closeProgramSubscriberEntry = operations.closeProgramSubscriberEntry;
    RECEIVE_DISCONNECTED_GRACE_MS = operations.RECEIVE_DISCONNECTED_GRACE_MS;
    observeReceiveTransport = operations.observeReceiveTransport;
    subscriptionHealthy = operations.subscriptionHealthy;
    inboundProgramVideoCounters = operations.inboundProgramVideoCounters;
    checkProgramVideoHealth = operations.checkProgramVideoHealth;
    closeProgramSubscriber = operations.closeProgramSubscriber;
    waitForVideoFrame = operations.waitForVideoFrame;
    watchProgramStream = operations.watchProgramStream;
    closeMcuSubscriber = operations.closeMcuSubscriber;
    watchClientStream = operations.watchClientStream;
    reconcileSelectedStream = operations.reconcileSelectedStream;
    pollSignaling = operations.pollSignaling;
    closeViewerStream = operations.closeViewerStream;
    pruneUnusedViewerPeers = operations.pruneUnusedViewerPeers;
    ensureAudioContext = operations.ensureAudioContext;
    updateAudioUnlock = operations.updateAudioUnlock;
    mobileAudioEndpoint = operations.mobileAudioEndpoint;
    updateHeadphoneWarning = operations.updateHeadphoneWarning;
    attachAudioMixInput = operations.attachAudioMixInput;
    detachAudioMixInput = operations.detachAudioMixInput;
    syncConferenceAudio = operations.syncConferenceAudio;
    reconcileServerAudioMix = operations.reconcileServerAudioMix;
    watchServerAudioMix = operations.watchServerAudioMix;
    closeServerAudioSubscriber = operations.closeServerAudioSubscriber;
    closeAllPeers = operations.closeAllPeers;
    bindChatChannel = operations.bindChatChannel;
    newChatPeer = operations.newChatPeer;
    startChatOffer = operations.startChatOffer;
    openChat = operations.openChat;
    pollChatSignaling = operations.pollChatSignaling;
    sendChatMessage = operations.sendChatMessage;
    closeAllChats = operations.closeAllChats;
    checkReadiness = operations.checkReadiness;
    checkDevice = operations.checkDevice;
    deviceCommand = operations.deviceCommand;
    publishRoom = operations.publishRoom;
    callParticipant = operations.callParticipant;
    startAes67 = operations.startAes67;
    stopAes67 = operations.stopAes67;
    createServiceRequest = operations.createServiceRequest;
    serviceStatus = operations.serviceStatus;
    assignSeat = operations.assignSeat;
    assignPresenterWorkplace = operations.assignPresenterWorkplace;
    releaseSeat = operations.releaseSeat;
    claimSeat = operations.claimSeat;
    createVote = operations.createVote;
    castVote = operations.castVote;
    castAdvancedVote = operations.castAdvancedVote;
    createNextVoteRound = operations.createNextVoteRound;
    uploadDocument = operations.uploadDocument;
    importArchivedDocument = operations.importArchivedDocument;
    uploadAgendaDocument = operations.uploadAgendaDocument;
    openDocument = operations.openDocument;
    startPresentationBroadcast = operations.startPresentationBroadcast;
    shareScreen = operations.shareScreen;
    stopScreenShare = operations.stopScreenShare;
    installPwa = operations.installPwa;
    toggleFullscreen = operations.toggleFullscreen;
  });
  return featureModulesPromise;
}

export {
  $, $$, sleep, SESSION_KEY, HANDOFF_KEY, AUTH_TOKEN_KEY, CAMERA_AUTO_KEY, MICROPHONE_AUTO_KEY,
  MEDIA_DEVICE_KEY, TRANSLATION_VOLUME_KEY, CLIENT_BUILD, interfaceLocale, uiText, BUILD_RELOAD_KEY, TECHNICAL_CONFERENCE_ROLES, CONFERENCE_ROLE_LABELS,
  TAB_TITLES, SECRETARY_LAYOUT_DEFAULT, TAB_ID_KEY, THUMBNAIL_FPS, RESOURCE_CONSTRAINED_CLIENT, THUMBNAIL_DECODE_BUDGET, PRESENCE_ID, TAB_ID,
  state, EdgeHttpError, EdgeApi, escapeHtml, formatBytes, saveProfile, loadMediaDevicePreferences, saveMediaDevicePreferences,
  refreshMediaDevices, deviceConstraint, mediaDeviceOptions, applyAudioOutputSelection, changeMediaDevice, saveActiveSession, clearActiveSession, enterApplication,
  voteStorageKey, loadVoteSelections, saveVoteSelections, connectError, notify, httpForm, voteElectorateCandidates, voteCreationForm,
  formatAgendaTime, agendaTimeline, agendaStatusHtml, openAgendaDialog, confirmDialog, roomSeatScheme, offerRoomStation, maybeOfferRoomStation,
  connectWithProfile, consumeConferenceHandoff, autoPublishOwnCamera, queryCapturePermission, installLocalVideoTrack, isAppleMobile, scheduleVideoRecovery, recoverSuspendedVideo,
  enableLocalAv, toggleParticipantVideo, toggleLocalMediaPreference, hasLocalVideo, restoreActiveSession, startTimers, clearTimers, schedulePushRefresh,
  refreshFloorState, updateSourceWallFloorState, applyAudioMeters, setEventConnectionStatus, startEventStream, refreshProgram, refreshAll, updateBuildLabels,
  selectTab, activateStreamsPreview, syncSourceWall, budgetedThumbnailStreams, disconnect, exitClosedConference, handleMicrophoneAction, bootstrapClient,
  renderPage, updateNavigationVisibility, translationHtml, unreadChatCount, updateChatNotice, markChatRead, pageHead, VOTE_OUTCOME_LABELS,
  advancedBallot, voteOutcomeLabel, conferenceVoteCard, conferenceVoteStatusCard, closeVoteResultsModal, openVoteResultsModal, microphoneIcon, renderMicrophoneDock,
  renderFixedControls, can, pgmModeHtml, hydrateSlatePreviews, uploadPgmSlate, selectPgmSlate, deletePgmSlate, syncSecretaryTurn,
  secretarySpeakersHtml, secretaryWorkspaceHtml, saveSecretaryTranscript, saveSecretaryEditor, clearSecretaryEditor, secretaryLayoutPanel, moveSecretaryLayoutPanel, handleSecretaryLayoutAction,
  secretaryLayoutGesture, startSecretaryLayoutGesture, moveSecretaryLayoutGesture, finishSecretaryLayoutGesture, conferenceHtml, audioConferenceHtml, canOperateMedia, streamLabel,
  actionIcon, streamStatusHtml, participantsAndSourcesHtml, streamsHtml, localAvDevicesHtml, absoluteMediaUrl, resumeVideoElement, programCaption,
  normalizedCaption, setMediaCaptions, mountMediaView, mountStudioMonitors, stopThumbnailLoop, drawThumbnails, mountStreamThumbnails, handleStreamPreviewKeydown,
  closeStreamPreviewModal, openStreamPreviewModal, mountStreamPreviewModal, mountProgram, canManageVotes, canCastVotes, isEligibleForVote, canViewFiles,
  canUploadFiles, canShareScreen, canSpeak, votingHtml, canManageContent, contentHtml, partnerFor, chatPartnerId,
  isLiveChatSession, closeChatSessionLocally, reconcileChatSessions, chatHtml, requestItemsText, operationsHtml, settingsHtml, inMcu,
  runAction, requestFloor, applyLocalFloorResult, runMicrophoneAction, activateChairMicrophone, grantFloor, releaseFloor, selfRelease,
  saveMicrophoneLimit, toggleFifo, saveDiscussionMode, toggleChairPriority, muteAllMicrophones, activateAgenda, revealAccessPin, editAccessPin,
  changeParticipantRole, toggleIncomingAudio, removeParticipant, confirmRemoveParticipant, ensureMicrophone, syncLocalMicrophone, startCamera, stopCamera,
  startPublishing, ensurePublishedMedia, registerSystemCamera, editStream, deleteStream, deleteCamera, refreshMediaRuntime, discoverOnvifCameras,
  addOnvifCamera, quickProbeCamera, probeCamera, attachCamera, startMediaWorker, startMulticast, routePreview, takeProgram,
  resumeAutoDirector, discoverNdiSources, attachNdiSource, saveNdiCamera, toggleCameraAutoAttach, receiveNdiSource, receiveNdiStream, toggleNdiOutput,
  configureNdiOutput, startNdiOutput, stopNdiJob, toggleAutoDirector, savePgmMode, resetPgmMode, selectStream, ensureStreamPreview,
  mediaForStream, getMcuDevice, createMcuTransport, publishMediaToMcu, closeMcuTransport, closeMcuPublisher, subscribeMcuStream, closeProgramSubscriberEntry,
  RECEIVE_DISCONNECTED_GRACE_MS, observeReceiveTransport, subscriptionHealthy, inboundProgramVideoCounters, checkProgramVideoHealth, closeProgramSubscriber, waitForVideoFrame, watchProgramStream,
  closeMcuSubscriber, watchClientStream, reconcileSelectedStream, pollSignaling, closeViewerStream, pruneUnusedViewerPeers, ensureAudioContext, updateAudioUnlock,
  mobileAudioEndpoint, updateHeadphoneWarning, attachAudioMixInput, detachAudioMixInput, syncConferenceAudio, reconcileServerAudioMix, watchServerAudioMix, closeServerAudioSubscriber,
  closeAllPeers, bindChatChannel, newChatPeer, startChatOffer, openChat, pollChatSignaling, sendChatMessage, closeAllChats,
  checkReadiness, checkDevice, deviceCommand, publishRoom, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote, castAdvancedVote,
  createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument, openDocument, startPresentationBroadcast, shareScreen, stopScreenShare,
  installPwa, toggleFullscreen, encodeIdentityHeader, observeBottomControls, serviceRequestCategoryLabel, serviceRequestStatusLabel, serviceRequestCategoryOptions, eventRetryDelay,
  PARTICIPANT_LANGUAGES, participantLanguageOptions, participantLanguage, setParticipantLanguage, participantText, participantFormatTime, openDocumentViewer, closeDocumentViewer, updateDocumentViewerRights, updateDocumentViewerBadge,
  documentSceneEvent, minimizeDocumentViewer
};

observeBottomControls();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SESSION_KEY = "edge-s-active-session-v0.6";
const HANDOFF_KEY = "edge-conference-handoff-v1";
const AUTH_TOKEN_KEY = "edge-s-account-token";
const CAMERA_AUTO_KEY = "edge-s-auto-camera";
const MICROPHONE_AUTO_KEY = "edge-s-auto-microphone";
const MEDIA_DEVICE_KEY = "edge-s-media-devices-v0.5";
const TRANSLATION_VOLUME_KEY = "edge-s-translation-volume";
const CLIENT_BUILD = "0.7.0.63";
const interfaceLocale = () => participantLanguage(state.profile?.userId);
const uiText = (key) => participantText(key, interfaceLocale());
const BUILD_RELOAD_KEY = "edge-s-client-build-reload";
const TECHNICAL_CONFERENCE_ROLES = new Set(["admin", "operator", "secretary", "av_operator", "technician", "service"]);
const CONFERENCE_ROLE_LABELS = {
  admin: "Администратор", operator: "Оператор", av_operator: "Оператор A/V",
  secretary: "Секретарь", technician: "Техник", service: "Сервис",
  chair: "Председатель", delegate: "Делегат", presenter: "Приглашённый докладчик", participant: "Участник",
  observer: "Наблюдатель", auditor: "Наблюдатель", interpreter: "Переводчик",
  translator: "Переводчик", signage: "Дисплей"
};
const TAB_TITLES = { conference: "Конференция", streams: "Камеры и потоки", voting: "Голосование", content: "Материалы", translation: "Синхроперевод", chat: "Чат", operations: "Сервис", settings: "Настройки" };
const SECRETARY_LAYOUT_DEFAULT = Object.freeze({
  order: ["program", "channels", "queue", "speakers", "protocol"],
  panels: { program: { width: 7, height: 350 }, channels: { width: 5, height: 220 },
    queue: { width: 4, height: 200 }, speakers: { width: 4, height: 260 },
    protocol: { width: 4, height: 330 } }
});
const TAB_ID_KEY = "edge-s-tab-id";
// One shared draw timer serves every "Камеры и потоки" thumbnail (not one
// timer per row): each still-subscribed WebRTC track keeps decoding at its
// native rate regardless, but the browser only has to composite/paint each
// tile 6-12 times a second instead of continuously, which is what makes a
// grid of many simultaneous tiles affordable to keep on screen.
const THUMBNAIL_FPS = 8;
const RESOURCE_CONSTRAINED_CLIENT = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const THUMBNAIL_DECODE_BUDGET = RESOURCE_CONSTRAINED_CLIENT ? 2 : 6;
// Unique per loaded document: an old pagehide cannot disconnect its replacement.
const PRESENCE_ID = crypto.randomUUID();
// edge-s-active-session-v0.6 lives in localStorage (shared by every tab of
// this origin) so a reload or a reopened tab can restore the same
// participant. TAB_ID lives in sessionStorage (unique per tab, never shared
// with a freshly opened one) purely to tell "this exact tab is switching
// identity" apart from "a different, still-open tab owns that session" -
// see consumeConferenceHandoff().
const TAB_ID = (() => {
  let id;
  try { id = sessionStorage.getItem(TAB_ID_KEY); } catch (_) { id = null; }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    try { sessionStorage.setItem(TAB_ID_KEY, id); } catch (_) { /* private mode: fall back to a per-load id */ }
  }
  return id;
})();

const state = {
  api: null,
  profile: null,
  leaseId: null,
  participantId: null,
  meeting: null,
  accessPin: null,
  systemStatus: null,
  roomSeatPromptOpen: false,
  roomSeatDismissed: false,
  streams: [],
  cameras: [],
  mediaRuntime: null,
  routing: null,
  capabilities: new Set(),
  programDescriptor: null,
  programMedia: null,
  programSubscriber: null,
  programPending: null,
  programDesiredKey: null,
  programHealthTimer: null,
  mediaGeneration: 0,
  forceVideoProducerRestart: false,
  videoRecoveryTimer: null,
  ndiSources: [],
  ndiJobs: [],
  mediaWorkers: [],
  multicastJobs: [],
  onvifDiscoveries: [],
  votes: [],
  documents: [],
  presentations: [],
  protocol: null,
  recordingStatus: null,
  secretaryMode: "transcript",
  secretarySegmentId: null,
  secretaryEditor: { turnId: null, speakerIds: [], segmentIds: [], startedAt: null, value: "", base: "",
    revision: 0, dirty: false, cleared: false },
  secretaryNoteDraft: "",
  secretaryLayout: structuredClone(SECRETARY_LAYOUT_DEFAULT),
  secretaryLayoutDraft: null,
  secretaryLayoutLoaded: false,
  secretarySaveTimer: null,
  translateStatus: null,
  translateMeeting: null,
  translationVolume: Math.max(0, Math.min(1, Number(localStorage.getItem(TRANSLATION_VOLUME_KEY) ?? 1))),
  devices: [],
  readiness: null,
  signagePlayers: [],
  aes67: null,
  serviceRequests: [],
  sharedSeats: [],
  claimedSeat: null,
  chatSessions: [],
  activeChatId: null,
  chatPeers: new Map(),
  chatChannels: new Map(),
  chatSignalSequence: new Map(),
  chatPendingIce: new Map(),
  chatMessages: new Map(),
  chatDrafts: new Map(),
  chatUnread: new Map(),
  activeTab: "conference",
  localMedia: null,
  publishedStream: null,
  contentMedia: null,
  contentPublishedStream: null,
  selectedStream: null,
  remoteMedia: null,
  mcuPublishers: new Map(),
  mcuSubscribers: new Map(),
  viewerPromises: new Map(),
  viewerPromiseOptions: new Map(),
  viewerRetryAt: new Map(),
  peerMediaByStream: new Map(),
  audioContext: null,
  audioMixInputs: new Map(),
  audioMeters: new Map(),
  serverAudioSubscriber: null,
  serverAudioMedia: null,
  serverAudioElement: null,
  serverAudioSync: null,
  audioUnlockRequired: false,
  headphonesReady: sessionStorage.getItem("edge-s-headphones-ready") === "1",
  voteSelections: new Map(),
  refreshTimer: null,
  eventAbort: null,
  eventReconnectTimer: null,
  eventReconnectAttempts: 0,
  eventRefreshTimer: null,
  heartbeatTimer: null,
  signalTimer: null,
  signalFailures: 0,
  refreshing: false,
  signaling: false,
  mediaViews: new Map(),
  programStageNode: null,
  studioPreviewStageNode: null,
  studioProgramStageNode: null,
  streamsWarmUntil: 0,
  thumbnailSinks: new Map(),
  thumbnailTimer: null,
  previewModalStreamId: null,
  thumbnailBudgetIds: [],
  selectedSourceIdentity: null,
  watchingStreamId: null,
  installPrompt: null,
  mediaDevices: { videoInputs: [], audioInputs: [], audioOutputs: [] },
  selectedVideoInputId: "",
  selectedAudioInputId: "",
  selectedAudioOutputId: "",
  mediaPermissionPending: false,
  pgmSlates: { selectedSlateId: null, items: [] },
  slatePreviewUrls: new Map(),
  lastOpenVoteId: null,
  lastRenderKey: null
};

class EdgeHttpError extends Error {
  constructor(status, message, code = null, details = undefined, serverMessage = null) {
    super(message);
    this.name = "EdgeHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.serverMessage = serverMessage;
  }
}

class EdgeApi {
  constructor(profile) {
    this.profile = profile;
    this.authToken = profile.authToken || sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
    if (!this.authToken) {
      try {
        this.authToken = JSON.parse(localStorage.getItem("edge-s-conference-identities-v1") || "{}")
          [`${profile.meetingId}:${profile.displayName}`] || "";
      } catch (_) {}
    }
    if (profile.authToken) sessionStorage.setItem(AUTH_TOKEN_KEY, profile.authToken);
    this.base = `${profile.serverUrl.replace(/\/+$/, "")}/api/v1`;
  }

  headers(extra = {}) {
    return {
      "X-Edge-User-Id": encodeIdentityHeader(this.profile.userId),
      "X-Edge-Display-Name": encodeIdentityHeader(this.profile.displayName),
      "X-Edge-Role": this.profile.role,
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...extra
    };
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.base}${path}`, {
      ...options,
      headers: this.headers(options.headers)
    });
    if (response.ok) {
      if (response.status === 204) return null;
      const type = response.headers.get("content-type") || "";
      return type.includes("json") ? response.json() : response;
    }
    let message = `HTTP ${response.status}`;
    let code = null;
    let details;
    try {
      const payload = await response.json();
      message = payload.message || message;
      code = payload.error || null;
      details = payload.details;
    } catch (_) {}
    throw new EdgeHttpError(response.status,
      VoxNoticeLocale.error(code, message, response.status, interfaceLocale()), code, details, message);
  }

  get(path) { return this.request(path); }
  post(path, body = {}) {
    return this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  patch(path, body = {}) {
    return this.request(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  put(path, body = {}) {
    return this.request(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  delete(path) { return this.request(path, { method: "DELETE" }); }

  documentUrl(id) {
    const url = new URL(`${this.base}/documents/${encodeURIComponent(id)}/content`);
    url.searchParams.set("userId", this.profile.userId);
    url.searchParams.set("displayName", this.profile.displayName);
    url.searchParams.set("role", this.profile.role);
    return url.toString();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function saveProfile(profile) {
  const { authToken, ...safeProfile } = profile;
  localStorage.setItem("edge-s-profile", JSON.stringify({
    ...safeProfile,
    meetingId: profile.meetingId,
    entitlementId: profile.entitlementId
  }));
}

function loadMediaDevicePreferences() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(MEDIA_DEVICE_KEY) || "{}"); } catch (_) {}
  state.selectedVideoInputId = saved.videoInputId || "";
  state.selectedAudioInputId = saved.audioInputId || "";
  state.selectedAudioOutputId = saved.audioOutputId || "";
}

function saveMediaDevicePreferences() {
  localStorage.setItem(MEDIA_DEVICE_KEY, JSON.stringify({
    videoInputId: state.selectedVideoInputId,
    audioInputId: state.selectedAudioInputId,
    audioOutputId: state.selectedAudioOutputId
  }));
}

async function refreshMediaDevices(requestPermissions = false) {
  if (!navigator.mediaDevices?.enumerateDevices) return state.mediaDevices;
  if (requestPermissions) {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    probe.getTracks().forEach((track) => track.stop());
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  state.mediaDevices = {
    videoInputs: devices.filter((device) => device.kind === "videoinput"),
    audioInputs: devices.filter((device) => device.kind === "audioinput"),
    audioOutputs: devices.filter((device) => device.kind === "audiooutput")
  };
  const has = (items, id) => !id || items.some((item) => item.deviceId === id);
  if (!has(state.mediaDevices.videoInputs, state.selectedVideoInputId)) state.selectedVideoInputId = "";
  if (!has(state.mediaDevices.audioInputs, state.selectedAudioInputId)) state.selectedAudioInputId = "";
  if (!has(state.mediaDevices.audioOutputs, state.selectedAudioOutputId)) state.selectedAudioOutputId = "";
  saveMediaDevicePreferences();
  return state.mediaDevices;
}

function deviceConstraint(deviceId) {
  return deviceId ? { deviceId: { exact: deviceId } } : {};
}

function mediaDeviceOptions(devices, selectedId, fallbackLabel) {
  return `<option value="">${escapeHtml(fallbackLabel)}</option>${devices.map((device, index) => {
    const label = device.label || `${fallbackLabel} ${index + 1}`;
    return `<option value="${escapeHtml(device.deviceId)}" ${device.deviceId === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("")}`;
}

async function applyAudioOutputSelection() {
  const sinkId = state.selectedAudioOutputId || "default";
  if (state.audioContext?.setSinkId) await state.audioContext.setSinkId(sinkId).catch(() => {});
  if (state.serverAudioElement?.setSinkId) await state.serverAudioElement.setSinkId(sinkId).catch(() => {});
  for (const video of $$(`#pageContent video`)) {
    if (typeof video.setSinkId === "function") await video.setSinkId(sinkId).catch(() => {});
  }
}

async function changeMediaDevice(kind, deviceId) {
  const wasPublished = Boolean(state.publishedStream);
  if (kind === "videoinput") {
    state.selectedVideoInputId = deviceId;
    for (const track of state.localMedia?.getVideoTracks() ?? []) {
      track.onended = null;
      track.stop();
      state.localMedia.removeTrack(track);
    }
    await startCamera();
  }
  if (kind === "audioinput") {
    state.selectedAudioInputId = deviceId;
    for (const track of state.localMedia?.getAudioTracks() ?? []) {
      track.onended = null;
      track.stop();
      state.localMedia.removeTrack(track);
    }
    await ensureMicrophone();
  }
  if (kind === "audiooutput") {
    state.selectedAudioOutputId = deviceId;
    await applyAudioOutputSelection();
  }
  saveMediaDevicePreferences();
  await refreshMediaDevices();
  if (wasPublished && kind !== "audiooutput") {
    // Reconcile only the changed producer on the existing send transport.
    // Device selection must not tear down the unrelated camera/microphone.
    const republished = await ensurePublishedMedia();
    state.selectedStream = republished;
    state.selectedSourceIdentity = {
      ownerParticipantId: republished.ownerParticipantId,
      sourceType: republished.sourceType,
      label: republished.label
    };
  }
  renderPage();
}

function saveActiveSession() {
  if (!state.profile || !state.leaseId || !state.participantId) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    profile: { ...state.profile, authToken: undefined },
    leaseId: state.leaseId,
    participantId: state.participantId,
    tabId: TAB_ID,
    savedAt: new Date().toISOString()
  }));
}

function clearActiveSession() {
  localStorage.removeItem(SESSION_KEY);
}

function enterApplication({ api, profile, leaseId, participantId }) {
  Object.assign(state, { api, profile, leaseId, participantId, roomSeatPromptOpen: false, roomSeatDismissed: false });
  state.activeTab = /^(interpreter|translator)$/.test(profile.role) ? "translation" : "conference";
  applyParticipantLanguage(profile.userId);
  saveProfile(profile);
  saveActiveSession();
  $("#connectView").hidden = true;
  $("#appView").hidden = false;
  $("#participantName").textContent = profile.displayName;
  $("#participantRole").textContent = CONFERENCE_ROLE_LABELS[profile.role] ?? profile.role;
  $("#appView").dataset.role = profile.role;
  loadVoteSelections();
  refreshMediaDevices().catch(() => {});
  startTimers();
}

function voteStorageKey() {
  return state.profile && state.participantId
    ? `edge-s-votes:${state.profile.meetingId}:${state.participantId}`
    : null;
}

function loadVoteSelections() {
  const key = voteStorageKey();
  if (!key) return;
  try { state.voteSelections = new Map(Object.entries(JSON.parse(localStorage.getItem(key) || "{}"))); }
  catch (_) { state.voteSelections = new Map(); }
}

function saveVoteSelections() {
  const key = voteStorageKey();
  if (key) localStorage.setItem(key, JSON.stringify(Object.fromEntries(state.voteSelections)));
}

function connectError(message = null) {
  const box = $("#connectError");
  box.hidden = !message;
  box.textContent = VoxNoticeLocale.localize(message || "", interfaceLocale());
}

function notify(message, timeout = 5000) {
  const notice = $("#notice");
  const locale = interfaceLocale();
  notice.innerHTML = `<span>${escapeHtml(VoxNoticeLocale.localize(message, locale))}</span><button type="button" aria-label="${locale === "en" ? "Dismiss notification" : "Закрыть уведомление"}" title="${locale === "en" ? "Close" : "Закрыть"}">×</button>`;
  notice.hidden = false;
  notice.classList.remove("notice-visible");
  requestAnimationFrame(() => notice.classList.add("notice-visible"));
  clearTimeout(notice._timer);
  notice.querySelector("button").onclick = () => {
    clearTimeout(notice._timer);
    notice.classList.remove("notice-visible");
    setTimeout(() => { notice.hidden = true; }, 180);
  };
  notice._timer = setTimeout(() => notice.querySelector("button")?.click(), timeout);
}

function httpForm(title, fields, submitLabel = "Сохранить") {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div"); backdrop.className = "form-dialog-backdrop";
    const form = document.createElement("form"); form.className = "form-dialog";
    const controls = fields.map((field) => `<label data-field="${escapeHtml(field.name)}" ${field.visibleWhen ? `data-visible-rules="${escapeHtml(JSON.stringify(Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen]))}" hidden` : ""}><span>${escapeHtml(field.label)}</span>${field.type === "select"
      ? `<select name="${escapeHtml(field.name)}">${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`
      : field.type === "textarea" ? `<textarea name="${escapeHtml(field.name)}" rows="4">${escapeHtml(field.value ?? "")}</textarea>`
      : field.type === "checkbox" ? `<input name="${escapeHtml(field.name)}" type="checkbox" ${field.value ? "checked" : ""}>`
      : `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type ?? "text")}" value="${escapeHtml(field.value ?? "")}" ${field.min ? `min="${escapeHtml(field.min)}"` : ""} ${field.maxLength ? `maxlength="${Number(field.maxLength)}"` : ""} ${field.required === false ? "" : "required"}>`}</label>`).join("");
    form.innerHTML = `<button type="button" class="dialog-icon-close" data-dialog-close data-cancel aria-label="Закрыть">×</button><h3>${escapeHtml(title)}</h3>${controls}<div class="actions"><button type="button" data-cancel>Отмена</button><button type="submit">${escapeHtml(submitLabel)}</button></div>`;
    backdrop.append(form); document.body.append(backdrop); form.querySelector("input:not([type=hidden]),select,textarea")?.focus();
    const updateVisibility = () => {
      form.querySelectorAll("[data-visible-rules]").forEach((label) => {
        const visible = JSON.parse(label.dataset.visibleRules).every((rule) => {
          const control = form.elements[rule.name];
          return rule.values.includes(control?.type === "checkbox" ? (control.checked ? "on" : "") : control?.value);
        });
        label.hidden = !visible;
        const control = label.querySelector("input,select,textarea");
        if (control) control.disabled = !visible;
      });
    };
    form.addEventListener("change", updateVisibility); updateVisibility();
    const done = (value) => { backdrop.remove(); resolve(value); };
    form.querySelectorAll("[data-cancel]").forEach((button) => { button.onclick = () => done(null); });
    form.onsubmit = (event) => { event.preventDefault(); done(Object.fromEntries(new FormData(form))); };
  });
}

function voteElectorateCandidates() {
  const deniedRoles = new Set(["observer", "auditor", "interpreter", "translator", "service", "signage"]);
  const source = state.meeting.quick
    ? Object.values(state.meeting.participants ?? {}).filter((item) => item.state === "joined")
    : (state.meeting.preparedParticipants?.length
      ? state.meeting.preparedParticipants
      : Object.values(state.meeting.participants ?? {}).filter((item) => item.state === "joined"));
  const unique = new Map();
  for (const item of source) {
    if (!item?.id || item.permissions?.canVote === false || deniedRoles.has(item.role)) continue;
    unique.set(item.id, {
      id: item.id,
      displayName: item.displayName || item.id,
      role: item.role || "delegate",
      weight: item.voteWeight != null && Number.isFinite(Number(item.voteWeight)) && Number(item.voteWeight) >= 0 ? Number(item.voteWeight) : 1,
      group: item.voteGroup || item.jurisdiction || "ungrouped",
      online: state.meeting.quick || Object.values(state.meeting.participants ?? {}).some((live) =>
        live.state === "joined" && (live.preparedParticipantId === item.id || live.userId === item.accountId || live.displayName === item.displayName))
    });
  }
  return [...unique.values()];
}

function voteCreationForm(title, fields, candidates, pro, governance = {}, submitLabel = "Создать проект") {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div"); backdrop.className = "form-dialog-backdrop";
    const form = document.createElement("form"); form.className = "form-dialog vote-creation-dialog";
    const controls = fields.map((field) => `<label data-field="${escapeHtml(field.name)}" ${field.visibleWhen ? `data-visible-source="${escapeHtml(field.visibleWhen.name)}" data-visible-values="${escapeHtml(field.visibleWhen.values.join(","))}" hidden` : ""}><span>${escapeHtml(field.label)}</span>${field.type === "select"
      ? `<select name="${escapeHtml(field.name)}">${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`
      : field.type === "textarea" ? `<textarea name="${escapeHtml(field.name)}" rows="4">${escapeHtml(field.value ?? "")}</textarea>`
      : `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type ?? "text")}" value="${escapeHtml(field.value ?? "")}" ${field.required === false ? "" : "required"}>`}</label>`).join("");
    const groups = [...new Set(["ungrouped", ...candidates.map((item) => item.group), "group-1", "group-2", "group-3"])]
      .map((value) => ({ value, label: value === "ungrouped" ? "Без группы" : value.replace(/^group-/, "Группа ") }));
    const weightUnit = String(governance?.unitLabel ?? "голосов").trim() || "голосов";
    const governanceTotal = Number(governance?.totalWeight);
    const weightBasis = governanceTotal > 0
      ? `${governanceTotal.toLocaleString("ru-RU")} ${weightUnit}`
      : `не задана · единица: ${weightUnit}`;
    const rows = candidates.map((item) => `<div class="vote-elector-row" data-voter-id="${escapeHtml(item.id)}">
      <label class="vote-elector-person"><input type="checkbox" data-voter-enabled checked><span><strong>${escapeHtml(item.displayName)}</strong><small>${escapeHtml(item.role)} · ${item.online ? "в сети" : "запланирован"}</small></span></label>
      <label class="vote-elector-weight"><span>Вес, ${escapeHtml(weightUnit)}</span><input type="number" data-voter-weight min="0" step="0.01" value="${escapeHtml(item.weight)}" ${pro ? "" : "disabled"}><small>База расчёта: ${escapeHtml(weightBasis)}</small></label>
      <label><span>Группа</span><select data-voter-group ${pro ? "" : "disabled"}>${groups.map((group) => `<option value="${escapeHtml(group.value)}" ${group.value === item.group ? "selected" : ""}>${escapeHtml(group.label)}</option>`).join("")}</select></label>
    </div>`).join("");
    form.innerHTML = `<button type="button" class="dialog-icon-close" data-dialog-close data-cancel aria-label="Закрыть">×</button><h3>${escapeHtml(title)}</h3>${controls}<fieldset class="vote-electorate"><legend>Избиратели</legend><div class="vote-elector-toolbar"><span>${state.meeting.quick ? "Текущие участники быстрой конференции" : "Все запланированные участники"}</span><div><button type="button" data-select-voters>Выбрать всех</button><button type="button" data-clear-voters>Снять все</button></div></div>${pro ? "" : '<p class="form-hint">Вес и группы доступны в VoteCore Pro.</p>'}<div class="vote-elector-list">${rows || '<div class="empty">Участников с правом голосования нет.</div>'}</div></fieldset><div class="actions"><button type="button" data-cancel>Отмена</button><button type="submit">${escapeHtml(submitLabel)}</button></div>`;
    backdrop.append(form); document.body.append(backdrop); form.querySelector("input:not([type=hidden]),select,textarea")?.focus();
    const updateVisibility = () => {
      form.querySelectorAll("[data-visible-source]").forEach((label) => {
        const selected = form.elements[label.dataset.visibleSource]?.value;
        const visible = label.dataset.visibleValues.split(",").includes(selected);
        label.hidden = !visible;
        const control = label.querySelector("input,select,textarea");
        if (control) control.disabled = !visible;
      });
      form.querySelectorAll(".vote-elector-weight").forEach((label) => {
        label.hidden = !pro || form.elements.weightMode?.value !== "weighted";
      });
    };
    form.addEventListener("change", updateVisibility); updateVisibility();
    form.querySelector("[data-select-voters]").onclick = () => form.querySelectorAll("[data-voter-enabled]").forEach((item) => { item.checked = true; });
    form.querySelector("[data-clear-voters]").onclick = () => form.querySelectorAll("[data-voter-enabled]").forEach((item) => { item.checked = false; });
    const done = (value) => { backdrop.remove(); resolve(value); };
    form.querySelector("[data-cancel]").onclick = () => done(null);
    form.onsubmit = (event) => {
      event.preventDefault();
      const electorate = [...form.querySelectorAll(".vote-elector-row")].filter((row) => row.querySelector("[data-voter-enabled]").checked).map((row) => ({
        id: row.dataset.voterId,
        weight: Number(row.querySelector("[data-voter-weight]").value === "" ? 1 : row.querySelector("[data-voter-weight]").value),
        group: row.querySelector("[data-voter-group]").value || "ungrouped"
      }));
      if (!electorate.length) { notify("Выберите хотя бы одного избирателя", 5000); return; }
      done({ ...Object.fromEntries(new FormData(form)), electorate });
    };
  });
}

function formatAgendaTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return participantFormatTime(date, interfaceLocale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function agendaTimeline() {
  const events = (state.meeting?.timeline ?? [])
    .filter((event) => event.type === "agenda.activated" && event.agendaItemId && event.at)
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  return (state.meeting?.agenda ?? []).map((item, index) => {
    const starts = events.filter((event) => event.agendaItemId === item.id);
    const started = starts.length ? starts[starts.length - 1] : null;
    const ended = started && item.id !== state.meeting.activeAgendaItemId
      ? events.find((event) => Date.parse(event.at) > Date.parse(started.at)) ?? null
      : null;
    const phase = item.id === state.meeting.activeAgendaItemId ? "current"
      : item.status === "completed" ? "past" : "upcoming";
    return { item, index, phase, startedAt: started?.at ?? null, endedAt: ended?.at ?? null };
  });
}

function agendaStatusHtml(record) {
  if (record.phase === "current") return `<span class="agenda-status agenda-status-current">Обсуждается сейчас · с ${formatAgendaTime(record.startedAt)}</span>`;
  if (record.phase === "past") return `<span class="agenda-status agenda-status-past">Завершён · ${formatAgendaTime(record.startedAt)}–${formatAgendaTime(record.endedAt)}</span>`;
  return `<span class="agenda-status agenda-status-upcoming">Предстоящий</span>`;
}

function openAgendaDialog({ editable = false } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "form-dialog-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "form-dialog agenda-dialog";
  backdrop.append(dialog);
  document.body.append(backdrop);

  const close = () => backdrop.remove();
  const personalDocuments = () => state.documents.filter((item) => !item.agendaItemId && item.uploadedBy === state.profile.userId);
  const editorRow = (record, nextIndex = 0) => `<div class="agenda-editor-row" data-agenda-id="${escapeHtml(record?.item?.id ?? "")}">
    <span class="agenda-order">${(record?.index ?? nextIndex) + 1}</span>
    <div class="agenda-editor-main"><textarea class="agenda-title-input" rows="3" maxlength="1000" aria-label="Название вопроса повестки" required>${escapeHtml(record?.item?.title ?? "")}</textarea>${record ? agendaStatusHtml(record) : `<span class="agenda-status agenda-status-upcoming">Новый вопрос</span>`}<label>Добавить из личных документов<select class="agenda-personal-document"><option value="">Не добавлять</option>${personalDocuments().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.fileName)}</option>`).join("")}</select></label></div>
    ${record?.phase === "current" ? `<span class="agenda-current-mark">Сейчас</span>` : `<button type="button" class="button button-secondary" data-agenda-dialog-action="activate">Активировать</button>`}
  </div>`;

  const render = () => {
    const records = agendaTimeline();
    const rows = records.map((record) => editable ? editorRow(record) : `<div class="agenda-view-row agenda-${record.phase}"><span class="agenda-order">${record.index + 1}</span><div><strong>${escapeHtml(record.item.title)}</strong>${agendaStatusHtml(record)}</div></div>`).join("") || `<div class="empty">Повестка пока не сформирована.</div>`;
    dialog.innerHTML = `<div class="agenda-dialog-head"><div><p class="eyebrow">ПОВЕСТКА</p><h3>${editable ? "Управление повесткой" : "Вопросы заседания"}</h3></div><button type="button" class="dialog-icon-close" data-dialog-close data-agenda-dialog-action="close" aria-label="Закрыть">×</button></div>
      <div class="agenda-dialog-list">${rows}</div>
      <div class="actions">${editable ? `<button type="button" class="button button-quiet" data-agenda-dialog-action="add">+ Добавить вопрос</button><button type="button" class="button button-secondary" data-agenda-dialog-action="save">Сохранить</button>` : ""}<button type="button" data-agenda-dialog-action="close">Закрыть</button></div>`;
  };

  const saveRows = async () => {
    const rows = [...dialog.querySelectorAll(".agenda-editor-row")];
    const existing = new Map((state.meeting.agenda ?? []).map((item) => [item.id, item]));
    const agenda = rows.map((row, index) => {
      const title = row.querySelector(".agenda-title-input")?.value.trim();
      if (!title) throw new Error(`Введите название вопроса ${index + 1}`);
      const previous = existing.get(row.dataset.agendaId);
      return { ...(previous?.id ? { id: previous.id } : {}), title, status: previous?.status ?? "planned", voteId: previous?.voteId ?? null };
    });
    state.meeting = await state.api.put(`/meetings/${state.profile.meetingId}/agenda`, { agenda });
    for (const [index, row] of rows.entries()) {
      const documentId = row.querySelector(".agenda-personal-document")?.value;
      if (!documentId) continue;
      const agendaItemId = state.meeting.agenda?.[index]?.id;
      if (!agendaItemId) throw new Error("Не удалось связать документ с вопросом повестки");
      await state.api.post(`/documents/${encodeURIComponent(documentId)}/attach`, { agendaItemId, availableImmediately: true });
    }
    state.documents = await state.api.get(`/meetings/${state.profile.meetingId}/documents`);
    renderPage();
    return state.meeting;
  };

  dialog.addEventListener("click", async (event) => {
    const control = event.target.closest("[data-agenda-dialog-action]");
    if (!control) return;
    const action = control.dataset.agendaDialogAction;
    if (action === "close") { close(); return; }
    if (action === "add") {
      const list = dialog.querySelector(".agenda-dialog-list");
      list.querySelector(".empty")?.remove();
      list.insertAdjacentHTML("beforeend", editorRow(null, list.querySelectorAll(".agenda-editor-row").length));
      list.querySelector(".agenda-editor-row:last-child .agenda-title-input")?.focus();
      return;
    }
    try {
      dialog.classList.add("agenda-dialog-busy");
      if (action === "save") {
        await saveRows();
        notify("Повестка сохранена");
      }
      if (action === "activate") {
        const row = control.closest(".agenda-editor-row");
        const index = [...dialog.querySelectorAll(".agenda-editor-row")].indexOf(row);
        const meeting = await saveRows();
        const agendaItemId = meeting.agenda?.[index]?.id;
        if (!agendaItemId) throw new Error("Не удалось определить вопрос повестки");
        await activateAgenda(agendaItemId);
        renderPage();
        notify("Следующий вопрос повестки активирован");
      }
      render();
    } catch (error) {
      notify(error.message);
    } finally {
      dialog.classList.remove("agenda-dialog-busy");
    }
  });
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  render();
  dialog.querySelector("button")?.focus();
}

function confirmDialog(title, yesLabel = "Да", noLabel = "Нет") {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "form-dialog-backdrop";
    const dialog = document.createElement("div");
    dialog.className = "form-dialog confirm-dialog";
    dialog.innerHTML = `<button type="button" class="dialog-icon-close" data-dialog-close data-confirm-no aria-label="Закрыть">×</button><h3>${escapeHtml(title)}</h3><div class="actions"><button type="button" class="button button-secondary" data-confirm-no>${escapeHtml(noLabel)}</button><button type="button" class="button button-danger" data-confirm-yes>${escapeHtml(yesLabel)}</button></div>`;
    backdrop.append(dialog);
    document.body.append(backdrop);
    const done = (value) => { backdrop.remove(); resolve(value); };
    dialog.querySelectorAll("[data-confirm-no]").forEach((button) => { button.onclick = () => done(false); });
    dialog.querySelector("[data-confirm-yes]").onclick = () => done(true);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) done(false); });
    dialog.querySelector(".actions [data-confirm-no]").focus();
  });
}

async function editLiveRoster() {
  const people = (state.meeting.preparedParticipants ?? []).filter((item) => !item.excludedAt);
  const directory = await state.api.get(`/meetings/${encodeURIComponent(state.profile.meetingId)}/roster-candidates`);
  const available = directory.filter((person) => !people.some((item) => item.regularParticipantId === person.id));
  const candidates = people.filter((item) => item.reports !== true && !(item.reports === undefined && item.role === "presenter"));
  const scheduled = people.filter((item) => (item.reports === true || item.reports === undefined && item.role === "presenter") &&
    !["completed", "called", "confirmed", "active"].includes(item.status));
  const seatOptions = [{ value: "", label: "Без доклада" }, { value: "@own", label: "С собственного места" },
    ...state.sharedSeats.map((seat) => ({ value: seat.id, label: `${seat.name} (${seat.id})` }))];
  const occupiedStationIds = new Set([...people, ...Object.values(state.meeting.participants ?? {})]
    .map((item) => item.roomStationId).filter(Boolean));
  const stationDirectory = await state.api.get("/room-planner/stations");
  const roomStationOptions = [{ value: "", label: "Выбор при входе" },
    ...(stationDirectory.stations ?? []).filter((station) => !occupiedStationIds.has(station.id))
      .map((station) => ({ value: station.id, label: `${station.number}. ${station.name}` }))];
  const rosterAdd = { name: "rosterAction", values: ["add"] };
  const reportAdd = { name: "rosterAction", values: ["report-add"] };
  const reportFields = [rosterAdd, { name: "reports", values: ["on"] }];
  const values = await httpForm("Состав конференции", [
    { name: "rosterAction", label: "Действие с составом конференции и очередью докладов", type: "select", value: "", options: [
      { value: "", label: "Не выбрано" }, { value: "add", label: "Добавить участника" },
      { value: "exclude", label: "Исключить из конференции" },
      { value: "report-add", label: "Добавить участника в очередь" },
      { value: "report-remove", label: "Исключить из очереди докладчиков" }] },
    { name: "excludeParticipantId", label: "Участник", type: "select", value: people[0]?.id ?? "",
      visibleWhen: { name: "rosterAction", values: ["exclude"] },
      options: people.map((item) => ({ value: item.id, label: `${item.displayName} · ${item.role}` })) },
    { name: "reportParticipantId", label: "Участник из состава", type: "select", value: candidates[0]?.id ?? "",
      visibleWhen: reportAdd, options: candidates.map((item) => ({ value: item.id, label: item.displayName })) },
    { name: "scheduledReportOrder", label: "Позиция в очереди", type: "number", value: "1", visibleWhen: reportAdd },
    { name: "scheduledAgendaTitle", label: "Тема доклада", value: "", required: false, visibleWhen: reportAdd },
    { name: "scheduledSeatId", label: "Место докладчика", type: "select", value: "@own", visibleWhen: reportAdd,
      options: seatOptions.filter((seat) => seat.value) },
    { name: "removeReportParticipantId", label: "Докладчик", type: "select", value: scheduled[0]?.id ?? "",
      visibleWhen: { name: "rosterAction", values: ["report-remove"] },
      options: scheduled.map((item) => ({ value: item.id, label: item.displayName })) },
    { name: "source", label: "Источник", type: "select", value: "manual", visibleWhen: rosterAdd, options: [
      { value: "manual", label: "Разовый участник" },
      ...(available.length ? [{ value: "directory", label: "Из справочника постоянных участников" }] : [])] },
    { name: "regularParticipantId", label: "Постоянный участник", type: "select", value: available[0]?.id ?? "",
      visibleWhen: [rosterAdd, { name: "source", values: ["directory"] }],
      options: available.map((person) => ({ value: person.id, label: `${person.displayName} · ${CONFERENCE_ROLE_LABELS[person.role] ?? person.role}` })) },
    { name: "displayName", label: "ФИО", value: "", visibleWhen: [rosterAdd, { name: "source", values: ["manual"] }] },
    { name: "position", label: "Должность", value: "", visibleWhen: [rosterAdd, { name: "source", values: ["manual"] }], required: false },
    { name: "company", label: "Компания", value: "", visibleWhen: [rosterAdd, { name: "source", values: ["manual"] }], required: false },
    { name: "role", label: "Роль", type: "select", value: "delegate", visibleWhen: [rosterAdd, { name: "source", values: ["manual"] }], options: [
      { value: "delegate", label: "Делегат" }, { value: "chair", label: "Председатель" },
      { value: "presenter", label: "Приглашённый докладчик" }, { value: "observer", label: "Наблюдатель" },
      { value: "interpreter", label: "Переводчик" }] },
    { name: "roomStationId", label: "Место в зале", type: "select", value: "", visibleWhen: rosterAdd, options: roomStationOptions },
    { name: "reports", label: "Выступает с докладом", type: "checkbox", value: false, visibleWhen: rosterAdd },
    { name: "newReportOrder", label: "Позиция среди будущих докладов", type: "number", value: "1", visibleWhen: reportFields },
    { name: "newAgendaTitle", label: "Тема доклада", value: "", required: false, visibleWhen: reportFields },
    { name: "presenterSeatId", label: "Место докладчика", type: "select", value: "", visibleWhen: reportFields, options: seatOptions }
  ], "Применить");
  if (!values || !values.rosterAction) return false;
  if (values.rosterAction === "exclude") {
    if (!people.length) throw new Error("В составе нет участников");
    const person = people.find((item) => item.id === values.excludeParticipantId);
    if (!await confirmDialog(`Исключить «${person?.displayName ?? "участника"}» из дальнейшего участия? История сохранится.`, "Исключить", "Отмена")) return false;
    await state.api.delete(`/meetings/${encodeURIComponent(state.profile.meetingId)}/roster/${encodeURIComponent(values.excludeParticipantId)}`);
    return;
  }
  if (values.rosterAction === "report-remove") {
    if (!scheduled.length) throw new Error("В очереди нет докладчиков, ожидающих выступления");
    await state.api.delete(`/meetings/${encodeURIComponent(state.profile.meetingId)}/roster/${encodeURIComponent(values.removeReportParticipantId)}/report`);
    return;
  }
  if (values.rosterAction === "report-add") {
    if (!candidates.length) throw new Error("Все участники уже включены в очередь докладов");
    await state.api.patch(`/meetings/${encodeURIComponent(state.profile.meetingId)}/roster/${encodeURIComponent(values.reportParticipantId)}/report`,
      { reportOrder: Number(values.scheduledReportOrder), presenterSeatId: values.scheduledSeatId,
        agendaTitle: values.scheduledAgendaTitle });
    return;
  }
  if (values.rosterAction !== "add") return false;
  const selectedRegular = available.find((person) => person.id === values.regularParticipantId);
  if (values.source === "directory" && selectedRegular?.role === "presenter" && values.reports !== "on") {
    throw new Error("Для приглашённого докладчика включите «Выступает с докладом» и назначьте место");
  }
  const reports = (values.source === "directory" ? selectedRegular?.role : values.role) === "presenter" || values.reports === "on";
  await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/roster`, {
    regularParticipantId: values.source === "directory" ? selectedRegular?.id : null,
    displayName: values.source === "directory" ? selectedRegular?.displayName : values.displayName,
    position: values.position, company: values.company, role: values.role,
    reports, reportOrder: reports ? Number(values.newReportOrder) : null,
    agendaTitle: reports ? values.newAgendaTitle : null,
    presenterSeatId: reports ? values.presenterSeatId : null, roomStationId: values.roomStationId || null,
    reportSeatMode: values.presenterSeatId === "@own" ? "own" : "shared"
  });
}

async function moveLiveReport(presenterId, direction) {
  const pending = (state.meeting.preparedParticipants ?? []).filter((item) => !item.excludedAt &&
    (item.reports || item.role === "presenter") && item.status !== "completed")
    .sort((a, b) => Number(a.reportOrder) - Number(b.reportOrder));
  const index = pending.findIndex((item) => item.id === presenterId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= pending.length) return;
  [pending[index], pending[target]] = [pending[target], pending[index]];
  await state.api.patch(`/meetings/${encodeURIComponent(state.profile.meetingId)}/report-order`,
    { presenterIds: pending.map((item) => item.id) });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const dialogs = [...document.querySelectorAll(".form-dialog-backdrop")];
  dialogs.at(-1)?.querySelector("[data-dialog-close]")?.click();
});

function roomSeatScheme(selection) {
  const room = selection.room;
  const width = Math.max(1000, Number(room.widthMm) || 1000);
  const height = Math.max(1000, Number(room.heightMm) || 1000);
  const markerRadius = Math.max(90, Math.min(220, Math.min(width, height) * 0.032));
  const fontSize = Math.max(80, markerRadius * 0.9);
  const cameraSize = markerRadius * 0.8;
  const rect = (item, className) => {
    const rectWidth = Math.max(100, Number(item.widthMm) || 100);
    const rectHeight = Math.max(100, Number(item.depthMm ?? item.heightMm) || 100);
    const x = Number(item.xMm) || 0, y = Number(item.yMm) || 0;
    return `<g transform="translate(${x} ${y}) rotate(${Number(item.rotationDeg) || 0})"><rect class="${className}" x="${-rectWidth / 2}" y="${-rectHeight / 2}" width="${rectWidth}" height="${rectHeight}" rx="${Math.min(80, rectWidth / 10, rectHeight / 10)}"/></g>`;
  };
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="aspect-ratio:${width} / ${height}" role="img" aria-label="Схема зала ${escapeHtml(room.name)}">
    <rect class="seat-room" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${Math.min(80, Math.min(width, height) / 20)}"/>
    ${(room.tables ?? []).map((item) => rect(item, "seat-table")).join("")}
    ${(room.obstacles ?? []).map((item) => rect(item, "seat-obstacle")).join("")}
    ${(room.cameras ?? []).map((item) => `<g class="seat-camera" transform="translate(${Number(item.xMm) || 0} ${Number(item.yMm) || 0}) rotate(${Number(item.yawDeg) || 0})"><path d="M${-cameraSize},${-cameraSize * 0.7} h${cameraSize * 1.35} l${cameraSize * 0.8},${cameraSize * 0.7} -${cameraSize * 0.8},${cameraSize * 0.7} h${-cameraSize * 1.35}z"/></g>`).join("")}
    ${selection.stations.map((item) => `<g class="seat-point ${item.available ? "available" : item.occupied ? "occupied" : "no-camera"}" data-seat-id="${escapeHtml(item.id)}" transform="translate(${Number(item.xMm) || 0} ${Number(item.yMm) || 0}) rotate(${Number(item.rotationDeg) || 0})"><circle r="${markerRadius}"/><text style="font-size:${fontSize}px" text-anchor="middle" dominant-baseline="central">${item.number}</text></g>`).join("")}
  </svg>`;
}

async function offerRoomStation({ force = false } = {}) {
  if (state.roomSeatPromptOpen || !state.meeting) return;
  if (state.profile?.remote === true) {
    state.roomSeatDismissed = true;
    return;
  }
  const quickCreatorNeedsSeat = state.meeting.quick === true && state.profile.role === "operator";
  if (TECHNICAL_CONFERENCE_ROLES.has(state.profile.role) && !quickCreatorNeedsSeat && !(force && state.profile.role === "operator")) return;
  if (!force && state.roomSeatDismissed) return;
  const participant = state.meeting.participants?.[state.participantId];
  if (!participant || participant.state !== "joined" || participant.permissions?.canSpeak === false) return;
  if (!force && (participant.roomStationId || participant.presenterSessionId)) return;
  const selection = await state.api.get(`/meetings/${encodeURIComponent(state.profile.meetingId)}/participants/${encodeURIComponent(state.participantId)}/room-seats`);
  if (!force && !selection.needsSelection) return;
  state.roomSeatPromptOpen = true;
  const backdrop = document.createElement("div"); backdrop.className = "form-dialog-backdrop room-seat-backdrop";
  const dialog = document.createElement("div"); dialog.className = "form-dialog room-seat-dialog";
  dialog.innerHTML = `<header class="room-seat-head"><div><h3>${selection.selectedStationId ? "Изменить рабочее место" : "Выберите рабочее место"}</h3><p>Нажмите свободное место на схеме или в списке. Текущее место можно выбрать повторно.</p></div><button type="button" class="dialog-icon-close" data-dialog-close data-seat-later aria-label="Закрыть">×</button></header>
    <div class="room-seat-layout"><div class="room-seat-scheme">${roomSeatScheme(selection)}</div>
    <div class="room-seat-list">${selection.stations.map((item) => `<button type="button" data-seat-id="${escapeHtml(item.id)}" ${item.available ? "" : "disabled"}>${item.number}. ${escapeHtml(item.name)}${item.occupied ? " · занято" : item.hasCamera ? "" : " · нет камеры"}</button>`).join("")}</div></div>
    <div class="actions"><button type="button" data-seat-later>Выбрать позже</button></div>`;
  backdrop.append(dialog); document.body.append(backdrop);
  const close = (dismissed = false) => { state.roomSeatPromptOpen = false; state.roomSeatDismissed = dismissed; backdrop.remove(); };
  const choose = async (stationId) => {
    const button = dialog.querySelector(`[data-seat-id="${CSS.escape(stationId)}"]`); if (button?.disabled) return;
    try {
      await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/participants/${encodeURIComponent(state.participantId)}/room-seats`, { stationId });
      close(); notify("Рабочее место назначено"); await refreshAll();
    } catch (error) { notify(error.message); }
  };
  dialog.addEventListener("click", (event) => { const target = event.target.closest("[data-seat-id]"); if (target) choose(target.dataset.seatId); });
  dialog.querySelectorAll("[data-seat-later]").forEach((button) => { button.onclick = () => close(true); });
}

async function maybeOfferRoomStation() { return offerRoomStation(); }

async function connectWithProfile(profile) {
  const api = new EdgeApi(profile);
  let lease;
  try {
    if (!await clientBuildReady(api, CLIENT_BUILD, BUILD_RELOAD_KEY)) return false;
    await api.get(`/meetings/${encodeURIComponent(profile.meetingId)}`);
    lease = await api.post("/licenses/leases", {
      entitlementId: profile.entitlementId, deviceId: profile.deviceId,
      meetingId: profile.meetingId, remote: profile.remote,
      presenterWorkplaceToken: profile.presenterWorkplace?.token
    });
    const participant = await api.post(`/meetings/${encodeURIComponent(profile.meetingId)}/participants/join`, {
      deviceId: profile.deviceId, leaseId: lease.id, presenceId: PRESENCE_ID,
      displayName: profile.displayName, role: profile.role,
      presenterWorkplaceToken: profile.presenterWorkplace?.token
    });
    enterApplication({ api, profile, leaseId: lease.id, participantId: participant.id });
    await refreshAll();
    await autoPublishOwnCamera();
    return true;
  } catch (error) {
    if (lease?.id) await api.delete(`/licenses/leases/${lease.id}`).catch(() => {});
    throw error;
  }
}

async function consumeConferenceHandoff() {
  let profile;
  try {
    profile = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || localStorage.getItem(HANDOFF_KEY) || "null");
  } catch (_) { profile = null; }
  if (!profile?.meetingId || !profile?.userId || !profile?.role) return false;
  let previous;
  try { previous = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (_) { previous = null; }
  // edge-s-active-session-v0.6 is shared localStorage, so it may belong to a
  // different, still-open tab (e.g. another participant joined from the same
  // browser) rather than a stale identity this same tab is replacing. Only
  // auto-leave/release it when this tab's own TAB_ID saved it - otherwise a
  // second tab's handoff would silently disconnect a live session in tab one.
  if (previous?.profile && previous?.participantId && previous?.leaseId && previous?.tabId === TAB_ID &&
      (previous.profile.userId !== profile.userId || previous.profile.meetingId !== profile.meetingId)) {
    const previousApi = new EdgeApi(previous.profile);
    await Promise.allSettled([
      previousApi.post(`/meetings/${previous.profile.meetingId}/participants/${previous.participantId}/leave`),
      previousApi.delete(`/licenses/leases/${previous.leaseId}`)
    ]);
  }
  clearActiveSession();
  if (!profile.authToken) sessionStorage.removeItem(AUTH_TOKEN_KEY);
  if (!await connectWithProfile(profile)) return true;
  sessionStorage.removeItem(HANDOFF_KEY);
  localStorage.removeItem(HANDOFF_KEY);
  return true;
}

async function autoPublishOwnCamera() {
  const wantsAudio = canSpeak() && localStorage.getItem(MICROPHONE_AUTO_KEY) !== "off" &&
    !state.localMedia?.getAudioTracks().some((track) => track.readyState === "live");
  const wantsVideo = localStorage.getItem(CAMERA_AUTO_KEY) !== "off" &&
    !state.localMedia?.getVideoTracks().some((track) => track.readyState === "live");
  if (!wantsAudio && !wantsVideo) return;
  // A refresh is not a user gesture. Safari/iPadOS may show the system sheet
  // again when getUserMedia is invoked here. Resume automatically only when
  // the browser explicitly reports that every required permission is granted.
  const permissions = await Promise.all([
    wantsAudio ? queryCapturePermission("microphone") : "granted",
    wantsVideo ? queryCapturePermission("camera") : "granted"
  ]);
  if (permissions.every((value) => value === "granted")) {
    try {
      if (wantsAudio) await ensureMicrophone();
      if (wantsVideo) await startCamera();
      await ensurePublishedMedia();
      state.mediaPermissionPending = false;
      renderFixedControls();
    } catch (error) {
      state.mediaPermissionPending = true;
      renderFixedControls();
      notify(`AV-устройства требуют подтверждения: ${error.message}`, 6000);
    }
    return;
  }
  state.mediaPermissionPending = true;
  renderFixedControls();
}

async function queryCapturePermission(name) {
  try { return (await navigator.permissions?.query?.({ name })).state ?? "unknown"; }
  catch (_) { return "unknown"; }
}

function installLocalVideoTrack(track) {
  if (!track || track.readyState !== "live") throw new Error("Браузер не вернул активный видеотрек");
  track.enabled = true;
  track.onmute = () => scheduleVideoRecovery("capture-muted");
  track.onunmute = () => { if (state.videoRecoveryTimer) clearTimeout(state.videoRecoveryTimer); state.videoRecoveryTimer = null; };
  track.onended = async () => {
    if (state.localMedia?.getVideoTracks().includes(track)) state.localMedia.removeTrack(track);
    if (state.publishedStream && state.localMedia?.getTracks().length) {
      await ensurePublishedMedia().catch((error) => notify(`Камера отключена: ${error.message}`, 7000));
    }
    notify("Камера была отключена браузером или операционной системой", 7000);
    renderPage();
  };
  state.localMedia ??= new MediaStream();
  state.localMedia.addTrack(track);
}

function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function scheduleVideoRecovery(reason = "resume") {
  if (!isAppleMobile() || document.hidden || localStorage.getItem(CAMERA_AUTO_KEY) === "off" || !state.publishedStream) return;
  if (state.videoRecoveryTimer) clearTimeout(state.videoRecoveryTimer);
  state.videoRecoveryTimer = setTimeout(() => recoverSuspendedVideo(reason).catch((error) => notify(`Восстановление камеры: ${error.message}`, 5000)), 650);
}

async function recoverSuspendedVideo(reason) {
  state.videoRecoveryTimer = null;
  if (document.hidden || localStorage.getItem(CAMERA_AUTO_KEY) === "off") return;
  const current = state.localMedia?.getVideoTracks()[0];
  // iPadOS can leave a nominally live track muted after backgrounding. A new
  // capture track plus a new video producer forces a fresh keyframe into the
  // persistent VideoCore input without restarting audio or the send transport.
  if (current && !current.muted && reason !== "pageshow") return;
  const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
    ...deviceConstraint(state.selectedVideoInputId), facingMode: state.selectedVideoInputId ? undefined : { ideal: "user" },
    width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }
  } });
  const replacement = media.getVideoTracks()[0];
  if (!replacement || replacement.readyState !== "live") throw new Error("iPadOS не вернул активный видеотрек");
  for (const track of state.localMedia?.getVideoTracks() ?? []) { track.onended = null; track.onmute = null; track.stop(); state.localMedia.removeTrack(track); }
  installLocalVideoTrack(replacement); state.forceVideoProducerRestart = true;
  await ensurePublishedMedia();
}

async function enableLocalAv() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Камера и микрофон требуют доверенного HTTPS");
  }
  const needAudio = canSpeak() && localStorage.getItem(MICROPHONE_AUTO_KEY) !== "off" &&
    !state.localMedia?.getAudioTracks().some((track) => track.readyState === "live");
  const needVideo = localStorage.getItem(CAMERA_AUTO_KEY) !== "off" &&
    !state.localMedia?.getVideoTracks().some((track) => track.readyState === "live");
  if (!needAudio && !needVideo) {
    state.mediaPermissionPending = false;
    renderFixedControls();
    return;
  }
  const media = await navigator.mediaDevices.getUserMedia({
    audio: needAudio ? {
      ...deviceConstraint(state.selectedAudioInputId), echoCancellation: true,
      noiseSuppression: true, autoGainControl: true
    } : false,
    video: needVideo ? {
      ...deviceConstraint(state.selectedVideoInputId),
      facingMode: state.selectedVideoInputId ? undefined : { ideal: "user" },
      width: { ideal: state.profile?.remote ? 640 : 1280 },
      height: { ideal: state.profile?.remote ? 360 : 720 },
      frameRate: { ideal: state.profile?.remote ? 15 : 24, max: state.profile?.remote ? 20 : 30 }
    } : false
  });
  const audioTrack = media.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = true;
    state.localMedia ??= new MediaStream();
    state.localMedia.addTrack(audioTrack);
  }
  const videoTrack = media.getVideoTracks()[0];
  if (videoTrack) installLocalVideoTrack(videoTrack);
  if ((needAudio && !audioTrack) || (needVideo && !videoTrack)) {
    media.getTracks().forEach((track) => track.stop());
    throw new Error("Браузер предоставил не все выбранные AV-устройства");
  }
  await refreshMediaDevices().catch(() => {});
  await ensurePublishedMedia();
  state.mediaPermissionPending = false;
  renderPage();
}

async function toggleParticipantVideo() {
  if (hasLocalVideo()) {
    localStorage.setItem(CAMERA_AUTO_KEY, "off");
    await stopCamera();
    return;
  }
  localStorage.setItem(CAMERA_AUTO_KEY, "on");
  await startPublishing();
}

function toggleLocalMediaPreference(key) {
  localStorage.setItem(key, localStorage.getItem(key) === "off" ? "on" : "off");
  renderPage();
}

function hasLocalVideo() {
  return Boolean(state.localMedia?.getVideoTracks().some((track) => track.readyState === "live"));
}

async function restoreActiveSession() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (_) { saved = null; }
  if (!saved?.profile || !saved.leaseId || !saved.participantId) return false;
  const api = new EdgeApi(saved.profile);
  try {
    if (!await clientBuildReady(api, CLIENT_BUILD, BUILD_RELOAD_KEY)) return true;
    const meeting = await api.get(`/meetings/${encodeURIComponent(saved.profile.meetingId)}`);
    await api.post(`/licenses/leases/${encodeURIComponent(saved.leaseId)}/heartbeat`, {
      deviceId: saved.profile.deviceId
    });
    const participant = meeting.participants?.[saved.participantId];
    if (!participant || participant.userId !== saved.profile.userId || participant.deviceId !== saved.profile.deviceId) {
      throw new Error("Сохранённый участник не найден в заседании");
    }
    await api.post(`/meetings/${encodeURIComponent(saved.profile.meetingId)}/participants/join`, {
      deviceId: saved.profile.deviceId, leaseId: saved.leaseId, presenceId: PRESENCE_ID,
      displayName: saved.profile.displayName, role: saved.profile.role,
      presenterWorkplaceToken: saved.profile.presenterWorkplace?.token
    });
    enterApplication({ api, profile: saved.profile, leaseId: saved.leaseId, participantId: saved.participantId });
    await refreshAll();
    await autoPublishOwnCamera();
    notify("Сессия восстановлена после обновления страницы", 3000);
    return true;
  } catch (restoreError) {
    if (restoreError?.status === 404) {
      clearActiveSession();
      return false;
    }
    try {
      const lease = await api.post("/licenses/leases", {
        entitlementId: saved.profile.entitlementId,
        deviceId: saved.profile.deviceId,
        meetingId: saved.profile.meetingId,
        remote: saved.profile.remote,
        presenterWorkplaceToken: saved.profile.presenterWorkplace?.token
      });
      const participant = await api.post(
        `/meetings/${encodeURIComponent(saved.profile.meetingId)}/participants/join`,
        {
          deviceId: saved.profile.deviceId,
          leaseId: lease.id,
          presenceId: PRESENCE_ID,
          displayName: saved.profile.displayName,
          role: saved.profile.role,
          presenterWorkplaceToken: saved.profile.presenterWorkplace?.token
        }
      );
      enterApplication({ api, profile: saved.profile, leaseId: lease.id, participantId: participant.id });
      await refreshAll();
      await autoPublishOwnCamera();
      notify("Сессия восстановлена с новой лицензией", 3000);
      return true;
    } catch (reacquireError) {
      clearActiveSession();
      if (reacquireError?.status === 409) {
        connectError("Эта лицензия уже используется другим устройством или заседанием. Завершите прежнюю сессию либо дождитесь истечения lease.");
      }
      return false;
    }
  }
}

function startTimers() {
  clearTimers();
  startEventStream();
  state.voteCountdownTimer = setInterval(updateVoteCountdowns, 1000);
  state.refreshTimer = setInterval(() => refreshAll(true), 30000);
  state.heartbeatTimer = setInterval(() => {
    state.api.post(`/meetings/${state.profile.meetingId}/participants/${state.participantId}/presence`, { presenceId: PRESENCE_ID })
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          void exitClosedConference();
          return;
        }
        if (error.status === 409 && error.serverMessage === "Participant presence is no longer active") {
          clearInterval(state.heartbeatTimer);
          state.heartbeatTimer = null;
          notify(error.message, 15000);
        } else notify(`Присутствие: ${error.message}`);
      });
  }, 20000);
  state.signalTimer = setInterval(pollSignaling, 30000);
  void pollSignaling();
  state.programTimer = setInterval(refreshProgram, 10000);
  state.programHealthTimer = setInterval(checkProgramVideoHealth, 2000);
  if (state.profile.presenterWorkplace) {
    state.presenterWorkplaceTimer = setInterval(async () => {
      if (!state.api || state.presenterExitPending) return;
      const { seatId, token } = state.profile.presenterWorkplace;
      try {
        const response = await fetch(`/api/v1/shared-seats/${encodeURIComponent(seatId)}/device-session?statusOnly=1`, {
          cache: "no-store", headers: { "X-Seat-Device-Id": state.profile.deviceId, "X-Seat-Token": token }
        });
        if (!response.ok) return;
        const status = await response.json();
        if (status.session?.status === "active" && status.session.assignedUserId === state.profile.userId &&
            status.session.meetingId === state.profile.meetingId) return;
        state.presenterExitPending = true;
        await disconnect();
      } catch (_) { /* transient network loss must not log out a presenter */ }
    }, 4000);
  }
  if (state.profile.role === "secretary") {
    state.secretarySaveTimer = setInterval(() => saveSecretaryTranscript().catch((error) => notify(error.message)), 5000);
  }
}

function clearTimers() {
  clearInterval(state.voteCountdownTimer);
  clearInterval(state.refreshTimer);
  clearInterval(state.heartbeatTimer);
  clearInterval(state.signalTimer);
  clearInterval(state.programTimer);
  clearInterval(state.programHealthTimer);
  clearInterval(state.secretarySaveTimer);
  clearInterval(state.presenterWorkplaceTimer);
  clearTimeout(state.eventReconnectTimer);
  clearTimeout(state.eventRefreshTimer);
  state.eventAbort?.abort();
  state.eventAbort = null;
  state.eventReconnectAttempts = 0;
  setEventConnectionStatus(true);
}

function schedulePushRefresh(eventType) {
  state.pendingPushEvents ??= new Set();
  state.pendingPushEvents.add(eventType);
  clearTimeout(state.eventRefreshTimer);
  state.eventRefreshTimer = setTimeout(() => {
    const events = [...state.pendingPushEvents];
    state.pendingPushEvents.clear();
    const floorOnly = events.every((type) => type.startsWith("floor.") ||
      type.startsWith("recording.") || type === "conference.recording-changed" ||
      type.startsWith("conference.microphone") || type.startsWith("mcu.video-program") ||
      type === "mcu.video-scene-visible" ||
      type === "mediaplane.video-scene-visible" ||
      type === "media.floor-scene-updated");
    if (events.some((type) => type.startsWith("media.") || type.startsWith("mcu.video-program") ||
        type === "mcu.video-scene-visible" ||
      type === "mediaplane.video-scene-visible" ||
        type === "participant.updated")) refreshProgram();
    // A floor change used to fetch every product module and rebuild the whole
    // source page on every client. Besides being expensive on Safari, that
    // temporarily detached thumbnail canvases and looked like a strobe. Floor
    // events need only authoritative meeting state plus PGM metadata.
    if (floorOnly) refreshFloorState();
    else refreshAll(true);
  }, 60);
}

async function refreshFloorState() {
  if (!state.api || !state.profile?.meetingId) return;
  if (state.floorRefreshing) {
    state.floorRefreshPending = true;
    return;
  }
  state.floorRefreshing = true;
  state.floorRefreshPending = false;
  try {
    const meeting = await state.api.get(`/meetings/${encodeURIComponent(state.profile.meetingId)}`);
    state.meeting = meeting;
    if (["closed", "archived"].includes(meeting.status)) return exitClosedConference();
    renderMicrophoneDock();
    renderFixedControls();
    const liveNames = $("#secretaryLiveNames");
    if (liveNames) liveNames.textContent = meeting.activeSpeakerIds.map((id) =>
      meeting.participants[id]?.displayName).filter(Boolean).join(", ") || "Сейчас никто не выступает";
    if (state.profile.role === "secretary" && document.querySelector(".secretary-workspace")) {
      const meetingPath = `/meetings/${encodeURIComponent(state.profile.meetingId)}`;
      [state.recordingStatus, state.protocol] = await Promise.all([
        state.api.get(`${meetingPath}/recording/status`), state.api.get(`${meetingPath}/protocol`)
      ]);
      renderMicrophoneDock();
      const channels = document.querySelector(".secretary-open-channels .secretary-speakers");
      if (channels) channels.innerHTML = secretarySpeakersHtml();
      await syncSecretaryTurn();
      const focused = document.activeElement?.id === "secretaryText";
      const selection = focused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
      const template = document.createElement("template");
      template.innerHTML = secretaryWorkspaceHtml();
      document.querySelector(".secretary-workspace")?.replaceWith(template.content.firstElementChild);
      if (focused) {
        const field = document.querySelector("#secretaryText");
        field?.focus();
        field?.setSelectionRange(...selection);
      }
    }
    // Never rebuild or temporarily detach the Conference DOM for a microphone
    // event. WebKit/iPadOS can paint black when a live <video> is removed and
    // reinserted even though its MediaStream and consumer never changed.
    // The dock, fixed controls and PGM captions are updated independently.
    if (state.activeTab === "streams") updateSourceWallFloorState();
    syncConferenceAudio().catch(() => {});
  } catch (error) {
    if (error.status === 401 || error.status === 403) return exitClosedConference();
    if (state.profile?.role === "secretary") notify(`Стенограмма не синхронизирована: ${error.message}`);
    // The normal low-frequency refresh remains the recovery path.
  } finally {
    state.floorRefreshing = false;
    if (state.floorRefreshPending) refreshFloorState();
  }
}

function updateSourceWallFloorState() {
  const active = new Set(state.meeting?.activeSpeakerIds ?? []);
  for (const row of $$('[data-stream-row]')) {
    const stream = state.streams.find((item) => item.id === row.dataset.streamRow);
    row.classList.toggle("source-row-speaking", Boolean(stream?.ownerParticipantId && active.has(stream.ownerParticipantId)));
  }
}

function applyAudioMeters(payload) {
  if (!payload || payload.meetingId !== state.profile?.meetingId || payload.channel !== "program") return;
  for (const meter of payload.meters ?? []) state.audioMeters.set(meter.sourceId, meter);
  for (const element of $$('[data-audio-meter]')) {
    const meter = state.audioMeters.get(element.dataset.audioMeter);
    const db = Number(meter?.peakDbfs ?? meter?.rmsDbfs ?? meter?.levelDbfs ?? -127);
    element.value = Math.max(-60, Math.min(0, db));
    element.title = `${db.toFixed(1)} dBFS`;
  }
}

function setEventConnectionStatus(connected) {
  const indicator = document.getElementById("eventConnectionStatus");
  if (indicator) indicator.hidden = connected;
}

async function startEventStream() {
  state.eventAbort?.abort();
  const controller = new AbortController();
  state.eventAbort = controller;
  setEventConnectionStatus(false);
  try {
    const meetingId = encodeURIComponent(state.profile.meetingId);
    const response = await fetch(`${state.api.base}/events?meetingId=${meetingId}`, {
      headers: state.api.headers({ Accept: "text/event-stream" }),
      cache: "no-store", signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) return exitClosedConference();
    if (!response.ok || !response.body) throw new Error(`SSE HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, boundary).replaceAll("\r", "");
        buffer = buffer.slice(boundary + 2);
        const eventType = frame.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
        const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
        let eventPayload = null;
        try { eventPayload = dataLine ? JSON.parse(dataLine.slice(5).trim())?.payload : null; } catch (_) {}
        if (eventType === "connected") {
          state.eventReconnectAttempts = 0;
          setEventConnectionStatus(true);
          void pollSignaling();
        }
        else if (eventType === "conference.ending" || eventType === "conference.closed") {
          void exitClosedConference();
          return;
        }
        else if (eventType === "mediaplane.audio-input-meters") applyAudioMeters(eventPayload);
        else if (eventType === "chat.signal") void pollSignaling();
        else if (eventType?.startsWith("document-scene.")) documentSceneEvent(eventType, eventPayload);
        else if (eventType && eventType !== "connected" && eventType !== "mediaplane.audio-levels") schedulePushRefresh(eventType);
      }
    }
    if (!controller.signal.aborted) throw new Error("SSE stream closed");
  } catch (error) {
    if (controller.signal.aborted || state.eventAbort !== controller) return;
    setEventConnectionStatus(false);
    state.eventReconnectTimer = setTimeout(startEventStream, eventRetryDelay(state.eventReconnectAttempts++));
  }
}

// PGM follows the floor within ~1.5 s instead of waiting for the full
// 4-second page refresh (which, together with the old two-poll switch
// confirmation, delayed a speaker's camera in PGM by up to 8 s).
async function refreshProgram() {
  if (!state.api || !state.meeting || state.programRefreshing) return;
  state.programRefreshing = true;
  try {
    const descriptor = await state.api.get(`/media/program?meetingId=${encodeURIComponent(state.profile.meetingId)}`);
    const sourceId = descriptor.source?.id ?? null;
    const previous = state.programDescriptor;
    const changed = sourceId !== (state.routing?.buses?.program?.sourceId ?? null) ||
      descriptor.composition?.videoProducerId !== previous?.composition?.videoProducerId ||
      descriptor.sourceProducerId !== previous?.sourceProducerId ||
      JSON.stringify(descriptor.composition?.visibleSourceIds ?? []) !== JSON.stringify(previous?.composition?.visibleSourceIds ?? []);
    state.programDescriptor = descriptor;
    if (state.routing?.buses?.program) state.routing.buses.program.sourceId = sourceId;
    if (descriptor.source && !state.streams.some((item) => item.id === descriptor.source.id)) {
      state.streams = [...state.streams, descriptor.source];
    }
    if (["conference", "streams", "translation"].includes(state.activeTab) && (changed || !subscriptionHealthy(state.programSubscriber) ||
        state.programSubscriber?.key !== state.programDesiredKey)) {
      if (["conference", "translation"].includes(state.activeTab)) mountProgram();
      else mountStudioMonitors();
    }
  } catch (_) {
    // The next full refresh reports connectivity problems; a missed PGM poll is not one.
  } finally {
    state.programRefreshing = false;
  }
}

async function refreshAll(silent = false) {
  if (!state.api) return;
  if (state.refreshing) { state.refreshQueued = true; return; }
  state.refreshing = true;
  state.refreshQueued = false;
  try {
    const meetingId = encodeURIComponent(state.profile.meetingId);
    const keep = (promise, fallback) => promise.catch(() => fallback);
    // Role rights are configurable by the administrator; the server is the
    // authority, the UI only hides what the server would refuse anyway.
    const permissions = await keep(state.api.get(`/permissions/me?meetingId=${meetingId}`), null);
    if (permissions) {
      state.capabilities = new Set(permissions.capabilities);
      if (permissions.conferenceRole && state.profile.role !== permissions.conferenceRole) {
        state.profile.role = permissions.conferenceRole;
        state.api.profile.role = permissions.conferenceRole;
        saveProfile(state.profile);
        saveActiveSession();
      }
    }
    const role = state.profile.role;
    if (role === "secretary" && !state.secretaryLayoutLoaded) {
      const savedLayout = await keep(state.api.get(`/me/secretary-layout?meetingId=${meetingId}`), null);
      if (savedLayout) {
        state.secretaryLayout = savedLayout.layout ?? structuredClone(SECRETARY_LAYOUT_DEFAULT);
        state.secretaryLayoutLoaded = true;
      }
    }
    if (role !== "secretary" && state.workspaceLayoutRole !== role) {
      // Role layout (participants, set by the administrator) or personal layout (technical roles).
      applyWorkspaceLayout(await keep(state.api.get(`/me/workspace-layout?meetingId=${meetingId}`), null), role);
    }
    const deviceAccess = ["operator", "technician", "admin"].includes(role);
    const readinessAccess = ["chair", "secretary", "operator", "technician", "admin"].includes(role);
    const signageAccess = state.capabilities.has("signage.manage");
    const serviceAccess = state.capabilities.has("service.requests");
    const sharedSeatAccess = ["secretary", "operator", "technician", "admin"].includes(role);
    const mediaAccess = can("media.devices");
    const aes67Access = ["operator", "technician", "admin"].includes(role);
    const [meeting, streams, votes, documents, presentations, devices, readiness, signagePlayers, aes67, serviceRequests, sharedSeats, chatSessions, cameras, mediaRuntime, routing, programDescriptor, mediaWorkers, multicastJobs, ndiJobs, systemStatus, mcuHealth, pgmSlates, translateStatus, translateMeeting] = await Promise.all([
      state.api.get(`/meetings/${meetingId}`),
      state.api.get(`/meetings/${meetingId}/streams`),
      state.api.get(`/meetings/${meetingId}/votes`),
      state.api.get(`/meetings/${meetingId}/documents`),
      state.api.get(`/meetings/${meetingId}/presentations`),
      deviceAccess ? keep(state.api.get(`/devices?roomId=default-room&meetingId=${meetingId}`), state.devices) : Promise.resolve(state.devices),
      readinessAccess ? keep(state.api.get(`/rooms/default-room/readiness?meetingId=${meetingId}`), state.readiness) : Promise.resolve(state.readiness),
      signageAccess ? keep(state.api.get(`/signage/players?meetingId=${meetingId}`), state.signagePlayers) : Promise.resolve(state.signagePlayers),
      aes67Access ? keep(state.api.get(`/media/aes67?meetingId=${meetingId}`), state.aes67) : Promise.resolve(state.aes67),
      serviceAccess ? keep(state.api.get(`/service/requests?meetingId=${meetingId}`), state.serviceRequests) : Promise.resolve(state.serviceRequests),
      sharedSeatAccess ? keep(state.api.get("/shared-seats?roomId=default-room"), state.sharedSeats) : Promise.resolve(state.sharedSeats),
      keep(state.api.get(`/chat/sessions?meetingId=${meetingId}&participantId=${encodeURIComponent(state.participantId)}`), state.chatSessions),
      mediaAccess ? keep(state.api.get("/cameras?roomId=default-room"), state.cameras) : Promise.resolve(state.cameras),
      mediaAccess ? keep(state.api.get("/media/runtime"), state.mediaRuntime) : Promise.resolve(state.mediaRuntime),
      keep(state.api.get(`/media/routing?meetingId=${meetingId}`), state.routing),
      keep(state.api.get(`/media/program?meetingId=${meetingId}`), state.programDescriptor),
      mediaAccess ? keep(state.api.get("/media/workers"), state.mediaWorkers) : Promise.resolve(state.mediaWorkers),
      mediaAccess ? keep(state.api.get("/media/multicast"), state.multicastJobs) : Promise.resolve(state.multicastJobs),
      mediaAccess ? keep(state.api.get("/media/ndi/jobs"), state.ndiJobs) : Promise.resolve(state.ndiJobs),
      keep(state.api.get("/status"), state.systemStatus),
      can("media.health.read") ? keep(state.api.get(`/mcu/health?meetingId=${meetingId}`), state.mcuHealth) : Promise.resolve(state.mcuHealth),
      can("pgm.operate") ? keep(state.api.get("/media/pgm-slates"), state.pgmSlates) : Promise.resolve(state.pgmSlates),
      keep(state.api.get("/translate-core/status"), state.translateStatus),
      keep(state.api.get(`/meetings/${meetingId}/translate-core`), state.translateMeeting)
    ]);
    if (!await clientBuildReady(state.api, CLIENT_BUILD, BUILD_RELOAD_KEY, systemStatus)) return;
    Object.assign(state, { meeting, streams, votes, documents, presentations, devices, readiness, signagePlayers, aes67, serviceRequests, sharedSeats, cameras, mediaRuntime, routing, programDescriptor, mediaWorkers, multicastJobs, ndiJobs, systemStatus, mcuHealth, pgmSlates, translateStatus, translateMeeting });
    if (role === "secretary") {
      const [protocol, recordingStatus] = await Promise.all([
        keep(state.api.get(`/meetings/${meetingId}/protocol`), state.protocol),
        keep(state.api.get(`/meetings/${meetingId}/recording/status`), state.recordingStatus)
      ]);
      state.protocol = protocol;
      state.recordingStatus = recordingStatus;
      await syncSecretaryTurn();
    } else if (can("conference.recording")) {
      state.recordingStatus = await keep(state.api.get(`/meetings/${meetingId}/recording/status`), state.recordingStatus);
    }
    reconcileChatSessions(chatSessions, meeting);
    if (meeting.status === "closed" || meeting.status === "archived") {
      await exitClosedConference();
      return;
    }
    const openVote = votes.find((vote) => vote.status === "open");
    const me = meeting.participants?.[state.participantId];
    updateDocumentViewerRights({
      canView: me?.permissions?.canViewFiles !== false || canManageContent(),
      canAnnotate: me?.permissions?.canAnnotatePresentation === true || canManageContent()
    });
    const eligibleForOpenVote = openVote && me?.permissions?.canVote !== false && (!openVote.eligibleParticipantIds?.length || openVote.eligibleParticipantIds.includes(state.participantId));
    if (eligibleForOpenVote && !/^(interpreter|translator)$/.test(role) && state.lastOpenVoteId !== openVote.id) {
      state.lastOpenVoteId = openVote.id;
      state.activeTab = "voting";
      notify("Открыто голосование", 5000);
    }
    if (!openVote) state.lastOpenVoteId = null;
    await reconcileSelectedStream();
    await syncLocalMicrophone();
    await syncConferenceAudio();
    if (state.activeTab === "streams") syncSourceWall().catch((error) => notify(`Источники: ${error.message}`, 3500));
    updateBuildLabels();
    $("#meetingTitle").textContent = meeting.title;
    $("#meetingState").textContent = `${meeting.pausedAt ? "ПАУЗА" : meeting.status.toUpperCase()} · ${state.profile.remote ? "WAN" : "LAN"}`;
    // Role-scoped styling: participants do not see technical status, technicians keep it.
    document.body.dataset.role = state.profile.role ?? "";
    const renderKey = JSON.stringify({
      tab: state.activeTab,
      meeting: [meeting.status, meeting.activeAgendaItemId, meeting.activeSpeakerIds, meeting.floorQueue],
      participants: Object.values(meeting.participants ?? {}).map((item) => [item.id, item.state, item.role,
        item.permissions?.canSpeak, item.permissions?.canVote, item.permissions?.canUploadFiles,
        item.permissions?.canViewFiles, item.permissions?.canShareScreen, item.roomStationId]),
      streams: streams.map((item) => [item.id, item.label, item.status, item.previewUrl, item.ingestUrl, item.ndiSourceName]),
      audioSettings: [meeting.audioSettings?.discussionMode, meeting.audioSettings?.queuePolicy,
        meeting.audioSettings?.maxOpenMicrophones, meeting.audioSettings?.masterGain,
        Object.entries(meeting.audioSettings?.participantGains ?? {}).sort(),
        Object.entries(meeting.audioSettings?.sourceGains ?? {}).sort(),
        Object.entries(meeting.audioSettings?.sourceMutes ?? {}).sort()],
      program: [routing?.buses?.program?.sourceId, programDescriptor?.composition?.videoProducerId],
      pgm: [programDescriptor?.pgm?.source, programDescriptor?.pgm?.idleMode, programDescriptor?.pgm?.multiMode, Boolean(programDescriptor?.pgm?.override)],
      capabilities: [...state.capabilities].sort(),
      votes: votes.map((item) => [item.id, item.status, item.updatedAt, item.closedAt, Object.keys(item.ballots ?? {}).length]),
      presentations: presentations.map((item) => [item.id, item.status, item.updatedAt]),
      presenters: (meeting.preparedParticipants ?? []).filter((item) => item.reports || item.role === "presenter")
        .map((item) => [item.id, item.status, item.excludedAt, item.reportOrder, item.presenterSeatId,
          item.reportSeatMode, item.ownReportSession?.status]),
      presenterSeats: (sharedSeats ?? []).map((item) => [item.id, item.online, item.session?.status,
        item.session?.assignedUserId, item.session?.confirmedAt]),
      secretaryRecording: state.recordingStatus?.enabled,
      translation: [translateMeeting?.revision, translateMeeting?.selections?.[state.participantId]?.channelId]
    });
    if (!silent || renderKey !== state.lastRenderKey) {
      state.lastRenderKey = renderKey;
      renderPage();
    } else updateChatNotice();
    void maybeOfferRoomStation().catch((error) => notify(`Рассадка: ${error.message}`, 3500));
  } catch (error) {
    if (error.status === 401 || error.status === 403) return exitClosedConference();
    if (error.status === 404 && state.profile?.meetingId) {
      clearTimers(); clearActiveSession();
      Object.assign(state, { api:null, meeting:null, participantId:null, leaseId:null });
      location.replace("/conference/");
      return;
    }
    if (!silent) notify(error.message);
  } finally {
    state.refreshing = false;
    if (state.refreshQueued) queueMicrotask(() => refreshAll(true));
  }
}

function updateBuildLabels() {
  const text = state.systemStatus
    ? `VOX-S v${state.systemStatus.version} · build ${state.systemStatus.build}`
    : "VOX-S";
  const login = $("#loginBuildLabel");
  const app = $("#appBuildLabel");
  if (login) login.textContent = text;
  if (app) app.textContent = text;
}

async function selectTab(tab) {
  if (tab === "operations" && state.profile?.remote === true) return;
  if (state.activeTab === "streams" && tab !== "streams") {
    state.streamsWarmUntil = Date.now() + 120_000;
    stopThumbnailLoop(); closeStreamPreviewModal();
  }
  state.activeTab = tab;
  if (tab === "chat" && state.activeChatId) markChatRead(state.activeChatId);
  $$(".nav-item[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  renderPage();
  if (tab === "streams") await activateStreamsPreview();
}

async function activateStreamsPreview() {
  if (!state.selectedStream) {
    const routedId = state.routing?.buses?.preview?.sourceId ?? state.routing?.buses?.program?.sourceId;
    state.selectedStream = state.streams.find((item) => item.id === routedId) ?? null;
  }
  const budgetedIds = new Set(budgetedThumbnailStreams().map((stream) => stream.id));
  const visible = state.streams.filter((stream) => stream.status === "available" && stream.sourceType !== "system_multiview" &&
    (!inMcu(stream) || stream.ownerParticipantId === state.participantId || budgetedIds.has(stream.id)));
  await Promise.allSettled(visible.map(async (stream) => {
    if (inMcu(stream) && stream.ownerParticipantId !== state.participantId) {
      await watchClientStream(stream, { includeVideo: true, includeAudio: false,
        previewQuality: state.previewModalStreamId === stream.id ? "full" : "thumbnail" });
    } else await ensureStreamPreview(stream).catch(() => {});
  }));
  await pruneUnusedViewerPeers();
  mountStudioMonitors();
  mountStreamThumbnails();
}

async function syncSourceWall() {
  if (state.activeTab !== "streams") return;
  const visible = budgetedThumbnailStreams();
  await Promise.allSettled(visible.map((stream) =>
    watchClientStream(stream, { includeVideo: true, includeAudio: false,
      previewQuality: state.previewModalStreamId === stream.id ? "full" : "thumbnail" })));
  if (state.activeTab === "streams") { mountStreamThumbnails(); mountStreamPreviewModal(); }
}

function budgetedThumbnailStreams() {
  const candidates = state.streams.filter((stream) => stream.status === "available" &&
    stream.sourceType !== "system_multiview" && inMcu(stream) && stream.ownerParticipantId !== state.participantId);
  const byId = new Map(candidates.map((stream) => [stream.id, stream]));
  // Decoder slots on resource-constrained Safari are sticky. A microphone
  // event must not evict a healthy thumbnail and rebuild its ICE/DTLS/
  // consumer chain merely because the active-speaker order changed.
  const retained = state.thumbnailBudgetIds.filter((id) => byId.has(id));
  const retainedSet = new Set(retained);
  for (const stream of candidates) {
    if (retained.length >= THUMBNAIL_DECODE_BUDGET) break;
    if (!retainedSet.has(stream.id)) { retained.push(stream.id); retainedSet.add(stream.id); }
  }
  state.thumbnailBudgetIds = retained;
  return retained.map((id) => byId.get(id));
}




async function disconnect() {
  await saveSecretaryTranscript().catch((error) => notify(`Стенограмма не сохранена: ${error.message}`));
  clearTimers();
  closeDocumentViewer();
  // Local WebRTC/media teardown (closeAllPeers/closeAllChats, track.stop())
  // can throw synchronously on some mobile browsers when a connection is
  // already in an unstable state - an uncaught throw here used to abort the
  // rest of disconnect() outright, so tapping "disconnect" silently did
  // nothing (no server leave call, no redirect). Best-effort cleanup, but
  // the server-side leave and the redirect below must always happen.
  try {
    for (const view of state.mediaViews.values()) view.hls?.destroy();
    state.mediaViews.clear();
    state.programStageNode = null;
    state.studioPreviewStageNode = null;
    state.studioProgramStageNode = null;
    state.thumbnailSinks.clear();
    state.streamsWarmUntil = 0;
    await closeAllPeers();
    await closeAllChats();
    if (state.publishedStream) await state.api.delete(`/streams/${state.publishedStream.id}`).catch(() => {});
    if (state.contentPublishedStream) await state.api.delete(`/streams/${state.contentPublishedStream.id}`).catch(() => {});
    state.localMedia?.getTracks().forEach((track) => track.stop());
    state.contentMedia?.getTracks().forEach((track) => track.stop());
  } catch (error) {
    console.error("Media cleanup during disconnect failed", error);
  }
  await state.api.post(`/meetings/${state.profile.meetingId}/participants/${state.participantId}/leave`).catch(() => {});
  await state.api.delete(`/licenses/leases/${state.leaseId}`).catch(() => {});
  Object.assign(state, {
    api: null, leaseId: null, participantId: null, meeting: null, accessPin: null, streams: [], cameras: [], mediaRuntime: null,
    routing: null, ndiSources: [], ndiJobs: [], mediaWorkers: [], onvifDiscoveries: [], votes: [], documents: [],
    presentations: [], devices: [], readiness: null, signagePlayers: [], aes67: null, serviceRequests: [], sharedSeats: [], chatSessions: [],
    activeChatId: null, claimedSeat: null, localMedia: null, publishedStream: null,
    contentMedia: null, contentPublishedStream: null, selectedStream: null, selectedSourceIdentity: null,
    watchingStreamId: null, remoteMedia: null, systemStatus: null, mcuHealth: null, voteSelections: new Map(),
    mediaPermissionPending: false, secretaryLayout: structuredClone(SECRETARY_LAYOUT_DEFAULT),
    secretaryLayoutDraft: null, secretaryLayoutLoaded: false
  });
  clearActiveSession();
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  location.replace("/conference/?error=handoff-missing");
}

async function exitClosedConference() {
  if (state.exitingConference) return;
  state.exitingConference = true;
  clearTimers();
  clearActiveSession();
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  $("#appView").hidden = true;
  state.localMedia?.getTracks().forEach((track) => track.stop());
  state.contentMedia?.getTracks().forEach((track) => track.stop());
  void closeAllPeers().catch(() => {});
  void closeAllChats().catch(() => {});
  Object.assign(state, { api: null, meeting: null, participantId: null, leaseId: null });
  location.replace("/conference/?ended=1");
}

$("#refreshBtn").addEventListener("click", () => refreshAll());
// Leaving drops the participant from the meeting; ask first so a stray tap does not.
$("#disconnectBtn").addEventListener("click", async () => {
  if (await confirmDialog("Выйти из конференции? Чтобы вернуться, нужно будет войти заново.", "Выйти", "Остаться")) disconnect();
});
$("#secretaryLayoutBtn")?.addEventListener("click", (event) => {
  if (event.currentTarget.dataset.action !== "secretary-layout-edit") return;
  if (!canEditWorkspaceLayout() || !["conference", "translation"].includes(state.activeTab) || state.secretaryLayoutDraft) return;
  state.secretaryLayoutDraft = structuredClone(state.secretaryLayout);
  renderPage();
});
$("#secretaryLayoutActions")?.addEventListener("click", (event) => {
  const t = event.target.closest("[data-action]");
  if (t) handleSecretaryLayoutAction(t.dataset.action, t);
});
$("#chatNoticeBtn")?.addEventListener("click", () => selectTab("chat").catch((error) => notify(error.message)));
$$(".nav-item[data-tab]").forEach((button) => button.addEventListener("click", () => {
  selectTab(button.dataset.tab).catch((error) => notify(error.message));
}));
// Views load after these listeners are registered. Resolve the handlers when
// a gesture occurs, rather than capturing their still-undefined bindings.
$("#pageContent").addEventListener("pointerdown", (event) => startSecretaryLayoutGesture?.(event));
document.addEventListener("pointermove", (event) => moveSecretaryLayoutGesture?.(event));
document.addEventListener("pointerup", (event) => finishSecretaryLayoutGesture?.(event));
document.addEventListener("pointercancel", (event) => finishSecretaryLayoutGesture?.(event));

$("#pageContent").addEventListener("change", (event) => {
  if (event.target.id === "participantLanguage") {
    setParticipantLanguage(state.profile?.userId, event.target.value);
    renderPage();
    return;
  }
  if (event.target.matches('input[name="secretaryMode"]')) {
    void (async () => {
      await saveSecretaryTranscript();
      state.secretaryMode = event.target.value;
      renderPage();
    })().catch((error) => notify(error.message));
    return;
  }
  if (event.target.matches("input[data-mix-gain]")) {
    const participantId = event.target.dataset.mixGain;
    const value = Number(event.target.value);
    runAction(async () => {
      state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`,
        { participantGain: { participantId, value } });
    }, "Уровень микрофона обновлён");
  }
  if (event.target.matches("input[data-mix-master]")) {
    const masterGain = Number(event.target.value);
    runAction(async () => {
      state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, { masterGain });
    }, "Mix-master обновлён");
  }
  if (event.target.matches("input[data-source-gain]")) {
    const streamId = event.target.dataset.sourceGain;
    const value = Number(event.target.value);
    runAction(async () => {
      state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`,
        { sourceGain: { streamId, value } });
    }, value === 0 ? "Линейный источник заглушён" : "Уровень линейного источника обновлён");
  }
  if (event.target.id === "documentUpload") {
    runAction(() => uploadDocument(event.target.files[0]), "Файл отправлен");
  }
  if (event.target.id === "agendaDocumentUpload") {
    runAction(() => uploadAgendaDocument(event.target.files[0]), "Документ прикреплён к повестке");
  }
  if (event.target.id === "operatorSlateUpload") {
    runAction(() => uploadPgmSlate(event.target.files[0]), "Заставка добавлена в библиотеку");
  }
  if (event.target.dataset.mediaDevice) {
    runAction(() => changeMediaDevice(event.target.dataset.mediaDevice, event.target.value), "Устройство переключено");
  }
  if (event.target.matches("input[data-translation-volume]")) {
    state.translationVolume = Math.max(0, Math.min(1, Number(event.target.value) / 100));
    localStorage.setItem(TRANSLATION_VOLUME_KEY, String(state.translationVolume));
    if (state.serverAudioElement) state.serverAudioElement.volume = state.translationVolume;
  }
});

$("#pageContent").addEventListener("input", (event) => {
  if (event.target.id === "secretaryText") {
    if (state.secretaryMode === "transcript") {
      state.secretaryEditor.value = event.target.value;
      state.secretaryEditor.dirty = true;
    } else state.secretaryNoteDraft = event.target.value;
    return;
  }
  if (event.target.matches("input[data-mix-gain], input[data-mix-master]")) {
    const output = event.target.closest(".mix-fader, .participant-gain")?.querySelector("output");
    if (output) output.textContent = `${event.target.value}%`;
  }
  if (event.target.matches("input[data-source-gain]")) {
    const output = event.target.closest(".participant-gain")?.querySelector("output");
    if (output) output.textContent = `${event.target.value}%`;
  }
  if (event.target.id === "chatMessage" && event.target.dataset.sessionId) {
    state.chatDrafts.set(event.target.dataset.sessionId, event.target.value);
  }
  if (event.target.matches("input[data-translation-volume]")) {
    const output = event.target.closest(".translation-volume")?.querySelector("output");
    if (output) output.textContent = `${event.target.value}%`;
  }
});

$("#pageContent").addEventListener("submit", (event) => {
  if (event.target.id !== "chatForm") return;
  event.preventDefault();
  const input = $("#chatMessage");
  const text = input?.value.trim();
  if (!text) return;
  try {
    runAction(() => sendChatMessage(text));
  } catch (error) {
    notify(error.message);
  }
});

async function handleMicrophoneAction(button) {
  if (!button || button.disabled || !state.meeting) return;
  const action = button.dataset.micAction;
  button.disabled = true;
  try {
    if (action === "delegate") {
      const active = state.meeting.activeSpeakerIds.includes(state.participantId);
      const queued = state.meeting.floorQueue.includes(state.participantId);
      await runMicrophoneAction(active || queued ? selfRelease : requestFloor);
    }
    if (action === "chair-priority") await runMicrophoneAction(() => activateChairMicrophone("priority"));
    if (action === "chair-take-floor") {
      const speaking = state.meeting.activeSpeakerIds.includes(state.participantId);
      await runMicrophoneAction(speaking ? selfRelease : () => activateChairMicrophone("normal"));
    }
    if (action === "chair-next") {
      const nextId = state.meeting.audioSettings?.discussionMode === "managed"
        ? state.meeting.floorQueue.find((id) => state.meeting.participants?.[id]?.state === "joined") : null;
      if (nextId) await runAction(() => grantFloor(nextId), "Слово предоставлено следующему участнику");
    }
  } finally { button.disabled = false; }
}

$("#pageContent").addEventListener("click", (event) => {
  const micButton = event.target.closest("[data-mic-action]");
  if (micButton) {
    handleMicrophoneAction(micButton).catch((error) => notify(error.message));
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (handleWorkspaceUiAction(action, target)) return;
  if (action === "secretary-panel-before" || action === "secretary-panel-after") {
    moveSecretaryLayoutPanel(target.dataset.panelId, action === "secretary-panel-before" ? -1 : 1);
    return;
  }
  if (["secretary-record-start", "secretary-record-pause", "secretary-record-stop"].includes(action)) {
    const operation = action.slice("secretary-record-".length);
    runAction(() => state.api.post(`/meetings/${state.profile.meetingId}/recording/speakers/${encodeURIComponent(target.dataset.participantId)}/${operation}`),
      "Запись выступления обновлена"); return;
  }
  if (action === "secretary-save-editor") { runAction(saveSecretaryEditor, "Текст сохранён"); return; }
  if (action === "secretary-clear-editor") { void clearSecretaryEditor().catch((error) => notify(error.message)); return; }
  if (action === "request-floor") runAction(requestFloor, "Запрос добавлен в очередь");
  if (action === "chair-activate") runAction(activateChairMicrophone, "Приоритетный микрофон председателя включён");
  if (action === "grant-floor") runAction(() => grantFloor(target.dataset.participantId), "Слово предоставлено");
  if (action === "release-floor") runAction(() => releaseFloor(target.dataset.participantId), "Микрофон отключён");
  if (action === "self-release") runAction(selfRelease, "Слово освобождено");
  if (action === "save-microphone-limit") runAction(saveMicrophoneLimit, "Лимит активных микрофонов обновлён");
  if (action === "toggle-fifo") runAction(toggleFifo, "Режим FIFO обновлён");
  if (action === "save-discussion-mode") runAction(saveDiscussionMode, "Режим дискуссии обновлён");
  if (action === "mute-all") runAction(muteAllMicrophones, "Все микрофоны выключены");
  if (action === "edit-agenda") openAgendaDialog({ editable: true });
  if (action === "view-agenda") openAgendaDialog();
  if (action === "close-conference") void (async () => {
    if (!["operator", "admin", "secretary"].includes(state.profile.role) || !can("conference.lifecycle") || state.meeting?.status !== "active") return;
    if (!await confirmDialog("Завершить конференцию для всех участников? Все подключения будут отключены.", "Завершить конференцию", "Отмена")) return;
    await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/close`, {});
    await exitClosedConference();
  })().catch((error) => notify(error.message));
  if (action === "pause-conference" || action === "resume-conference") runAction(async () => {
    if (!["chair", "secretary", "admin"].includes(state.profile.role) || !can("conference.pause")) return;
    let details = {};
    if (action === "pause-conference") {
      const offset = new Date().getTimezoneOffset() * 60_000;
      const pauseUntilAt = new Date(Date.now() + 15 * 60_000 - offset).toISOString().slice(0, 16);
      const min = new Date(Date.now() - offset).toISOString().slice(0, 16);
      const form = await httpForm("Пауза конференции · продолжение только вручную", [
        { name: "pauseUntilAt", label: "Ориентировочно до", type: "datetime-local", value: pauseUntilAt, min },
        { name: "pauseComment", label: "Сообщение для вывески", value: "Перерыв", maxLength: 160 }
      ], "Поставить на паузу");
      if (!form) return;
      details = { pauseUntilAt: new Date(form.pauseUntilAt).toISOString(), pauseComment: form.pauseComment.trim() };
      if (Date.parse(details.pauseUntilAt) <= Date.now()) throw new Error("Укажите будущее время окончания паузы");
    }
    await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/${action === "pause-conference" ? "pause" : "resume"}`, details);
    await refreshAll(true);
  }, action === "pause-conference" ? "Конференция на паузе" : "Конференция продолжена");
  if (action === "activate-agenda") runAction(() => activateAgenda(target.dataset.agendaId), "Активная тема изменена");
  if (action === "reveal-access-pin") runAction(revealAccessPin);
  if (action === "edit-access-pin") runAction(editAccessPin, "ПИН конференции изменён");
  if (action === "change-participant-role") runAction(() => changeParticipantRole(target.dataset.participantId, target.dataset.currentRole), "Роль участника изменена");
  if (action === "toggle-incoming-audio") runAction(() => toggleIncomingAudio(target.dataset.participantId, target.dataset.enabled === "true"), "Входящий Mix-minus обновлён");
  if (action === "remove-participant") {
    confirmRemoveParticipant(target.dataset.participantId, target.dataset.participantName);
  }
  if (action === "toggle-participant-video") runAction(toggleParticipantVideo, hasLocalVideo() ? "Камера отключена" : "Камера опубликована");
  if (action === "register-system-camera") runAction(registerSystemCamera, "Системная камера добавлена");
  if (action === "edit-stream") runAction(() => editStream(target.dataset.streamId), "Источник обновлён");
  if (action === "toggle-pgm-tile") runAction(() => state.api.patch(`/streams/${encodeURIComponent(target.dataset.streamId)}`,
    { pgmTileEnabled: target.dataset.enabled !== "true" }), target.dataset.enabled === "true" ? "Источник исключён из плиток PGM" : "Источник возвращён в плитки PGM");
  if (action === "delete-stream") runAction(() => deleteStream(target.dataset.streamId), "Источник удалён");
  if (action === "select-stream") runAction(() => selectStream(target.dataset.streamId));
  if (action === "preview-stream") runAction(() => openStreamPreviewModal(target.dataset.streamId));
  if (action === "close-stream-preview") runAction(() => closeStreamPreviewModal());
  if (action === "refresh-media-runtime") runAction(refreshMediaRuntime, "Состояние runtime обновлено");
  if (action === "refresh-media-devices") runAction(async () => {
    await refreshMediaDevices(true);
    renderPage();
  }, "Список AV-устройств обновлён");
  if (action === "discover-onvif") runAction(discoverOnvifCameras);
  if (action === "add-onvif-camera") runAction(addOnvifCamera, "Камера добавлена в каталог");
  if (action === "probe-camera") runAction(() => probeCamera(target.dataset.cameraId));
  if (action === "attach-camera") runAction(() => attachCamera(target.dataset.cameraId), "Камера добавлена в заседание");
  if (action === "toggle-camera-auto-attach") runAction(() => toggleCameraAutoAttach(target.dataset.cameraId, target.dataset.enabled === "true"));
  if (action === "delete-camera") runAction(() => deleteCamera(target.dataset.cameraId), "Системная камера удалена");
  if (action === "start-media-worker") runAction(() => startMediaWorker(target.dataset.streamId), "HLS Media Worker запущен");
  if (action === "start-multicast") runAction(() => startMulticast(target.dataset.streamId));
  if (action === "route-preview") runAction(() => routePreview(target.dataset.streamId), "Источник направлен в Preview");
  if (action === "take-program") runAction(() => takeProgram("cut"), "CUT выполнен");
  if (action === "fade-program") runAction(() => takeProgram("fade"), "FADE выполнен");
  if (action === "resume-auto-director") runAction(resumeAutoDirector, "Автоматическое управление PGM восстановлено");
  if (action === "discover-ndi") runAction(discoverNdiSources);
  if (action === "toggle-source-mute") runAction(async () => {
    state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, {
      sourceMute: { streamId: target.dataset.streamId, muted: target.dataset.muted !== "true" }
    });
  }, target.dataset.muted === "true" ? "Аудио источника включено" : "Аудио источника заглушено");
  if (action === "save-ndi-camera") runAction(() => saveNdiCamera(target.dataset.ndiId));
  if (action === "receive-ndi") runAction(() => receiveNdiSource(target.dataset.ndiId), "Приём NDI → HLS запущен");
  if (action === "receive-ndi-stream") runAction(() => receiveNdiStream(target.dataset.streamId), "Приём NDI → HLS запущен");
  if (action === "configure-ndi-output") runAction(() => configureNdiOutput(target.dataset.outputId));
  if (action === "toggle-ndi-output") runAction(() => toggleNdiOutput(target.dataset.outputId, target.dataset.enabled === "true"));
  if (action === "start-ndi-output") runAction(() => startNdiOutput(target.dataset.outputId), "NDI-выход запущен");
  if (action === "stop-ndi-job") runAction(() => stopNdiJob(target.dataset.jobId), "NDI job остановлен");
  if (action === "toggle-auto-director") runAction(toggleAutoDirector, "Режим автодиректора изменён");
  if (action === "save-pgm-mode") runAction(savePgmMode, "Режим PGM оператора применён");
  if (action === "select-pgm-slate") runAction(() => selectPgmSlate(target.dataset.slateId), "Заставка выбрана");
  if (action === "delete-pgm-slate") runAction(() => deletePgmSlate(target.dataset.slateId, target.dataset.slateName), "Заставка удалена");
  if (action === "reset-pgm-mode") runAction(resetPgmMode, "Действует режим PGM администратора");
  if (action === "create-vote") runAction(createVote, "Голосование создано");
  if (action === "import-archive-document") runAction(importArchivedDocument, "Документ скопирован из архива в личные материалы");
  if (action === "configure-vote-result") runAction(async () => {
    const vote = state.votes.find((item) => item.id === target.dataset.voteId);
    if (!vote) throw new Error("Голосование не найдено");
    const values = await httpForm("Показ итогов голосования", [
      {name:"resultTarget",label:"Направление",type:"select",value:vote.displayPolicy?.resultTarget ?? "none",options:[
        {value:"none",label:"Не отправлять в PGM"},{value:"tiles",label:"Плиткой в PGM"},{value:"program",label:"Во весь PGM"}]},
      {name:"resultHoldSeconds",label:"Время показа после появления в эфире, сек.",type:"number",value:vote.displayPolicy?.resultHoldSeconds ?? 30}
    ], "Сохранить");
    if (values) await state.api.patch(`/votes/${encodeURIComponent(vote.id)}`, { displayPolicy: {
      resultTarget: values.resultTarget, resultHoldSeconds: Number(values.resultHoldSeconds) } });
  }, "Показ итогов настроен");
  if (action === "delete-vote") runAction(async () => {
    if (!await confirmDialog("Удалить проект голосования?", "Удалить", "Отмена")) return;
    await state.api.delete(`/votes/${target.dataset.voteId}`);
  }, "Проект голосования удалён");
  if (action === "open-vote") runAction(() => state.api.post(`/votes/${target.dataset.voteId}/open`, { durationSeconds: Number(document.querySelector(`[data-vote-duration="${target.dataset.voteId}"]`)?.value || 60) }));
  if (action === "close-vote") runAction(() => state.api.post(`/votes/${target.dataset.voteId}/close`));
  if (action === "cast-vote") runAction(() => castVote(target.dataset.voteId, target.dataset.optionId), "Голос принят");
  if (action === "cast-advanced-vote") runAction(() => castAdvancedVote(target.dataset.voteId), "Бюллетень принят");
  if (action === "next-vote-round") runAction(() => createNextVoteRound(target.dataset.voteId), "Следующий тур подготовлен");
  if (action === "open-voting-page") selectTab("voting").catch((error) => notify(error.message));
  if (action === "translate-select") runAction(async () => {
    await state.api.put(`/meetings/${state.profile.meetingId}/translate-core/listeners/${encodeURIComponent(state.participantId)}`, { channelId: target.dataset.channelId });
    await closeServerAudioSubscriber();
    await watchServerAudioMix();
  }, "Язык прослушивания изменён");
  if (action === "translate-configure") runAction(async () => {
    const current = (state.translateMeeting?.channels ?? []).map((item) => `${item.id}=${item.name}`).join("\n");
    const values = await httpForm("Языки конференции", [{ name: "channels", label: "Один канал на строку: код=название", type: "textarea", value: current }], "Применить");
    if (!values) return;
    const channels = String(values.channels ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [rawId, ...nameParts] = line.split("=");
      const id = rawId.trim().toLowerCase();
      const name = nameParts.join("=").trim() || id;
      return { id, name };
    });
    await state.api.put(`/meetings/${state.profile.meetingId}/translate-core`, { channels });
  }, "Языки конференции обновлены");
  if (action === "translate-enable-microphone") runAction(async () => { await ensureMicrophone(); await ensurePublishedMedia(); }, "Микрофон готов");
  if (action === "translate-state") runAction(async () => {
    if (target.dataset.onAir === "true") { await ensureMicrophone(); await ensurePublishedMedia(); }
    return state.api.patch(`/meetings/${state.profile.meetingId}/translate-core/interpreters/${encodeURIComponent(state.participantId)}/state`, { onAir: target.dataset.onAir === "true" });
  });
  if (action === "translate-direction") runAction(() => state.api.patch(`/meetings/${state.profile.meetingId}/translate-core/interpreters/${encodeURIComponent(state.participantId)}/state`, { direction: target.dataset.direction }), "Направление перевода изменено");
  if (action === "translate-cough") runAction(() => state.api.patch(`/meetings/${state.profile.meetingId}/translate-core/interpreters/${encodeURIComponent(state.participantId)}/state`, { cough: target.dataset.cough === "true" }), "Состояние микрофона перевода изменено");
  if (action === "translate-talkback") runAction(() => state.api.patch(`/meetings/${state.profile.meetingId}/translate-core/interpreters/${encodeURIComponent(state.participantId)}/state`, { talkback: target.dataset.talkback === "true" }), "Служебная связь изменена");
  if (action === "translate-assign") runAction(async () => {
    const row = target.closest("[data-translation-participant]");
    const channelId = row.querySelector("[data-translation-channel]").value;
    if (!channelId) throw new Error("Выберите язык перевода");
    await state.api.put(`/meetings/${state.profile.meetingId}/translate-core/interpreters/${encodeURIComponent(target.dataset.participantId)}`, { channelId, sourceChannelId: row.querySelector("[data-translation-source]").value, sourceLanguageCode: row.querySelector("[data-translation-source-language]").value, direction: row.querySelector("[data-translation-direction]").value, priority: row.querySelector("[data-translation-priority]").value });
  }, "Переводчик назначен");
  if (action === "open-vote-results") openVoteResultsModal(target.dataset.voteId);
  if (action === "create-presentation") runAction(() => state.api.post(`/meetings/${state.profile.meetingId}/presentations`, { documentId: target.dataset.documentId, title: target.dataset.fileName }), "Презентация создана");
  if (action === "download-document") runAction(() => openDocument(target.dataset.documentId));
  if (action === "delete-own-document") void (async () => {
    const document = state.documents.find((item) => item.id === target.dataset.documentId);
    if (!document || document.uploadedBy !== state.profile.userId || document.agendaItemId) return;
    if (!await confirmDialog(`Удалить документ «${document.fileName}» и его черновые пометки?`, "Удалить", "Отмена")) return;
    await runAction(async () => {
      await state.api.delete(`/documents/${encodeURIComponent(document.id)}`);
      state.documents = state.documents.filter((item) => item.id !== document.id);
      renderPage();
    }, "Документ удалён");
  })();
  if (action === "start-presentation") runAction(() => startPresentationBroadcast(target.dataset.presentationId));
  if (action === "share-screen") runAction(shareScreen);
  if (action === "stop-screen-share") runAction(stopScreenShare);
  if (action === "open-presentation-document") runAction(() => openDocument(target.dataset.documentId, target.dataset.presentationId));
  if (action === "next-page") runAction(() => state.api.post(`/presentations/${target.dataset.presentationId}/page`, { page: Number(target.dataset.page) }));
  if (action === "stop-presentation") runAction(async () => {
    await state.api.post(`/presentations/${target.dataset.presentationId}/stop`);
    closeDocumentViewer();
  });
  if (action === "open-chat") runAction(() => openChat(target.dataset.participantId));
  if (action === "select-chat") { state.activeChatId = target.dataset.sessionId; markChatRead(state.activeChatId); renderPage(); }
  if (action === "check-readiness") runAction(checkReadiness, "Проверка готовности завершена");
  if (action === "check-device") runAction(() => checkDevice(target.dataset.deviceId), "Health-check выполнен");
  if (action === "device-command") runAction(() => deviceCommand(target.dataset.deviceId), "Команда выполнена");
  if (action === "publish-room-free") runAction(() => publishRoom("free"), "Статус опубликован");
  if (action === "publish-room-busy") runAction(() => publishRoom("busy"), "Статус опубликован");
  if (action === "call-participant") runAction(callParticipant, "Вызов отправлен на вывески");
  if (action === "edit-live-roster") runAction(editLiveRoster, "Состав обновлён");
  if (action === "report-up") runAction(() => moveLiveReport(target.dataset.presenterId, -1), "Очередь обновлена");
  if (action === "report-down") runAction(() => moveLiveReport(target.dataset.presenterId, 1), "Очередь обновлена");
  if (action === "presenter-workplace") runAction(() => assignPresenterWorkplace(target.dataset.presenterId), "Место докладчика назначено");
  if (["presenter-call", "presenter-confirm", "presenter-finish"].includes(action)) {
    const operation = action.slice("presenter-".length);
    const labels = { call: "Докладчик вызван", confirm: "Рабочее место подключается", finish: "Доклад завершён" };
    runAction(() => state.api.post(`/meetings/${state.profile.meetingId}/presenters/${encodeURIComponent(target.dataset.presenterId)}/${operation}`), labels[operation]);
  }
  if (action === "start-aes67") runAction(startAes67, "AES67 / RTP L24 включён");
  if (action === "stop-aes67") runAction(stopAes67, "AES67 / RTP L24 выключен");
  if (action === "service-request") runAction(createServiceRequest, "Запрос передан персоналу");
  if (action === "change-room-seat") runAction(() => offerRoomStation({ force: true }));
  if (action === "service-status") runAction(() => serviceStatus(target.dataset.requestId, target.dataset.status));
  if (action === "assign-seat") runAction(() => assignSeat(target.dataset.seatId));
  if (action === "release-seat") runAction(() => releaseSeat(target.dataset.seatId), "Место освобождено");
  if (action === "claim-seat") runAction(claimSeat, "Временная сессия активирована");
  if (action === "install-pwa") installPwa();
  if (action === "toggle-auto-camera-pref") toggleLocalMediaPreference(CAMERA_AUTO_KEY);
  if (action === "toggle-auto-microphone-pref") toggleLocalMediaPreference(MICROPHONE_AUTO_KEY);
  if (action === "toggle-fullscreen") toggleFullscreen();
});

$("#cameraToggleBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled) return;
  const published = hasLocalVideo() && state.publishedStream;
  button.disabled = true;
  try {
    await runAction(published ? stopCamera : startPublishing,
      published ? "Камера выключена" : "Камера опубликована");
  } finally {
    button.disabled = false;
    renderFixedControls();
  }
});

$("#mediaAccessBtn")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await enableLocalAv();
    notify("Камера и микрофон готовы", 3000);
  } catch (error) {
    state.mediaPermissionPending = true;
    notify(`Не удалось открыть AV-устройства: ${error.message}`, 7000);
  } finally {
    button.disabled = false;
    renderFixedControls();
  }
});

$("#microphoneDock").addEventListener("click", (event) => {
  if (event.target.closest('[data-action="secretary-toggle-recording"]')) {
    runAction(() => state.api.put(`/meetings/${state.profile.meetingId}/recording`,
      { enabled: !state.recordingStatus?.enabled }), "Режим записи обновлён");
    return;
  }
  handleMicrophoneAction(event.target.closest("[data-mic-action]"))
    .catch((error) => notify(error.message));
});

window.addEventListener("beforeinstallprompt", (event) => {
  // Chrome reports that its automatic banner was deferred. That console
  // message is informational: installation is deliberately offered from the
  // Settings action so it only opens after a user gesture.
  event.preventDefault();
  state.installPrompt = event;
  $$('[data-action="install-pwa"]').forEach((button) => { button.hidden = false; });
});

document.addEventListener("fullscreenchange", () => {
  if (state.activeTab === "settings") renderPage();
});

window.addEventListener("beforeunload", () => {
  clearTimers();
  for (const entry of state.mcuPublishers.values()) entry.transport.close();
  for (const entry of state.mcuSubscribers.values()) entry.transport.close();
  state.localMedia?.getTracks().forEach((track) => track.stop());
  state.contentMedia?.getTracks().forEach((track) => track.stop());
});

window.addEventListener("pagehide", () => {
  if (!state.api || !state.participantId) return;
  state.api.request(`/meetings/${state.profile.meetingId}/participants/${state.participantId}/presence`, {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presenceId: PRESENCE_ID, connected: false })
  }).catch(() => {});
});
window.addEventListener("pageshow", () => scheduleVideoRecovery("pageshow"));
document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleVideoRecovery("pageshow"); });

document.addEventListener("pointerdown", () => {
  if (state.audioContext?.state === "suspended") {
    state.audioContext.resume().then(updateAudioUnlock).catch(updateAudioUnlock);
  }
  if (state.serverAudioElement?.paused) state.serverAudioElement.play().then(updateAudioUnlock).catch(updateAudioUnlock);
}, { passive: true });

$("#enableAudioBtn").addEventListener("click", () => {
  state.audioContext?.resume().then(updateAudioUnlock).catch(() => notify("Не удалось включить звук. Проверьте разрешения браузера."));
  state.serverAudioElement?.play().then(updateAudioUnlock).catch(() => notify("Не удалось включить звук. Проверьте разрешения браузера."));
});
$("#headphonesReadyBtn").addEventListener("click", () => {
  state.headphonesReady = true;
  sessionStorage.setItem("edge-s-headphones-ready", "1");
  updateHeadphoneWarning();
  ensureAudioContext().then(() => watchServerAudioMix()).catch(() => {});
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "/client/" }).catch(() => {});
}

loadMediaDevicePreferences();
async function bootstrapClient() {
  let hasSession = false;
  try {
    hasSession = Boolean(sessionStorage.getItem(HANDOFF_KEY)
      || localStorage.getItem(HANDOFF_KEY)
      || localStorage.getItem(SESSION_KEY));
  } catch (_) {
    // Storage may be disabled; preserve the normal login redirect.
  }
  if (!hasSession) {
    location.replace("/conference/");
    return;
  }
  try {
    const languageResponse = await fetch("/api/v1/language-settings", { cache: "no-store" });
    if (languageResponse.ok) configureParticipantLanguages(await languageResponse.json());
    await loadFeatureModules();
    updateHeadphoneWarning();
    if (await consumeConferenceHandoff()) return;
  } catch (error) {
    connectError(`Не удалось войти: ${error.message}`);
    return;
  }
  if (await restoreActiveSession()) return;
  location.replace("/conference/");
}
bootstrapClient().catch((error) => connectError(`Ошибка запуска: ${error.message}`));
$("#secureWarning").hidden = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";

navigator.mediaDevices?.addEventListener?.("devicechange", () => {
  updateHeadphoneWarning();
  refreshMediaDevices().then(() => {
    if (state.activeTab === "streams") renderPage();
  }).catch(() => {});
});
