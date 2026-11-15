import { encodeIdentityHeader } from "./identityEncoding.js";
import { observeBottomControls } from "./dockLayout.js";
import { serviceRequestCategoryLabel, serviceRequestStatusLabel,
  serviceRequestCategoryOptions, serviceRequestProgress } from "./serviceRequestLocale.js";
import { eventRetryDelay } from "./eventConnection.js";
import { roomSeatScheme, roomSeatDialog } from "./roomSeatScheme.js";
import { clientBuildReady } from "./clientBuild.js";
import { PARTICIPANT_LANGUAGES, participantLanguageOptions, configureParticipantLanguages,
  participantLanguage, setParticipantLanguage, applyParticipantLanguage,
  participantText, participantFormatTime } from "./i18n.js";
import { openDocumentViewer, closeDocumentViewer, expandPresentationViewer, closePresentationViewer,
  updateDocumentViewerRights, documentSceneEvent, isPresentationViewerOpen } from "./documentViewer.js";
import { createWaitingRoom } from "./waitingRoom.js";

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
  isLiveChatSession, closeChatSessionLocally, reconcileChatSessions, chatHtml, requestItemsText, operationsHtml, settingsHtml, updateSignagePreviews, updateSecretaryWorkspace, refreshVoteResultsModal, ucControlHtml, toggleUcPreviewListen, playUcTestTone, inMcu,
  runAction, requestFloor, applyLocalFloorResult, runMicrophoneAction, activateChairMicrophone, grantFloor, releaseFloor, toggleUcMute, declineUcFloor, decideUcShare, toggleUcTalkback, setUcMemberMute, bindUcMember,
  connectPlannedUc, connectLiveUc, disconnectUc, startPreparedConference, selfRelease,
  saveMicrophoneLimit, toggleFifo, saveDiscussionMode, toggleChairPriority, muteAllMicrophones, activateAgenda, revealAccessPin, editAccessPin,
  changeParticipantRole, toggleIncomingAudio, removeParticipant, confirmRemoveParticipant, ensureMicrophone, syncLocalMicrophone, startCamera, stopCamera,
  startPublishing, ensurePublishedMedia, registerSystemCamera, editStream, deleteStream, deleteCamera, refreshMediaRuntime, discoverOnvifCameras,
  addOnvifCamera, quickProbeCamera, probeCamera, attachCamera, startMediaWorker, startMulticast, routePreview, takeProgram,
  resumeAutoDirector, discoverNdiSources, attachNdiSource, saveNdiCamera, toggleCameraAutoAttach, receiveNdiSource, receiveNdiStream, toggleNdiOutput,
  configureNdiOutput, startNdiOutput, stopNdiJob, toggleAutoDirector, savePgmMode, resetPgmMode, syncFaceFraming, selectStream, ensureStreamPreview,
  mediaForStream, getMcuDevice, createMcuTransport, publishMediaToMcu, closeMcuTransport, closeMcuPublisher, subscribeMcuStream, closeProgramSubscriberEntry,
  RECEIVE_DISCONNECTED_GRACE_MS, observeReceiveTransport, subscriptionHealthy, inboundProgramVideoCounters, checkProgramVideoHealth, closeProgramSubscriber, waitForVideoFrame, watchProgramStream,
  closeMcuSubscriber, watchClientStream, reconcileSelectedStream, pollSignaling, closeViewerStream, pruneUnusedViewerPeers, ensureAudioContext, updateAudioUnlock,
  mobileAudioEndpoint, updateHeadphoneWarning, attachAudioMixInput, detachAudioMixInput, syncConferenceAudio, reconcileServerAudioMix, watchServerAudioMix, closeServerAudioSubscriber,
  closeAllPeers, bindChatChannel, newChatPeer, startChatOffer, openChat, pollChatSignaling, sendChatMessage, closeAllChats,
  checkReadiness, checkDevice, deviceCommand, publishRoom, publishSignageScene, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, serviceReassign, serviceConfirm, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote, castAdvancedVote,
  createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument, openDocument, startPresentationBroadcast, shareScreen, stopScreenShare,
  installPwa, toggleFullscreen, httpForm, voteElectorateCandidates, voteCreationForm, formatAgendaTime, agendaTimeline, agendaStatusHtml, openAgendaDialog, confirmDialog, editLiveRoster, moveLiveReport, offerRoomStation;
let featureModulesPromise = null;
let roomControlEvents = null;
let pushRoomControlState = null;
let pushRoomControlPage = null;
function meetingControlPanelId(meetingId) {
  const key = `vox-control-panel:meeting:${meetingId}`;
  const id = sessionStorage.getItem(key) ?? `panel_${uuid().replaceAll("-", "")}`;
  sessionStorage.setItem(key, id);
  return id;
}
async function loadFeatureModules() {
  if (!featureModulesPromise) featureModulesPromise = Promise.all([
    import("./clientViews.js?v=0.8.26"), import("./clientOperations.js?v=0.8.26"), import("./roomControlEvents.js?v=0.8.26")
  ]).then(([views, operations, controls]) => {
    roomControlEvents = controls.createRoomControlEvents($("#pageContent"), () => state, notify, (pageId, action = "navigate") => {
      const project = state.roomControl;
      if (action === "popup-close") {
        state.roomControlPopupId = null;
        if (state.activeTab === "roomcontrol") renderPage();
        return;
      }
      const page = project?.panel.pages?.find((entry) => entry.id === pageId);
      if (!page) return;
      if (action === "popup-open" && page.type === "popup") state.roomControlPopupId = pageId;
      else if (action === "popup-toggle" && page.type === "popup") {
        state.roomControlPopupId = state.roomControlPopupId === pageId ? null : pageId;
      }
      else if (action === "navigate") {
        state.roomControlPageId = pageId;
        sessionStorage.setItem(`vox-control-page:${state.profile.meetingId}:${project.roomId}:${project.version}`, pageId);
      }
      if (state.activeTab === "roomcontrol") renderPage();
    });
    pushRoomControlState = (payload) => controls.applyRoomControlPush(state, payload);
    pushRoomControlPage = (payload) => {
      if (!state.roomControl || payload?.panelId !== state.roomControlPanelId ||
          payload.roomId !== state.roomControl.roomId || payload.version !== state.roomControl.version ||
          !payload.navigation?.id) return;
      const key = `vox-control-navigation:${state.roomControlPanelId}`;
      if (sessionStorage.getItem(key) === payload.navigation.id) return;
      sessionStorage.setItem(key, payload.navigation.id);
      if (payload.navigation.type === "popup-open" || payload.navigation.type === "popup-close") {
        state.roomControlPopupId = payload.navigation.type === "popup-open" ? payload.navigation.popupId : null;
        if (state.activeTab === "roomcontrol") renderPage();
        return;
      }
      if (!state.roomControl.panel.pages?.some((page) => page.id === payload.navigation.pageId)) return;
      state.roomControlPageId = payload.navigation.pageId;
      sessionStorage.setItem(`vox-control-page:${state.profile.meetingId}:${state.roomControl.roomId}:${state.roomControl.version}`,
        state.roomControlPageId);
      if (state.activeTab === "roomcontrol") renderPage();
    };
    canEditWorkspaceLayout = views.canEditWorkspaceLayout;
    handleWorkspaceUiAction = views.handleWorkspaceUiAction;
    applyWorkspaceLayout = views.applyWorkspaceLayout;
    renderPage = views.renderPage;
    ucControlHtml = views.ucControlHtml;
    toggleUcPreviewListen = views.toggleUcPreviewListen;
    playUcTestTone = views.playUcTestTone;
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
    updateSignagePreviews = views.updateSignagePreviews;
    updateSecretaryWorkspace = views.updateSecretaryWorkspace;
    refreshVoteResultsModal = views.refreshVoteResultsModal;
    inMcu = operations.inMcu;
    runAction = operations.runAction;
    requestFloor = operations.requestFloor;
    applyLocalFloorResult = operations.applyLocalFloorResult;
    runMicrophoneAction = operations.runMicrophoneAction;
    activateChairMicrophone = operations.activateChairMicrophone;
    grantFloor = operations.grantFloor;
    releaseFloor = operations.releaseFloor;
    toggleUcMute = operations.toggleUcMute;
    declineUcFloor = operations.declineUcFloor;
    decideUcShare = operations.decideUcShare;
    toggleUcTalkback = operations.toggleUcTalkback;
    setUcMemberMute = operations.setUcMemberMute;
    bindUcMember = operations.bindUcMember;
    connectPlannedUc = operations.connectPlannedUc;
    connectLiveUc = operations.connectLiveUc;
    disconnectUc = operations.disconnectUc;
    startPreparedConference = operations.startPreparedConference;
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
    syncFaceFraming = operations.syncFaceFraming;
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
    publishSignageScene = operations.publishSignageScene;
    callParticipant = operations.callParticipant;
    startAes67 = operations.startAes67;
    stopAes67 = operations.stopAes67;
    createServiceRequest = operations.createServiceRequest;
    serviceStatus = operations.serviceStatus;
    serviceReassign = operations.serviceReassign;
    serviceConfirm = operations.serviceConfirm;
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
    httpForm = operations.httpForm;
    voteElectorateCandidates = operations.voteElectorateCandidates;
    voteCreationForm = operations.voteCreationForm;
    formatAgendaTime = operations.formatAgendaTime;
    agendaTimeline = operations.agendaTimeline;
    agendaStatusHtml = operations.agendaStatusHtml;
    openAgendaDialog = operations.openAgendaDialog;
    confirmDialog = operations.confirmDialog;
    editLiveRoster = operations.editLiveRoster;
    moveLiveReport = operations.moveLiveReport;
    offerRoomStation = operations.offerRoomStation;
  });
  return featureModulesPromise;
}

export {
  $, $$, uuid, sleep, SESSION_KEY, HANDOFF_KEY, AUTH_TOKEN_KEY, CAMERA_AUTO_KEY, MICROPHONE_AUTO_KEY,
  MEDIA_DEVICE_KEY, TRANSLATION_VOLUME_KEY, CLIENT_BUILD, interfaceLocale, uiText, BUILD_RELOAD_KEY, TECHNICAL_CONFERENCE_ROLES, CONFERENCE_ROLE_LABELS,
  TAB_TITLES, SECRETARY_LAYOUT_DEFAULT, TAB_ID_KEY, THUMBNAIL_FPS, RESOURCE_CONSTRAINED_CLIENT, THUMBNAIL_DECODE_BUDGET, PRESENCE_ID, TAB_ID,
  state, EdgeHttpError, EdgeApi, escapeHtml, formatBytes, openModal, mediaAccessError, withActionBusy, rememberFormDraft, forgetFormDrafts, restoreFormDrafts, formDraftKey, saveProfile, loadMediaDevicePreferences, saveMediaDevicePreferences,
  refreshMediaDevices, deviceConstraint, mediaDeviceOptions, applyAudioOutputSelection, changeMediaDevice, saveActiveSession, clearActiveSession, enterApplication,
  voteStorageKey, loadVoteSelections, saveVoteSelections, connectError, notify, httpForm, voteElectorateCandidates, voteCreationForm,
  formatAgendaTime, agendaTimeline, agendaStatusHtml, openAgendaDialog, confirmDialog, roomSeatScheme, offerRoomStation, maybeOfferRoomStation,
  connectWithProfile, consumeConferenceHandoff, autoPublishOwnCamera, queryCapturePermission, installLocalVideoTrack, isAppleMobile, scheduleVideoRecovery, recoverSuspendedVideo,
  enableLocalAv, toggleParticipantVideo, toggleLocalMediaPreference, hasLocalVideo, restoreActiveSession, startTimers, clearTimers, schedulePushRefresh,
  refreshFloorState, updateSourceWallFloorState, applyAudioMeters, updateTranslationMeters, setEventConnectionStatus, startEventStream, refreshProgram, refreshAll, updateBuildLabels,
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
  runAction, requestFloor, applyLocalFloorResult, runMicrophoneAction, activateChairMicrophone, grantFloor, releaseFloor, toggleUcMute, selfRelease,
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
  checkReadiness, checkDevice, deviceCommand, publishRoom, publishSignageScene, callParticipant, startAes67, stopAes67, createServiceRequest,
  serviceStatus, serviceReassign, assignSeat, assignPresenterWorkplace, releaseSeat, claimSeat, createVote, castVote, castAdvancedVote,
  createNextVoteRound, uploadDocument, importArchivedDocument, uploadAgendaDocument, openDocument, startPresentationBroadcast, shareScreen, stopScreenShare,
  installPwa, toggleFullscreen, encodeIdentityHeader, observeBottomControls, serviceRequestCategoryLabel, serviceRequestStatusLabel, serviceRequestCategoryOptions, serviceRequestProgress, eventRetryDelay,
  PARTICIPANT_LANGUAGES, participantLanguageOptions, participantLanguage, setParticipantLanguage, participantText, participantFormatTime, openDocumentViewer, closeDocumentViewer, expandPresentationViewer, closePresentationViewer, updateDocumentViewerRights,
  documentSceneEvent
};

observeBottomControls();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
// crypto.randomUUID() exists only in a secure context. Plain HTTP must still
// load the module far enough to show the HTTPS warning below.
function uuid() {
  if (typeof crypto?.randomUUID === "function") {
    try { return crypto.randomUUID(); } catch (_) { /* insecure context */ }
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
{
  const secureWarning = document.getElementById("secureWarning");
  if (secureWarning) secureWarning.hidden = window.isSecureContext || ["localhost", "127.0.0.1"].includes(location.hostname);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SESSION_KEY = "edge-s-active-session-v0.6";
const HANDOFF_KEY = "edge-conference-handoff-v1";
const AUTH_TOKEN_KEY = "edge-s-account-token";
const QUICK_RESUME_KEY = "edge-s-quick-device-session-v1";
const CAMERA_AUTO_KEY = "edge-s-auto-camera";
const MICROPHONE_AUTO_KEY = "edge-s-auto-microphone";
const MEDIA_DEVICE_KEY = "edge-s-media-devices-v0.5";
const TRANSLATION_VOLUME_KEY = "edge-s-translation-volume";
// The build is the ?v= of this module URL, i.e. the one index.html requested.
// A single place (index.html) is bumped by the release; no second constant drifts.
const CLIENT_BUILD = new URL(import.meta.url).searchParams.get("v") || null;
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
const MEETING_STATE_LABELS = { active: "Идёт", ready: "Подготовлена", draft: "Черновик", scheduled: "Запланирована",
  closed: "Завершена", archived: "В архиве" };
const TAB_TITLES = { conference: "Конференция", streams: "Камеры и потоки", voting: "Голосование", content: "Материалы", translation: "Синхроперевод", chat: "Чат", operations: "Сервис", roomcontrol: "Управление залом", settings: "Настройки" };
const SECRETARY_LAYOUT_DEFAULT = Object.freeze({
  order: ["program", "channels", "queue", "speakers", "protocol"],
  panels: { program: { width: 7, height: 350 }, channels: { width: 5, height: 220 },
    queue: { width: 4, height: 200 }, speakers: { width: 4, height: 260 },
    protocol: { width: 4, height: 400 } }
});
const TAB_ID_KEY = "edge-s-tab-id";
// Shared thumbnail paint timer; subscribed WebRTC tracks keep decoding.
const THUMBNAIL_FPS = 8;
const RESOURCE_CONSTRAINED_CLIENT = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const THUMBNAIL_DECODE_BUDGET = RESOURCE_CONSTRAINED_CLIENT ? 2 : 6;
// Unique per loaded document: an old pagehide cannot disconnect its replacement.
const PRESENCE_ID = uuid();
// A per-tab ID prevents another tab's saved session from being disconnected.
const TAB_ID = (() => {
  let id;
  try { id = sessionStorage.getItem(TAB_ID_KEY); } catch (_) { id = null; }
  if (!id) {
    id = uuid();
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
  productLicense: null,
  roomSeatPromptOpen: false,
  roomSeatDismissed: false,
  streams: [],
  ucSessions: [],
  ucControl: null,
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
  signageForm: { playerIds: [], type: "text", title: "", body: "", documentId: "" },
  aes67: null,
  serviceRequests: [],
  serviceAssignees: [],
  serviceRoomPlan: null,
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
  translationAudioMeters: new Map(),
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
  cameraSetupDismissed: false,
  pgmSlates: { selectedSlateId: null, items: [] },
  slatePreviewUrls: new Map(),
  lastOpenVoteId: null,
  lastRenderKey: null,
  formDrafts: new Map(),
  busyActions: new Set(),
  actionTrigger: null
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
        const saved = JSON.parse(localStorage.getItem(QUICK_RESUME_KEY) || "null");
        if (saved?.meetingId === profile.meetingId && saved.userId === profile.userId &&
            saved.deviceId === profile.deviceId) this.authToken = saved.authToken || "";
      } catch (_) {}
    }
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

// getUserMedia errors are browser-specific English strings; turn them into
// what happened and what to do, with the iPadOS settings path (A-05).
function mediaAccessError(error, kind = "av") {
  if (error?.mediaAccessTranslated) return error;
  const name = error?.name ?? "";
  const subject = { camera: "камере", microphone: "микрофону", av: "камере и микрофону" }[kind] ?? "камере и микрофону";
  const device = { camera: ["Камера", "не найдена", "занята"], microphone: ["Микрофон", "не найден", "занят"],
    av: ["Камера или микрофон", "не найдены", "заняты"] }[kind] ?? ["Камера или микрофон", "не найдены", "заняты"];
  let text = null;
  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)) {
    text = `Доступ к ${subject} запрещён. ` + (isAppleMobile()
      ? "На iPad откройте «Настройки» → Safari → «Камера» и «Микрофон», выберите «Разрешить» и обновите страницу."
      : "Разрешите доступ значком слева от адреса страницы и повторите.");
  } else if (["NotFoundError", "DevicesNotFoundError"].includes(name)) {
    text = `${device[0]} ${device[1]}. Подключите устройство и повторите.`;
  } else if (["NotReadableError", "TrackStartError"].includes(name)) {
    text = `${device[0]} ${device[2]} другим приложением. Закройте его и повторите.`;
  } else if (["OverconstrainedError", "ConstraintNotSatisfiedError"].includes(name)) {
    text = "Выбранное устройство недоступно. Выберите другое в разделе «Настройки» → «Камера и звук».";
  } else if (name === "AbortError") {
    text = "Браузер прервал открытие устройства. Повторите.";
  }
  const result = text ? new Error(text) : (error instanceof Error ? error : new Error(String(error ?? "")));
  result.mediaAccessTranslated = true;
  return result;
}

function actionKey(target) {
  return target ? JSON.stringify({ ...target.dataset }) : null;
}
// Marks the pressed control busy until its action settles. The key survives a
// re-render, so a freshly painted copy of the same button is also ignored (A-12).
async function withActionBusy(target, action) {
  const key = actionKey(target);
  if (key && state.busyActions.has(key)) return undefined;
  if (key) state.busyActions.add(key);
  const mark = (busy) => {
    for (const node of [target, ...$$("[data-action]")].filter((item) => item && actionKey(item) === key)) {
      if (busy) { node.setAttribute("aria-busy", "true"); node.dataset.busyLock = "1"; }
      else if (node.dataset.busyLock) { node.removeAttribute("aria-busy"); delete node.dataset.busyLock; }
    }
  };
  if (key) mark(true);
  try { return await action(); }
  finally { if (key) { state.busyActions.delete(key); mark(false); } }
}

// Typed but not yet applied values survive a re-render of the tab (A-02, A-22).
function formDraftKey(element) {
  if (!(element instanceof HTMLElement) || !element.matches("input, select, textarea")) return null;
  if (element.matches("[data-vote-duration]")) return `vote-duration:${element.dataset.voteDuration}`;
  if (["maxOpenMicrophones", "discussionMode", "queuePolicy"].includes(element.id)) return element.id;
  const ballot = element.closest("[data-ballot-vote]");
  if (ballot) {
    const attribute = ["ballotAllocation", "ballotRank", "ballotVeto", "ballotApproval"].find((name) => element.dataset[name] !== undefined);
    if (attribute) return `ballot:${ballot.dataset.ballotVote}:${attribute}:${element.dataset[attribute]}`;
  }
  const row = element.closest("[data-translation-participant]");
  if (row) {
    const attribute = ["translationSourceLanguage", "translationChannel", "translationSource", "translationDirection", "translationPriority"]
      .find((name) => element.dataset[name] !== undefined);
    if (attribute) return `translation:${row.dataset.translationParticipant}:${attribute}`;
  }
  return null;
}
function rememberFormDraft(element) {
  const key = formDraftKey(element);
  if (key) state.formDrafts.set(key, element.type === "checkbox" ? element.checked : element.value);
}
function forgetFormDrafts(prefix = null) {
  for (const key of [...state.formDrafts.keys()]) {
    if (prefix === null ? !key.startsWith("ballot:") : key === prefix || key.startsWith(`${prefix}:`)) state.formDrafts.delete(key);
  }
}
function restoreFormDrafts(root, focus = null) {
  for (const element of root.querySelectorAll("input, select, textarea")) {
    const key = formDraftKey(element);
    if (!key) continue;
    if (state.formDrafts.has(key)) {
      const value = state.formDrafts.get(key);
      if (element.type === "checkbox") element.checked = Boolean(value); else element.value = value;
    }
    if (focus?.key === key) {
      element.focus({ preventScroll: true });
      if (focus.start !== null && typeof element.setSelectionRange === "function") {
        try { element.setSelectionRange(focus.start, focus.end); } catch (_) { /* number inputs have no selection */ }
      }
    }
  }
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
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_RESUME_KEY) || "null");
    if (saved?.meetingId === state.profile.meetingId && saved.userId === state.profile.userId &&
        saved.deviceId === state.profile.deviceId) {
      localStorage.setItem(QUICK_RESUME_KEY, JSON.stringify({ ...saved, role: state.profile.role }));
    }
  } catch (_) {}
}

function clearActiveSession() {
  localStorage.removeItem(SESSION_KEY);
}

function enterApplication({ api, profile, leaseId, participantId }) {
  Object.assign(state, { api, profile, leaseId, participantId, roomSeatPromptOpen: false, roomSeatDismissed: false });
  state.translationAudioMeters.clear();
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
  void updateHeadphoneWarning?.();
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

const NOTICE_LIMIT = 3;
// Toasts stack instead of replacing each other: a later success never hides
// an earlier error, and every toast is announced by its own live role.
function notify(message, timeout = 5000, options = {}) {
  const stack = $("#notice");
  if (!stack) return;
  const locale = interfaceLocale();
  const raw = message instanceof Error ? message.message : message;
  const text = VoxNoticeLocale.localize(raw, locale);
  if (!text) return;
  const tone = message instanceof Error || options.tone === "error" ||
    /^(?:Не удалось|Ошибка|Недостаточно прав|Нет доступа)/u.test(text) ? "error" : "info";
  for (const existing of stack.querySelectorAll(".notice")) {
    if (existing.dataset.text === text) existing._dismiss?.(true);
  }
  const item = document.createElement("div");
  item.className = `notice notice-${tone}`;
  item.dataset.text = text;
  item.setAttribute("role", tone === "error" ? "alert" : "status");
  const closeLabel = locale === "en" ? "Dismiss notification" : "Закрыть уведомление";
  item.innerHTML = `<span></span>${options.action ? '<button type="button" class="button button-secondary notice-action"></button>' : ""}${options.secondaryAction ? '<button type="button" class="button button-secondary notice-action notice-action-secondary"></button>' : ""}<button type="button" class="notice-close" aria-label="${closeLabel}" title="${locale === "en" ? "Close" : "Закрыть"}">×</button>`;
  item.querySelector("span").textContent = text;
  const dismiss = (immediate = false) => {
    clearTimeout(item._timer);
    item.classList.remove("notice-visible");
    const remove = () => { item.remove(); if (!stack.querySelector(".notice")) stack.hidden = true; };
    if (immediate) remove(); else setTimeout(remove, 180);
  };
  item._dismiss = dismiss;
  item.querySelector(".notice-close").onclick = () => dismiss();
  if (options.action) {
    const action = item.querySelector(".notice-action");
    action.textContent = options.action.label;
    action.onclick = () => { dismiss(); options.action.onClick?.(); };
  }
  if (options.secondaryAction) {
    const action = item.querySelector(".notice-action-secondary");
    action.textContent = options.secondaryAction.label;
    action.onclick = () => { dismiss(); options.secondaryAction.onClick?.(); };
  }
  stack.hidden = false;
  stack.prepend(item);
  for (let overflow = stack.querySelectorAll(".notice").length - NOTICE_LIMIT; overflow > 0; overflow -= 1) {
    const older = [...stack.querySelectorAll(".notice")].reverse().filter((node) => node !== item);
    const victim = older.find((node) => node.classList.contains("notice-info")) ?? (tone === "error" ? older[0] : null);
    if (!victim) break;
    victim._dismiss(true);
  }
  requestAnimationFrame(() => item.classList.add("notice-visible"));
  item._timer = setTimeout(() => dismiss(), tone === "error" ? Math.max(timeout, 9000) : timeout);
}

// One modal contract for every client dialog: role/aria, focus moved inside,
// Tab kept inside, Esc closes the top dialog, focus returns to the opener.
const modalStack = [];
const FOCUSABLE_SELECTOR = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function openerSelector(element) {
  if (!(element instanceof HTMLElement) || element === document.body) return null;
  if (element.id) return `#${CSS.escape(element.id)}`;
  if (!element.dataset.action && !element.dataset.micAction) return null;
  return Object.entries(element.dataset).map(([key, value]) =>
    `[data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${CSS.escape(value)}"]`).join("") || null;
}
function openModal(dialog, { onEscape = null, label = "", initialFocus = null } = {}) {
  const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement : null;
  const entry = { dialog, onEscape, opener, openerSelector: openerSelector(opener), released: false };
  if (!dialog.getAttribute("role")) dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const heading = dialog.querySelector("h2, h3");
  if (heading && !dialog.hasAttribute("aria-label")) {
    heading.id ||= `dialog-title-${uuid().slice(0, 8)}`;
    dialog.setAttribute("aria-labelledby", heading.id);
  } else if (label && !dialog.hasAttribute("aria-label")) dialog.setAttribute("aria-label", label);
  if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
  modalStack.push(entry);
  document.body.classList.add("has-modal");
  const target = typeof initialFocus === "function" ? initialFocus() : initialFocus ??
    dialog.querySelector('[autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') ??
    dialog.querySelector(FOCUSABLE_SELECTOR);
  (target ?? dialog).focus({ preventScroll: true });
  return () => releaseModal(entry);
}
function releaseModal(entry) {
  if (entry.released) return;
  entry.released = true;
  const index = modalStack.indexOf(entry);
  if (index >= 0) modalStack.splice(index, 1);
  if (!modalStack.length) document.body.classList.remove("has-modal");
  const top = modalStack.at(-1);
  if (top) {
    if (!top.dialog.contains(document.activeElement)) (top.dialog.querySelector(FOCUSABLE_SELECTOR) ?? top.dialog).focus({ preventScroll: true });
    return;
  }
  const opener = entry.opener?.isConnected ? entry.opener
    : entry.openerSelector ? document.querySelector(entry.openerSelector) : null;
  opener?.focus?.({ preventScroll: true });
}
function topModal() {
  while (modalStack.length && !modalStack.at(-1).dialog.isConnected) releaseModal(modalStack.at(-1));
  return modalStack.at(-1) ?? null;
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "Tab") return;
  const top = topModal();
  if (!top) {
    if (event.key !== "Escape") return;
    // Dialogs that are not registered (legacy markup, room control popup).
    const legacy = [...document.querySelectorAll(".form-dialog-backdrop")].at(-1)?.querySelector("[data-dialog-close]") ??
      document.querySelector(".room-control-popup [data-room-control-popup-close]");
    if (legacy) { event.preventDefault(); legacy.click(); }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    top.onEscape?.();
    return;
  }
  const focusable = [...top.dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((node) => !node.closest("[hidden]") && node.getClientRects().length);
  if (!focusable.length) { event.preventDefault(); top.dialog.focus(); return; }
  const first = focusable[0]; const last = focusable.at(-1);
  if (!top.dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}, true);

async function maybeOfferRoomStation() { return offerRoomStation(); }

let waitingController = null;
function waitingRoom() {
  return waitingController ??= createWaitingRoom({ escapeHtml, openDocumentViewer, connectWithProfile, connectError,
    onConnected: () => { sessionStorage.removeItem(HANDOFF_KEY); localStorage.removeItem(HANDOFF_KEY); },
    onLeave: () => { sessionStorage.removeItem(HANDOFF_KEY); localStorage.removeItem(HANDOFF_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY); location.replace("/conference/"); } });
}

async function connectWithProfile(profile) {
  const api = new EdgeApi(profile);
  let lease;
  try {
    if (!await clientBuildReady(api, CLIENT_BUILD, BUILD_RELOAD_KEY)) return false;
    const meeting = await api.get(`/meetings/${encodeURIComponent(profile.meetingId)}`);
    if (meeting.status === "ready" && !["operator", "secretary", "admin"].includes(profile.role)) {
      await waitingRoom().show(profile, api, meeting);
      return false;
    }
    if (!["ready", "active"].includes(meeting.status)) throw new Error("Конференция не готова к входу");
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
    if (state.meeting?.status === "active") await autoPublishOwnCamera();
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
  if (profile.handoffCode) {
    // «Предварительный вход» from the service interface: a one-time code,
    // redeemed here for this window's own session token.
    sessionStorage.removeItem(HANDOFF_KEY);
    localStorage.removeItem(HANDOFF_KEY);
    const response = await fetch("/api/v1/auth/conference-handoff/redeem", { method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: profile.handoffCode }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message ?? `Ошибка ${response.status}`);
    if (body.meetingId !== profile.meetingId || body.user?.id !== profile.userId) throw new Error("Код входа выдан для другой конференции");
    profile = { ...profile, authToken: body.token };
    delete profile.handoffCode;
  }
  let previous;
  try { previous = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (_) { previous = null; }
  // Release only this tab's prior lease, never another tab's live participant.
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
  if (state.meeting?.status !== "active") return;
  const wantsAudio = canSpeak() && localStorage.getItem(MICROPHONE_AUTO_KEY) !== "off" &&
    !state.localMedia?.getAudioTracks().some((track) => track.readyState === "live");
  const wantsVideo = localStorage.getItem(CAMERA_AUTO_KEY) !== "off" &&
    !state.localMedia?.getVideoTracks().some((track) => track.readyState === "live");
  if (!wantsAudio && !wantsVideo) return;
  // Safari may reprompt without a user gesture; resume only granted capture.
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
      notify(`Камера и микрофон не подключены. ${mediaAccessError(error).message}`, 9000, { tone: "error" });
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
  // Renew only broken iPad capture tracks; healthy tracks must not reprompt.
  if (current && current.readyState === "live" && !current.muted) return;
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
    throw new Error("Камера и микрофон работают только по защищённому адресу (HTTPS). Откройте пульт по HTTPS.");
  }
  // An automatic capture already in flight would otherwise add a second
  // microphone track that is never published but keeps the device busy.
  await Promise.allSettled([state.microphonePromise, state.cameraPromise].filter(Boolean));
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
  }).catch((error) => { throw mediaAccessError(error, needAudio && needVideo ? "av" : needAudio ? "microphone" : "camera"); });
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
    throw new Error("Браузер открыл не все устройства: проверьте разрешения камеры и микрофона.");
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
      throw new Error("Сохранённый участник не найден в конференции");
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
        connectError("Это место уже занято на другом устройстве или в другой конференции. Выйдите там или подождите 2 минуты и войдите снова.");
      }
      return false;
    }
  }
}

function startForegroundTimers() {
  stopForegroundTimers();
  state.voteCountdownTimer = setInterval(updateVoteCountdowns, 1000);
  state.translationMeterTimer = setInterval(updateTranslationMeters, 500);
  state.refreshTimer = setInterval(() => refreshAll(true), 30000);
  state.signalTimer = setInterval(pollSignaling, 30000);
  state.programTimer = setInterval(refreshProgram, 10000);
  state.programHealthTimer = setInterval(checkProgramVideoHealth, 2000);
  if (state.profile?.presenterWorkplace) {
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
}

function stopForegroundTimers() {
  for (const name of ["voteCountdownTimer", "translationMeterTimer", "refreshTimer", "signalTimer", "programTimer",
    "programHealthTimer", "presenterWorkplaceTimer"]) {
    clearInterval(state[name]);
    state[name] = null;
  }
}

// The server dropped this tab's presence (another tab or device took over,
// or the tab slept too long). Say so plainly instead of a live-looking console.
function showSessionLost(message) {
  if (document.querySelector(".session-lost-backdrop")) return;
  clearTimers();
  const backdrop = document.createElement("div");
  backdrop.className = "form-dialog-backdrop session-lost-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "form-dialog confirm-dialog session-lost-dialog";
  dialog.innerHTML = `<h3>Пульт отключён от конференции</h3><p>${escapeHtml(message)}</p><p class="form-hint">Микрофон, запрос слова и голосование на этом устройстве не работают, пока вы не подключитесь снова.</p><div class="actions"><button type="button" class="button button-secondary" data-session-leave>Выйти</button><button type="button" class="button button-primary" data-session-reconnect>Подключиться снова</button></div>`;
  backdrop.append(dialog);
  document.body.append(backdrop);
  openModal(dialog, { onEscape: null, initialFocus: () => dialog.querySelector("[data-session-reconnect]") });
  dialog.querySelector("[data-session-reconnect]").onclick = () => location.reload();
  // Another tab or device may now own this participant: leave locally only,
  // a server-side "leave" would disconnect that live session.
  dialog.querySelector("[data-session-leave]").onclick = () => {
    state.localMedia?.getTracks().forEach((track) => track.stop());
    state.contentMedia?.getTracks().forEach((track) => track.stop());
    location.replace("/conference/");
  };
}

function startTimers() {
  clearTimers();
  startEventStream();
  state.heartbeatTimer = setInterval(() => {
    state.api.post(`/meetings/${state.profile.meetingId}/participants/${state.participantId}/presence`, { presenceId: PRESENCE_ID })
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          void exitClosedConference();
          return;
        }
        if (error.status === 409 && (error.details?.reason === "presence-inactive" ||
            error.serverMessage === "Participant presence is no longer active")) {
          clearInterval(state.heartbeatTimer);
          state.heartbeatTimer = null;
          showSessionLost(error.message);
        } else if (error.status) notify(`Присутствие: ${error.message}`);
        // A network failure is shown by the connection indicator, not a toast.
      });
  }, 20000);
  if (!document.hidden) startForegroundTimers();
  void pollSignaling();
  if (state.profile.role === "secretary") {
    state.secretarySaveTimer = setInterval(() => saveSecretaryTranscript().catch((error) => notify(error)), 5000);
  }
}

function clearTimers() {
  stopForegroundTimers();
  clearInterval(state.heartbeatTimer);
  clearInterval(state.secretarySaveTimer);
  clearTimeout(state.eventReconnectTimer);
  clearTimeout(state.eventRefreshTimer);
  state.eventAbort?.abort();
  state.eventAbort = null;
  state.eventReconnectAttempts = 0;
  setEventConnectionStatus(true);
}

// A pointer or annotation request reaches the people who answer it under the
// conference's DocumentCore policy (payload.approverRoles; by default the
// operator) even when the document window is folded or closed; inside the
// open window the request is shown in its strip instead.
function documentRequestNotice(eventType, payload) {
  if (payload?.reason !== "requested" || !payload.presentationId || !state.api) return;
  const me = state.meeting?.participants?.[state.participantId];
  const roles = new Set([me?.role, ...(state.profile?.roles ?? [])].filter(Boolean));
  if (roles.has("av_operator")) roles.add("operator");
  const approverRoles = Array.isArray(payload.approverRoles) ? payload.approverRoles : ["operator"];
  const approves = roles.has("admin") || approverRoles.some((role) => roles.has(role));
  if (!approves || isPresentationViewerOpen(payload.presentationId)) return;
  const request = payload.requests?.find((item) => item.userId === payload.requesterUserId);
  if (!request) return;
  const pointer = eventType === "document-scene.pointer-control";
  const base = `/presentations/${encodeURIComponent(payload.presentationId)}/${pointer ? "pointer" : "annotate-access"}`;
  const answer = (path) => state.api.post(base + path, { userId: request.userId })
    .catch((error) => notify(error));
  notify(`${request.displayName} ${pointer ? "просит указку" : "просит пометки"}`, 20000, {
    action: { label: "Разрешить", onClick: () => answer("/grant") },
    secondaryAction: { label: "Отклонить", onClick: () => answer("/deny") }
  });
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
      type === "media.floor-scene-updated" || type.startsWith("uc.session-"));
    if (events.some((type) => type.startsWith("media.") || type.startsWith("mcu.video-program") ||
        type === "mcu.video-scene-visible" ||
      type === "mediaplane.video-scene-visible" ||
        type === "participant.updated")) refreshProgram();
    // Floor updates keep video canvases mounted.
    if (floorOnly) refreshFloorState(events.some((type) => type.startsWith("uc.session-")));
    else refreshAll(true);
  }, 60);
}


async function refreshFloorState(refreshUc = false) {
  if (!state.api || !state.profile?.meetingId) return;
  if (state.floorRefreshing) {
    state.floorRefreshPending = true;
    state.floorRefreshPendingUc ||= refreshUc;
    return;
  }
  state.floorRefreshing = true;
  state.floorRefreshPending = false;
  try {
    const path = `/meetings/${encodeURIComponent(state.profile.meetingId)}`;
    const [meeting, ucControl] = await Promise.all([
      state.api.get(path), refreshUc && ["operator", "secretary", "admin"].includes(state.profile.role) &&
        can("conference.lifecycle") ? state.api.get(`${path}/uc-control`).catch(() => null) : null
    ]);
    state.meeting = meeting;
    state.ucSessions = meeting.ucSessions ?? [];
    if (ucControl) state.ucControl = ucControl;
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
      // Update the header and the field in place: rebuilding the block lost
      // scroll position, undo history and an IME composition on every mic event.
      updateSecretaryWorkspace();
    }
    // Keep live canvases.
    if (state.activeTab === "conference") {
      const template = document.createElement("template");
      template.innerHTML = conferenceHtml();
      for (const selector of [".conference-speakers-panel", ".conference-queue-panel"]) {
        const current = document.querySelector(`#pageContent ${selector}`);
        const updated = template.content.querySelector(selector);
        if (current && updated) current.replaceWith(updated);
      }
    }
    if (ucControl) {
      const current = document.querySelector("#pageContent .uc-control");
      if (current) {
        const template = document.createElement("template");
        template.innerHTML = ucControlHtml(meeting.status === "ready");
        const updated = template.content.querySelector(".uc-control");
        if (updated) current.replaceWith(updated);
      }
    }
    if (state.activeTab === "streams") updateSourceWallFloorState();
    syncConferenceAudio().catch(() => {});
  } catch (error) {
    if (error.status === 401 || error.status === 403) return exitClosedConference();
    if (state.profile?.role === "secretary" && error.status) notify(`Стенограмма не синхронизирована: ${error.message}`);
  } finally {
    state.floorRefreshing = false;
    if (state.floorRefreshPending) {
      const pendingUc = state.floorRefreshPendingUc;
      state.floorRefreshPending = false;
      state.floorRefreshPendingUc = false;
      refreshFloorState(pendingUc);
    }
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
  if (!payload || payload.meetingId !== state.profile?.meetingId) return;
  if (payload.channel === "program") {
    for (const meter of payload.meters ?? []) state.audioMeters.set(meter.sourceId, meter);
    for (const element of $$('[data-audio-meter]')) {
      const meter = state.audioMeters.get(element.dataset.audioMeter);
      const db = Number(meter?.peakDbfs ?? meter?.rmsDbfs ?? meter?.levelDbfs ?? -127);
      element.value = Math.max(-60, Math.min(0, db));
      element.title = `${db.toFixed(1)} dBFS`;
    }
  }
  if (payload.channel !== "program" && !payload.channel?.startsWith("language:")) return;
  const master = payload.meters?.find((meter) => meter.sourceId === "__mix_master__");
  if (master) {
    const receivedAt = Date.now();
    const peak = Number(master.peakDbfs ?? master.rmsDbfs ?? master.levelDbfs);
    const lastSignalAt = Number.isFinite(peak) && peak > -55 ? receivedAt
      : state.translationAudioMeters.get(payload.channel)?.lastSignalAt ?? 0;
    state.translationAudioMeters.set(payload.channel, { ...master, receivedAt, lastSignalAt });
  }
  updateTranslationMeters();
}

function updateTranslationMeters() {
  for (const element of $$('[data-translation-signal]')) {
    const reading = state.translationAudioMeters.get(element.dataset.translationSignal);
    const fresh = Boolean(reading && Date.now() - reading.receivedAt < 2500);
    const db = Number(reading?.peakDbfs ?? reading?.rmsDbfs ?? reading?.levelDbfs);
    const hasSignal = fresh && ((Number.isFinite(db) && db > -55) ||
      Date.now() - (reading.lastSignalAt ?? 0) < 1200);
    const status = fresh ? (hasSignal ? "Онлайн" : "Офлайн") : "Нет данных";
    element.dataset.signalState = fresh ? (hasSignal ? "online" : "offline") : "unknown";
    const label = element.querySelector('[data-translation-status]');
    if (label && label.textContent !== status) label.textContent = status;
    const peak = element.querySelector('[data-translation-peak]');
    if (peak) peak.value = fresh && Number.isFinite(db) ? Math.max(-60, Math.min(0, db)) : -60;
    const display = element.querySelector('[data-translation-db]');
    if (display) display.textContent = fresh && Number.isFinite(db) && db > -100 ? `${Math.round(db)} dBFS` : "−∞ dBFS";
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
        else if (eventType === "control.state-changed") pushRoomControlState?.(eventPayload);
        else if (eventType === "control.page-command") pushRoomControlPage?.(eventPayload);
        else if (eventType === "chat.signal") void pollSignaling();
        else if (eventType?.startsWith("document-scene.")) {
          if (eventType === "document-scene.pointer-control" || eventType === "document-scene.annotate-control") {
            documentRequestNotice(eventType, eventPayload);
          }
          documentSceneEvent(eventType, eventPayload);
        }
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

// Track floor-to-PGM quickly, without the full page refresh delay.
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
    syncFaceFraming?.(descriptor.pgm?.faceFraming === true);
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
    // Full refresh reports connection failures.
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
    const scoped = (enabled, path, fallback) => enabled ? keep(state.api.get(path), fallback) : Promise.resolve(fallback);
    const [permissions, productLicense] = await Promise.all([
      keep(state.api.get(`/permissions/me?meetingId=${meetingId}`), null),
      keep(state.api.get("/licenses/capabilities"), state.productLicense)
    ]);
    if (productLicense) state.productLicense = productLicense;
    if (permissions) {
      state.capabilities = new Set(permissions.capabilities);
      if (permissions.conferenceRole && state.profile.role !== permissions.conferenceRole) {
        state.profile.role = permissions.conferenceRole;
        state.api.profile.role = permissions.conferenceRole;
        saveProfile(state.profile);
        saveActiveSession();
        void updateHeadphoneWarning?.();
      }
    }
    const role = state.profile.role;
    const layoutWidth = Math.max(innerWidth, screen?.width || 0);
    const layoutDevice = layoutWidth >= 1600 ? "pc" : layoutWidth >= 1180 ? "laptop"
      : layoutWidth >= 600 ? "tablet" : "phone";
    if (state.workspaceLayoutRole !== role || state.workspaceLayoutDevice !== layoutDevice) {
      applyWorkspaceLayout(await keep(state.api.get(`/me/workspace-layout?meetingId=${meetingId}&device=${layoutDevice}`), null), role);
      state.secretaryLayoutLoaded = role === "secretary";
    }
    const deviceAccess = ["operator", "technician", "admin"].includes(role);
    const readinessAccess = ["chair", "secretary", "operator", "technician", "admin"].includes(role);
    const signageAccess = state.capabilities.has("signage.manage");
    const serviceAccess = state.capabilities.has("service.requests") || state.capabilities.has("service.requests.supervise");
    const sharedSeatAccess = ["secretary", "operator", "technician", "admin"].includes(role);
    const mediaAccess = can("media.devices");
    const aes67Access = ["operator", "technician", "admin"].includes(role);
    const serviceTab = ["service", "operations"].includes(state.activeTab) ||
      ["service", "technician"].includes(role) && state.activeTab === "conference";
    const mediaTab = ["streams", "operations", "settings"].includes(state.activeTab);
    const translateTab = state.activeTab === "translation" || ["interpreter", "translator"].includes(role);
    const meeting = await state.api.get(`/meetings/${meetingId}`);
    // A UC participant asking for the floor is announced like a delegate's request.
    const askedBefore = new Set((state.ucSessions ?? []).flatMap((item) => [item.floorRequestedAt ? item.id : null,
      ...(item.members ?? []).filter((member) => member.floorRequestedAt).map((member) => `${item.id}:${member.user}`)]).filter(Boolean));
    for (const session of meeting.ucSessions ?? []) {
      if (session.floorRequestedAt && !askedBefore.has(session.id) && can("audio.operate")) {
        notify(`${session.displayName?.trim() || "Участник внешней встречи"} просит слово`, 6000);
      }
      for (const member of session.members ?? []) {
        if (member.floorRequestedAt && !askedBefore.has(`${session.id}:${member.user}`) && can("audio.operate")) {
          notify(`${member.displayName} просит слово`, 6000);
        }
      }
    }
    const shareBefore = new Set((state.ucSessions ?? []).filter((item) => item.shareRequestedAt).map((item) => item.id));
    state.ucSessions = meeting.ucSessions ?? [];
    // The operator is asked at once when a UC participant wants to show a screen.
    const newShare = state.ucSessions.find((item) => item.shareRequestedAt && !shareBefore.has(item.id));
    if (newShare && can("floor.manage")) setTimeout(() => runAction(() => decideUcShare(newShare.id), "Показ экрана разрешён"), 0);
    state.ucControl = ["operator", "secretary", "admin"].includes(role) && can("conference.lifecycle")
      ? await keep(state.api.get(`/meetings/${meetingId}/uc-control`), null) : null;
    if (meeting.status === "ready") {
      state.meeting = meeting;
      state.documents = await keep(state.api.get(`/meetings/${meetingId}/documents`), []);
      updateBuildLabels();
      renderPage();
      return;
    }
    const roomId = meeting.roomId ?? "default-room";
    const [streams, votes, documents, presentations, devices, readiness, signagePlayers, aes67, serviceRequests, sharedSeats, chatSessions, cameras, mediaRuntime, routing, programDescriptor, mediaWorkers, multicastJobs, ndiJobs, systemStatus, mcuHealth, pgmSlates, translateStatus, translateMeeting] = await Promise.all([
      state.api.get(`/meetings/${meetingId}/streams`),
      state.api.get(`/meetings/${meetingId}/votes`),
      state.api.get(`/meetings/${meetingId}/documents`),
      state.api.get(`/meetings/${meetingId}/presentations`),
      scoped(deviceAccess && serviceTab, `/devices?roomId=${encodeURIComponent(roomId)}&meetingId=${meetingId}`, state.devices),
      scoped(readinessAccess && serviceTab, `/rooms/${encodeURIComponent(roomId)}/readiness?meetingId=${meetingId}`, state.readiness),
      scoped(signageAccess && serviceTab, `/signage/players?meetingId=${meetingId}`, state.signagePlayers),
      scoped(aes67Access && state.activeTab === "settings", `/media/aes67?meetingId=${meetingId}`, state.aes67),
      // A participant's own requests are small and always followed: status notices.
      scoped(serviceTab || !serviceAccess, serviceAccess ? `/service/requests?meetingId=${meetingId}` :
        `/service/requests/mine?meetingId=${meetingId}&participantId=${encodeURIComponent(state.participantId)}`, state.serviceRequests),
      scoped(sharedSeatAccess && serviceTab, `/shared-seats?roomId=${encodeURIComponent(roomId)}`, state.sharedSeats),
      keep(state.api.get(`/chat/sessions?meetingId=${meetingId}&participantId=${encodeURIComponent(state.participantId)}`), state.chatSessions),
      scoped(mediaAccess && mediaTab, `/cameras?roomId=${encodeURIComponent(roomId)}`, state.cameras),
      scoped(mediaAccess && mediaTab, "/media/runtime", state.mediaRuntime),
      keep(state.api.get(`/media/routing?meetingId=${meetingId}`), state.routing),
      keep(state.api.get(`/media/program?meetingId=${meetingId}`), state.programDescriptor),
      scoped(mediaAccess && mediaTab, "/media/workers", state.mediaWorkers),
      scoped(mediaAccess && mediaTab, "/media/multicast", state.multicastJobs),
      scoped(mediaAccess && mediaTab, "/media/ndi/jobs", state.ndiJobs),
      keep(state.api.get("/status"), state.systemStatus),
      scoped(can("media.health.read") && mediaTab, `/mcu/health?meetingId=${meetingId}`, state.mcuHealth),
      scoped(can("pgm.operate") && state.activeTab === "settings", "/media/pgm-slates", state.pgmSlates),
      scoped(translateTab, "/translate-core/status", state.translateStatus),
      scoped(translateTab, `/meetings/${meetingId}/translate-core`, state.translateMeeting)
    ]);
    if (!await clientBuildReady(state.api, CLIENT_BUILD, BUILD_RELOAD_KEY, systemStatus)) return;
    for (const previous of state.presentations ?? []) {
      if (previous.status === "active" && !presentations.some((item) => item.id === previous.id && item.status === "active")) {
        closePresentationViewer(previous.id);
      }
    }
    if (!serviceAccess) {
      // Tell the participant when their request moves on (accepted, on the way, done).
      const before = new Map(state.serviceRequests.map((item) => [item.id, item.status]));
      for (const item of serviceRequests ?? []) {
        const previous = before.get(item.id);
        if (previous && previous !== item.status) notify(`${requestItemsText(item)}: ${serviceRequestProgress(item, interfaceLocale())}`, 6000);
      }
    }
    Object.assign(state, { meeting, streams, votes, documents, presentations, devices, readiness, signagePlayers, aes67, serviceRequests, sharedSeats, cameras, mediaRuntime, routing, programDescriptor, mediaWorkers, multicastJobs, ndiJobs, systemStatus, mcuHealth, pgmSlates, translateStatus, translateMeeting });
    state.serviceRoomPlan = serviceAccess && serviceTab
      ? await keep(state.api.get(`/service/room-plan?meetingId=${encodeURIComponent(meetingId)}`), null) : null;
    state.serviceAssignees = serviceAccess && serviceTab
      ? await keep(state.api.get("/service/assignees"), []) : [];
    state.roomControlPanelId = meetingControlPanelId(meetingId);
    state.roomControl = state.capabilities.has("control.room.operate")
      ? await keep(state.api.get(`/control-core/meetings/${meetingId}?panelId=${encodeURIComponent(state.roomControlPanelId)}`), null) : null;
    if (state.roomControl) {
      const key = `vox-control-page:${meetingId}:${state.roomControl.roomId}:${state.roomControl.version}`;
      const stored = sessionStorage.getItem(key);
      const navigation = state.roomControl.navigation;
      const navKey = `vox-control-navigation:${state.roomControlPanelId}`;
      const requested = navigation?.id && navigation.id !== sessionStorage.getItem(navKey)
        ? navigation.pageId : stored;
      if (navigation?.id && requested === navigation.pageId) sessionStorage.setItem(navKey, navigation.id);
      state.roomControlPageId = state.roomControl.panel.pages?.some((page) => page.id === requested)
        ? requested : state.roomControl.panel.pages?.[0]?.id ?? "main";
    }
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
      // Only a participant who is not busy is moved to the ballot. The chair,
      // technical roles and anyone typing get a banner instead (A-11).
      const typing = document.activeElement?.matches?.("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]") ||
        [...state.chatDrafts.values()].some((draft) => String(draft ?? "").trim());
      const busyRole = role === "chair" || TECHNICAL_CONFERENCE_ROLES.has(role);
      if (!busyRole && !typing && state.activeTab !== "voting") {
        state.activeTab = "voting";
        notify("Открыто голосование", 5000);
      } else if (state.activeTab !== "voting") {
        notify("Открыто голосование", 15000, { action: { label: "Перейти", onClick: () => selectTab("voting").catch((error) => notify(error)) } });
      }
    }
    if (!openVote) state.lastOpenVoteId = null;
    await reconcileSelectedStream();
    await syncLocalMicrophone();
    await syncConferenceAudio();
    if (state.activeTab === "streams") syncSourceWall().catch((error) => notify(`Источники: ${error.message}`, 3500));
    updateBuildLabels();
    $("#meetingTitle").textContent = meeting.title;
    $("#meetingState").textContent = `${meeting.pausedAt ? "Пауза" : MEETING_STATE_LABELS[meeting.status] ?? "Конференция"} · ${state.profile.remote ? "удалённо" : "в зале"}`;
    document.body.dataset.role = state.profile.role ?? "";
    const renderKey = JSON.stringify({
      tab: state.activeTab,
      roomControl: state.roomControl ? [state.roomControl.version, state.roomControl.state] : null,
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
      serviceRequests: serviceRequests.map((item) => [item.id, item.status, item.updatedAt]),
      presenters: (meeting.preparedParticipants ?? []).filter((item) => item.reports || item.role === "presenter")
        .map((item) => [item.id, item.status, item.excludedAt, item.reportOrder, item.presenterSeatId,
          item.reportSeatMode, item.ownReportSession?.status]),
      presenterSeats: (sharedSeats ?? []).map((item) => [item.id, item.online, item.session?.status,
        item.session?.assignedUserId, item.session?.confirmedAt]),
      secretaryRecording: state.recordingStatus?.enabled,
      translation: [translateMeeting?.revision, translateMeeting?.selections?.[state.participantId]?.channelId],
      signage: state.activeTab === "operations" ? signagePlayers.map((item) => [item.id, item.online,
        item.currentScene?.id]) : null
    });
    if (!silent || renderKey !== state.lastRenderKey) {
      state.lastRenderKey = renderKey;
      renderPage();
    } else updateChatNotice();
    refreshVoteResultsModal?.();
    void maybeOfferRoomStation().catch((error) => { if (error.status) notify(`Рассадка: ${error.message}`, 3500); });
  } catch (error) {
    if (error.status === 401 || error.status === 403) return exitClosedConference();
    if (error.status === 404 && state.profile?.meetingId) {
      clearTimers(); clearActiveSession();
      Object.assign(state, { api:null, meeting:null, participantId:null, leaseId:null });
      location.replace("/conference/");
      return;
    }
    if (!silent) notify(error);
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
  const changed = state.activeTab !== tab;
  if (state.activeTab === "streams" && tab !== "streams") {
    state.streamsWarmUntil = Date.now() + 120_000;
    stopThumbnailLoop(); closeStreamPreviewModal();
  }
  if (changed) forgetFormDrafts();
  state.activeTab = tab;
  if (tab === "chat" && state.activeChatId) markChatRead(state.activeChatId);
  $$(".nav-item[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  renderPage();
  if (changed) void refreshAll(true);
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
  // Cleanup is best-effort; an unstable WebRTC peer must not abort server leave.
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
    presentations: [], devices: [], readiness: null, signagePlayers: [],
    signageForm: { playerIds: [], type: "text", title: "", body: "", documentId: "" },
    aes67: null, serviceRequests: [], serviceAssignees: [], serviceRoomPlan: null, sharedSeats: [], chatSessions: [],
    activeChatId: null, claimedSeat: null, localMedia: null, publishedStream: null,
    contentMedia: null, contentPublishedStream: null, selectedStream: null, selectedSourceIdentity: null,
    watchingStreamId: null, remoteMedia: null, systemStatus: null, mcuHealth: null, voteSelections: new Map(),
    mediaPermissionPending: false, cameraSetupDismissed: false, secretaryLayout: structuredClone(SECRETARY_LAYOUT_DEFAULT),
    secretaryLayoutDraft: null, secretaryLayoutLoaded: false
  });
  clearActiveSession();
  localStorage.removeItem(QUICK_RESUME_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  location.replace("/conference/?left=1");
}

async function exitClosedConference() {
  if (state.exitingConference) return;
  state.exitingConference = true;
  clearTimers();
  clearActiveSession();
  localStorage.removeItem(QUICK_RESUME_KEY);
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
$("#secretaryLayoutActions")?.addEventListener("change", (event) => {
  const field = event.target.closest("[data-layout-font]");
  if (!field || !state.secretaryLayoutDraft) return;
  const value = Number(field.value);
  const minimum = Number(field.min), maximum = Number(field.max);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    field.value = String(state.secretaryLayoutDraft[field.dataset.layoutFont] ?? (field.dataset.layoutFont === "bodyFontSize" ? 14 : 18));
    notify(`Укажите целое значение от ${minimum} до ${maximum} px`);
    return;
  }
  state.secretaryLayoutDraft[field.dataset.layoutFont] = value;
  renderPage();
});
$("#workspaceAddMenu")?.addEventListener("click", (event) => {
  const target = event.target.closest('[data-action="layout-add"]');
  if (target) handleSecretaryLayoutAction?.("layout-add", target);
});
$("#chatNoticeBtn")?.addEventListener("click", () => selectTab("chat").catch((error) => notify(error)));
$$(".nav-item[data-tab]").forEach((button) => button.addEventListener("click", () => {
  selectTab(button.dataset.tab).catch((error) => notify(error));
}));
// Views load after these listeners are registered. Resolve the handlers when
// a gesture occurs, rather than capturing their still-undefined bindings.
$("#pageContent").addEventListener("pointerdown", (event) => startSecretaryLayoutGesture?.(event));
document.addEventListener("pointermove", (event) => moveSecretaryLayoutGesture?.(event));
document.addEventListener("pointerup", (event) => finishSecretaryLayoutGesture?.(event));
document.addEventListener("pointercancel", (event) => finishSecretaryLayoutGesture?.(event));

$("#pageContent").addEventListener("change", (event) => {
  rememberFormDraft(event.target);
  if (event.target.matches('[data-action="uc-member-bind"]') && event.target.value) {
    const { ucSessionId, ucUser } = event.target.dataset;
    runAction(() => bindUcMember(ucSessionId, ucUser, event.target.value), "Участник Zoom привязан");
  }
  if (event.target.matches("[data-signage-target]")) {
    state.signageForm.playerIds = [...document.querySelectorAll("[data-signage-target]:checked")].map((item) => item.value);
    updateSignagePreviews();
  }
  if (event.target.id === "signageSceneDocument") state.signageForm.documentId = event.target.value;
  if (event.target.id === "signageSceneDocument") updateSignagePreviews();
  if (event.target.matches("[data-room-control-slider]")) {
    const controlId = event.target.dataset.roomControlSlider;
    const value = Number(event.target.value);
    void roomControlEvents?.send(controlId, "release", value);
    return;
  }
  if (event.target.id === "signageSceneType") {
    const isDocument = event.target.value === "document";
    state.signageForm.type = event.target.value;
    document.querySelectorAll("[data-signage-text]").forEach((field) => { field.hidden = !["text", "participant-call"].includes(event.target.value); });
    document.querySelector("#signageSceneTitleLabel").textContent = event.target.value === "participant-call" ? "ФИО" : "Заголовок";
    if (event.target.value === "participant-call" && !state.signageForm.body.trim()) {
      state.signageForm.body = "Просим пройти в зал для доклада";
      document.querySelector("#signageSceneBody").value = state.signageForm.body;
    }
    document.querySelector("[data-signage-document]").hidden = !isDocument;
    updateSignagePreviews();
    return;
  }
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
    })().catch((error) => notify(error));
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
    }, "Общий уровень звука зала обновлён");
  }
  if (event.target.matches("input[data-source-gain]")) {
    const streamId = event.target.dataset.sourceGain;
    const value = Number(event.target.value);
    runAction(async () => {
      state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`,
        { sourceGain: { streamId, value } });
    }, value === 0 ? "Линейный источник заглушён" : "Уровень линейного источника обновлён");
  }
  if (event.target.id === "operatorSlateUpload") {
    runAction(() => uploadPgmSlate(event.target.files[0]), "Заставка добавлена в библиотеку");
  }
  if (event.target.dataset.mediaDevice) {
    runAction(() => changeMediaDevice(event.target.dataset.mediaDevice, event.target.value).catch((error) => {
      throw mediaAccessError(error, event.target.dataset.mediaDevice === "videoinput" ? "camera" : "microphone");
    }), "Устройство переключено");
  }
  if (event.target.matches("input[data-translation-volume]")) {
    state.translationVolume = Math.max(0, Math.min(1, Number(event.target.value) / 100));
    localStorage.setItem(TRANSLATION_VOLUME_KEY, String(state.translationVolume));
    if (state.serverAudioElement) state.serverAudioElement.volume = state.translationVolume;
  }
});

$("#pageContent").addEventListener("input", (event) => {
  rememberFormDraft(event.target);
  if (event.target.id === "signageSceneTitle") state.signageForm.title = event.target.value;
  if (event.target.id === "signageSceneBody") state.signageForm.body = event.target.value;
  if (["signageSceneTitle", "signageSceneBody"].includes(event.target.id)) updateSignagePreviews();
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
    notify(error);
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

function handlePresentationControlAction(target) {
  if (!target || target.disabled) return false;
  const id = target.dataset.presentationId;
  if (target.dataset.action === "open-presentation-document") {
    if (!id || !target.dataset.documentId) return true;
    target.disabled = true;
    void openDocument(target.dataset.documentId, id)
      .catch((error) => notify(error))
      .finally(() => { if (target.isConnected) target.disabled = false; });
    return true;
  }
  if (target.dataset.action === "stop-presentation") {
    if (!id) return true;
    const title = state.presentations.find((item) => item.id === id)?.title;
    void withActionBusy(target, async () => {
      if (!await confirmDialog(`Завершить показ${title ? ` «${title}»` : ""} для всех участников?`, "Завершить показ", "Отмена")) return;
      await runAction(async () => {
        await state.api.post(`/presentations/${encodeURIComponent(id)}/stop`);
        state.presentations = state.presentations.map((item) =>
          item.id === id ? { ...item, status: "stopped" } : item);
        closePresentationViewer(id);
        renderMicrophoneDock();
      }, "Показ завершён");
    });
    return true;
  }
  return false;
}

$("#pageContent").addEventListener("click", (event) => {
  const micButton = event.target.closest("[data-mic-action]");
  if (micButton) {
    handleMicrophoneAction(micButton).catch((error) => notify(error));
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled || target.getAttribute("aria-busy") === "true") return;
  // runAction() picks the pressed control up synchronously and keeps it busy.
  state.actionTrigger = target;
  try { handlePageAction(event, target); } finally { state.actionTrigger = null; }
});

function handlePageAction(event, target) {
  if (handlePresentationControlAction(target)) return;
  const action = target.dataset.action;
  if (handleWorkspaceUiAction(action, target)) return;
  if (action === "open-camera-setup") {
    event.preventDefault();
    void (async () => {
      await refreshMediaDevices().catch(() => {});
      await selectTab("settings");
      const setup = $("#camera-setup");
      setup?.scrollIntoView({ block: "start" });
      setup?.querySelector("#videoInputSelect")?.focus({ preventScroll: true });
    })().catch((error) => notify(error));
    return;
  }
  if (action === "dismiss-camera-setup") {
    state.cameraSetupDismissed = true;
    renderPage();
    return;
  }
  if (action === "publish-local-camera") {
    void runAction(async () => {
      await startPublishing();
      localStorage.setItem(CAMERA_AUTO_KEY, "on");
      state.cameraSetupDismissed = false;
      renderPage();
    }, "Камера опубликована");
    return;
  }
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
  if (action === "secretary-clear-editor") { void clearSecretaryEditor().catch((error) => notify(error)); return; }
  if (action === "request-floor") runAction(requestFloor, "Запрос добавлен в очередь");
  if (action === "chair-activate") runAction(activateChairMicrophone, "Приоритетный микрофон председателя включён");
  if (action === "grant-floor") runAction(() => grantFloor(target.dataset.participantId), "Слово предоставлено");
  if (action === "release-floor") runAction(() => releaseFloor(target.dataset.participantId), "Микрофон отключён");
  if (action === "uc-toggle-mute") runAction(() => toggleUcMute(target.dataset.ucSessionId), "Звук внешней встречи обновлён");
  if (action === "uc-decline-floor") runAction(() => declineUcFloor(target.dataset.ucSessionId), "Запрос слова отклонён");
  if (action === "uc-member-mute") runAction(() => setUcMemberMute(target.dataset.ucSessionId, target.dataset.ucUser,
    target.dataset.muted === "true"), target.dataset.muted === "true" ? "Микрофон участника выключен" : "Участнику дано слово");
  if (action === "uc-talkback") runAction(async () => {
    const on = await toggleUcTalkback(target.dataset.ucSessionId);
    notify(on ? "Говорите: вас слышит только это подключение" : "Разговор с участником завершён");
  });
  if (action === "uc-share-allow") runAction(() => decideUcShare(target.dataset.ucSessionId), "Показ экрана разрешён");
  if (action === "uc-share-decline") runAction(() => decideUcShare(target.dataset.ucSessionId, false), "Показ экрана отклонён");
  if (action === "uc-connect-plan") void connectPlannedUc(target);
  if (action === "uc-connect-live") void connectLiveUc(target);
  if (action === "uc-disconnect") void disconnectUc(target);
  if (action === "uc-preview-listen") toggleUcPreviewListen(target);
  if (action === "uc-test-tone") void playUcTestTone(target);
  if (action === "self-release") runAction(selfRelease, "Слово освобождено");
  if (action === "save-microphone-limit") runAction(async () => { await saveMicrophoneLimit(); forgetFormDrafts("maxOpenMicrophones"); }, "Лимит активных микрофонов обновлён");
  if (action === "toggle-fifo") runAction(toggleFifo, "Порядок очереди обновлён");
  if (action === "save-discussion-mode") runAction(async () => { await saveDiscussionMode(); forgetFormDrafts("discussionMode"); forgetFormDrafts("queuePolicy"); }, "Режим дискуссии обновлён");
  if (action === "mute-all") runAction(muteAllMicrophones, "Все микрофоны выключены");
  if (action === "edit-agenda") openAgendaDialog({ editable: true });
  if (action === "view-agenda") openAgendaDialog();
  if (action === "start-conference") void startPreparedConference();
  if (action === "close-conference") void withActionBusy(target, async () => {
    if (!["operator", "admin", "secretary"].includes(state.profile.role) || !can("conference.lifecycle") || state.meeting?.status !== "active") return;
    if (!await confirmDialog("Завершить конференцию для всех участников? Все подключения будут отключены.", "Завершить конференцию", "Отмена")) return;
    await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/close`, {});
    await exitClosedConference();
  }).catch((error) => notify(error));
  if (action === "pause-conference" || action === "resume-conference") runAction(async () => {
    if (!["chair", "secretary", "admin"].includes(state.profile.role) || !can("conference.pause")) return;
    let details = {};
    if (action === "pause-conference") {
      const offset = new Date().getTimezoneOffset() * 60_000;
      const pauseUntilAt = new Date(Date.now() + 15 * 60_000 - offset).toISOString().slice(0, 16);
      const min = new Date(Date.now() - offset).toISOString().slice(0, 16);
      const form = await httpForm("Пауза конференции", [
        { name: "pauseUntilAt", label: "Ориентировочно до", type: "datetime-local", value: pauseUntilAt, min },
        { name: "pauseComment", label: "Сообщение для вывески", value: "Перерыв", maxLength: 160 }
      ], "Поставить на паузу", { description: "Конференция продолжится только по кнопке «Продолжить».", onSubmit: async (values) => {
        const pauseDetails = { pauseUntilAt: new Date(values.pauseUntilAt).toISOString(), pauseComment: values.pauseComment.trim() };
        if (Date.parse(pauseDetails.pauseUntilAt) <= Date.now()) throw new Error("Укажите будущее время окончания паузы");
        await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/pause`, pauseDetails);
      } });
      if (!form) return false;
    } else await state.api.post(`/meetings/${encodeURIComponent(state.profile.meetingId)}/resume`, details);
    await refreshAll(true);
  }, action === "pause-conference" ? "Конференция на паузе" : "Конференция продолжена");
  if (action === "activate-agenda") runAction(() => activateAgenda(target.dataset.agendaId), "Активная тема изменена");
  if (action === "reveal-access-pin") runAction(revealAccessPin);
  if (action === "edit-access-pin") runAction(editAccessPin, "ПИН конференции изменён");
  if (action === "change-participant-role") runAction(() => changeParticipantRole(target.dataset.participantId, target.dataset.currentRole), "Роль участника изменена");
  if (action === "toggle-incoming-audio") runAction(() => toggleIncomingAudio(target.dataset.participantId, target.dataset.enabled === "true"), "Звук зала у участника обновлён");
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
  if (action === "refresh-media-runtime") runAction(refreshMediaRuntime, "Состояние медиасервисов обновлено");
  if (action === "refresh-media-devices") runAction(async () => {
    await refreshMediaDevices(true).catch((error) => { throw mediaAccessError(error); });
    renderPage();
  }, "Список камер и микрофонов обновлён");
  if (action === "discover-onvif") runAction(discoverOnvifCameras);
  if (action === "add-onvif-camera") runAction(addOnvifCamera, "Камера добавлена в каталог");
  if (action === "probe-camera") runAction(() => probeCamera(target.dataset.cameraId));
  if (action === "attach-camera") runAction(() => attachCamera(target.dataset.cameraId), "Камера добавлена в конференцию");
  if (action === "toggle-camera-auto-attach") runAction(() => toggleCameraAutoAttach(target.dataset.cameraId, target.dataset.enabled === "true"));
  if (action === "delete-camera") runAction(() => deleteCamera(target.dataset.cameraId), "Системная камера удалена");
  if (action === "start-media-worker") runAction(() => startMediaWorker(target.dataset.streamId), "Преобразование потока запущено");
  if (action === "start-multicast") runAction(() => startMulticast(target.dataset.streamId));
  if (action === "route-preview") runAction(() => routePreview(target.dataset.streamId), "Источник выведен в предпросмотр");
  if (action === "take-program") runAction(() => takeProgram("cut"), "Источник выведен в эфир");
  if (action === "fade-program") runAction(() => takeProgram("fade"), "Плавный переход выполнен");
  if (action === "resume-auto-director") runAction(resumeAutoDirector, "Автоматическое управление эфиром восстановлено");
  if (action === "discover-ndi") runAction(discoverNdiSources);
  if (action === "toggle-source-mute") runAction(async () => {
    state.meeting = await state.api.patch(`/meetings/${state.profile.meetingId}/audio-settings`, {
      sourceMute: { streamId: target.dataset.streamId, muted: target.dataset.muted !== "true" }
    });
  }, target.dataset.muted === "true" ? "Аудио источника включено" : "Аудио источника заглушено");
  if (action === "save-ndi-camera") runAction(() => saveNdiCamera(target.dataset.ndiId));
  if (action === "receive-ndi") runAction(() => receiveNdiSource(target.dataset.ndiId), "Приём источника NDI запущен");
  if (action === "receive-ndi-stream") runAction(() => receiveNdiStream(target.dataset.streamId), "Приём источника NDI запущен");
  if (action === "configure-ndi-output") runAction(() => configureNdiOutput(target.dataset.outputId));
  if (action === "toggle-ndi-output") runAction(() => toggleNdiOutput(target.dataset.outputId, target.dataset.enabled === "true"));
  if (action === "start-ndi-output") runAction(() => startNdiOutput(target.dataset.outputId), "NDI-выход запущен");
  if (action === "stop-ndi-job") runAction(() => stopNdiJob(target.dataset.jobId), "Выход NDI остановлен");
  if (action === "toggle-auto-director") runAction(toggleAutoDirector, "Режим автодиректора изменён");
  if (action === "save-pgm-mode") runAction(savePgmMode, "Режим трансляции оператора применён");
  if (action === "select-pgm-slate") runAction(() => selectPgmSlate(target.dataset.slateId), "Заставка выбрана");
  if (action === "delete-pgm-slate") runAction(() => deletePgmSlate(target.dataset.slateId, target.dataset.slateName), "Заставка удалена");
  if (action === "reset-pgm-mode") runAction(resetPgmMode, "Действует режим трансляции администратора");
  if (action === "create-vote") runAction(createVote, "Голосование создано");
  if (action === "import-archive-document") runAction(importArchivedDocument, "Документ скопирован из архива в личные материалы");
  if (action === "configure-vote-result") runAction(async () => {
    const vote = state.votes.find((item) => item.id === target.dataset.voteId);
    if (!vote) throw new Error("Голосование не найдено");
    const values = await httpForm("Настройки показа голосования", [
      {name:"autoTakePgm",label:"Показывать ход голосования в трансляции зала",type:"select",value:String(vote.displayPolicy?.autoTakePgm === true),options:[
        {value:"false",label:"Не показывать"},{value:"true",label:"Показывать автоматически"}]},
      {name:"resultTarget",label:"Итоги после закрытия",type:"select",value:vote.displayPolicy?.resultTarget ?? "none",options:[
        {value:"none",label:"Не показывать в трансляции"},{value:"tiles",label:"Плиткой в трансляции"},{value:"program",label:"Во весь экран трансляции"}]},
      {name:"resultHoldSeconds",label:"Время показа итогов, с",type:"number",value:vote.displayPolicy?.resultHoldSeconds ?? 30}
    ], "Сохранить", { onSubmit: (values) => state.api.patch(`/votes/${encodeURIComponent(vote.id)}`, { displayPolicy: {
      autoTakePgm: values.autoTakePgm === "true", resultTarget: values.resultTarget,
      resultHoldSeconds: Number(values.resultHoldSeconds) } }) });
    if (!values) return false;
  }, "Показ итогов настроен");
  if (action === "delete-vote") runAction(async () => {
    if (!await confirmDialog("Удалить проект голосования?", "Удалить", "Отмена")) return;
    await state.api.delete(`/votes/${target.dataset.voteId}`);
  }, "Проект голосования удалён");
  if (action === "open-vote") runAction(async () => {
    await state.api.post(`/votes/${target.dataset.voteId}/open`, { durationSeconds: Number(document.querySelector(`[data-vote-duration="${target.dataset.voteId}"]`)?.value || 60) });
    forgetFormDrafts(`vote-duration:${target.dataset.voteId}`);
  }, "Голосование открыто");
  // Closing early is irreversible: the result is fixed at this moment (A-13).
  if (action === "close-vote") runAction(async () => {
    if (!await confirmDialog("Закрыть голосование досрочно? Итоги будут зафиксированы, проголосовать больше будет нельзя.", "Закрыть голосование", "Отмена")) return false;
    await state.api.post(`/votes/${target.dataset.voteId}/close`);
  }, "Голосование закрыто");
  if (action === "cast-vote") runAction(() => castVote(target.dataset.voteId, target.dataset.optionId), "Голос принят");
  if (action === "cast-advanced-vote") runAction(async () => {
    await castAdvancedVote(target.dataset.voteId);
    forgetFormDrafts(`ballot:${target.dataset.voteId}`);
  }, "Бюллетень принят");
  if (action === "next-vote-round") runAction(() => createNextVoteRound(target.dataset.voteId), "Следующий тур подготовлен");
  if (action === "open-voting-page") selectTab("voting").catch((error) => notify(error));
  if (action === "translate-select") runAction(async () => {
    await state.api.put(`/meetings/${state.profile.meetingId}/translate-core/listeners/${encodeURIComponent(state.participantId)}`, { channelId: target.dataset.channelId });
    await closeServerAudioSubscriber();
    await watchServerAudioMix();
  }, "Язык прослушивания изменён");
  if (action === "translate-configure") runAction(async () => {
    const current = (state.translateMeeting?.channels ?? []).map((item) => `${item.id}=${item.name}`).join("\n");
    const values = await httpForm("Языки конференции", [{ name: "channels", label: "Один канал на строку: код=название", type: "textarea", value: current,
      placeholder: "en=Английский", hint: "Например: en=Английский, de=Немецкий" }], "Применить", { onSubmit: async (form) => {
      const channels = String(form.channels ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const [rawId, ...nameParts] = line.split("=");
        const id = rawId.trim().toLowerCase();
        const name = nameParts.join("=").trim() || id;
        return { id, name };
      });
      await state.api.put(`/meetings/${state.profile.meetingId}/translate-core`, { channels });
    } });
    if (!values) return false;
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
    forgetFormDrafts(`translation:${target.dataset.participantId}`);
  }, "Переводчик назначен");
  if (action === "open-vote-results") openVoteResultsModal(target.dataset.voteId);
  if (action === "create-presentation") runAction(() => state.api.post(`/meetings/${state.profile.meetingId}/presentations`, { documentId: target.dataset.documentId, title: target.dataset.fileName }), "Презентация создана");
  if (action === "download-document") runAction(() => openDocument(target.dataset.documentId));
  if (action === "delete-own-document") void withActionBusy(target, async () => {
    const document = state.documents.find((item) => item.id === target.dataset.documentId);
    if (!document || document.uploadedBy !== state.profile.userId) return;
    const question = document.agendaItemId
      ? `Удалить документ «${document.fileName}» из «Моих документов» и повестки вместе с черновыми пометками?`
      : `Удалить документ «${document.fileName}» и его черновые пометки?`;
    if (!await confirmDialog(question, "Удалить", "Отмена")) return;
    await runAction(async () => {
      await state.api.delete(`/documents/${encodeURIComponent(document.id)}`);
      state.documents = state.documents.filter((item) => item.id !== document.id);
      renderPage();
    }, "Документ удалён");
  });
  if (action === "start-presentation") runAction(() => startPresentationBroadcast(target.dataset.presentationId));
  if (action === "share-screen") runAction(shareScreen);
  if (action === "stop-screen-share") runAction(stopScreenShare);
  if (action === "next-page") runAction(() => state.api.post(`/presentations/${target.dataset.presentationId}/page`, { page: Number(target.dataset.page) }));
  if (action === "open-chat") runAction(() => openChat(target.dataset.participantId));
  if (action === "select-chat") { state.activeChatId = target.dataset.sessionId; markChatRead(state.activeChatId); renderPage(); }
  if (action === "check-readiness") runAction(checkReadiness, "Проверка готовности завершена");
  if (action === "check-device") runAction(() => checkDevice(target.dataset.deviceId), "Проверка устройства выполнена");
  if (action === "device-command") runAction(() => deviceCommand(target.dataset.deviceId), "Команда выполнена");
  if (action === "publish-signage-scene") {
    target.disabled = true;
    void publishSignageScene().then(() => {
      const status = document.querySelector("#signageFeedback");
      if (status) status.textContent = state.signageFeedback;
    }).catch((error) => {
      const status = document.querySelector("#signageFeedback");
      if (status) status.textContent = error.message;
    }).finally(() => { target.disabled = false; });
  }
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
  if (action === "service-reassign") runAction(() => serviceReassign(target.dataset.requestId));
  if (action === "service-confirm") runAction(() => serviceConfirm(target.dataset.requestId, target.dataset.status));
  if (action === "service-filter") { state.serviceFilter = target.dataset.filter; renderPage(); }
  if (action === "assign-seat") runAction(() => assignSeat(target.dataset.seatId));
  if (action === "release-seat") runAction(() => releaseSeat(target.dataset.seatId), "Место освобождено");
  if (action === "claim-seat") runAction(claimSeat, "Временная сессия активирована");
  if (action === "install-pwa") installPwa();
  if (action === "toggle-auto-camera-pref") toggleLocalMediaPreference(CAMERA_AUTO_KEY);
  if (action === "toggle-auto-microphone-pref") toggleLocalMediaPreference(MICROPHONE_AUTO_KEY);
  if (action === "toggle-fullscreen") toggleFullscreen();
  if (action === "toggle-program-fullscreen") {
    const panel = target.closest(".conference-program-panel");
    if (!panel) return;
    if (document.documentElement.classList.contains("program-fullscreen-mode")) {
      document.documentElement.classList.remove("program-fullscreen-mode");
      return;
    }
    if (document.fullscreenElement === panel || document.webkitFullscreenElement === panel) {
      void (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    } else {
      const request = panel.requestFullscreen ?? panel.webkitRequestFullscreen;
      if (request) void Promise.resolve(request.call(panel)).catch(() => {
        document.documentElement.classList.add("program-fullscreen-mode");
      });
      else document.documentElement.classList.add("program-fullscreen-mode");
    }
  }
}

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) document.documentElement.classList.remove("program-fullscreen-mode");
  const button = document.querySelector(".conference-program-panel .program-fullscreen-button");
  const expanded = button?.closest(".conference-program-panel") === document.fullscreenElement;
  button?.setAttribute("aria-label", expanded ? "Свернуть трансляцию" : "Развернуть трансляцию на весь экран");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.fullscreenElement) document.documentElement.classList.remove("program-fullscreen-mode");
});

const startPublishingWithAccessHint = () => startPublishing().catch((error) => { throw mediaAccessError(error, "camera"); });
$("#cameraToggleBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled) return;
  const published = hasLocalVideo() && state.publishedStream;
  button.disabled = true;
  try {
    await runAction(published ? stopCamera : startPublishingWithAccessHint,
      published ? "Камера выключена" : "Камера опубликована");
  } finally {
    button.disabled = false;
    renderFixedControls();
  }
});

$("#mediaAccessBtn")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true;
  try {
    await enableLocalAv();
    notify("Камера и микрофон готовы", 3000);
  } catch (error) {
    state.mediaPermissionPending = true;
    notify(`Не удалось включить камеру и микрофон. ${mediaAccessError(error).message}`, 9000, { tone: "error" });
  } finally {
    button.disabled = false;
    renderFixedControls();
  }
});

$("#microphoneDock").addEventListener("click", (event) => {
  if (handlePresentationControlAction(event.target.closest("[data-action]"))) return;
  if (event.target.closest('[data-action="secretary-toggle-recording"]')) {
    const toggle = event.target.closest('[data-action="secretary-toggle-recording"]');
    state.actionTrigger = toggle;
    try {
      runAction(() => state.api.put(`/meetings/${state.profile.meetingId}/recording`,
        { enabled: !state.recordingStatus?.enabled }), "Режим записи обновлён");
    } finally { state.actionTrigger = null; }
    return;
  }
  handleMicrophoneAction(event.target.closest("[data-mic-action]"))
    .catch((error) => notify(error));
});

window.addEventListener("beforeinstallprompt", (event) => {
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
// A hidden tab (or a locked iPad) keeps only the presence heartbeat and the
// event stream; everything else stops and one refresh runs on return.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (state.api) stopForegroundTimers(); return; }
  scheduleVideoRecovery("pageshow");
  if (!state.api || !state.heartbeatTimer || state.refreshTimer) return;
  startForegroundTimers();
  void refreshAll(true);
  void pollSignaling();
});

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
    if (await consumeConferenceHandoff()) return;
  } catch (error) {
    connectError(`Не удалось войти: ${error.message}`);
    return;
  }
  if (await restoreActiveSession()) return;
  location.replace("/conference/");
}
bootstrapClient().catch((error) => connectError(`Ошибка запуска: ${error.message}`));

navigator.mediaDevices?.addEventListener?.("devicechange", () => {
  updateHeadphoneWarning();
  refreshMediaDevices().then(() => {
    if (state.activeTab === "streams") renderPage();
  }).catch(() => {});
});
