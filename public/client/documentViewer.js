import * as pdfjsLib from "./vendor/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;

const COLORS = ["#E03446", "#245DC1", "#21805B", "#8A47BA", "#BA6519", "#087C91",
  "#9B416E", "#647827", "#7148D0", "#008C79", "#AA4D37", "#365892"];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TOOL_ICONS = {
  move: '<path d="M3 9V7a2 2 0 0 1 4 0v2-4a2 2 0 0 1 4 0v4-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v6c0 4-2 7-6 7H9c-2 0-3-1-4-3l-2-4a2 2 0 0 1 3-2l1 1"/>',
  pen: '<path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/><path d="m14 7 3 3M3 22h18"/>',
  marker: '<path d="m4 17 7-7 4 4-7 7H4v-4ZM13 8l2-2 4 4-2 2M3 22h18"/>',
  eraser: '<path d="m3 15 9-10a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-6 7H9l-6-6Z"/><path d="m8 10 8 8M15 21h7"/>',
  'move-annotation': '<path d="M12 2v20M2 12h20m-10-10-3 3m3-3 3 3m-3 17-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m17-3-3-3m3 3-3 3"/>',
  line: '<path d="M4 20 20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  text: '<path d="M4 6V4h16v2M12 4v16m-4 0h8"/>'
};
const FOLLOW_ICONS = {
  locked: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  open: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/>'
};
const followIcon = (following) => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  FOLLOW_ICONS[following ? "locked" : "open"] + '</svg>';
const toolButton = (name, label, selected = false) => '<button type="button" data-tool="' + name + '"' +
  (selected ? ' class="selected"' : '') + ' title="' + label + '" aria-label="' + label +
  '" aria-pressed="' + selected + '">' +
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  TOOL_ICONS[name] + '</svg></button>';
let current = null;

function viewerError(viewer, message) {
  let note = viewer.root.querySelector(".document-viewer-error");
  if (!note) {
    note = document.createElement("p");
    note.className = "document-viewer-error";
    viewer.root.querySelector(".document-viewer-header").after(note);
  }
  note.textContent = message;
  clearTimeout(viewer.errorTimer);
  viewer.errorTimer = setTimeout(() => note.remove(), 5000);
}

function askAnnotationText(viewer) {
  return new Promise((resolve) => {
    const panel = document.createElement("div");
    panel.className = "document-text-dialog";
    panel.innerHTML = '<form><label>Текст пометки<input type="text" maxlength="500" required></label>' +
      '<div><button type="button" data-cancel>Отмена</button><button type="submit">Сохранить</button></div></form>';
    viewer.root.append(panel);
    const finish = (value) => { panel.remove(); resolve(value); };
    panel.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
    panel.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      finish(panel.querySelector("input").value.trim() || null);
    });
    panel.querySelector("input").focus();
  });
}

function askBroadcastTarget(viewer) {
  return new Promise((resolve) => {
    const panel = document.createElement("div");
    panel.className = "document-text-dialog";
    panel.innerHTML = '<form class="document-broadcast-choice" role="dialog" aria-label="Куда отправить документ">' +
      '<button type="button" class="dialog-icon-close" data-cancel aria-label="Закрыть">×</button>' +
      '<h3>Куда отправить документ?</h3><p>Выберите способ показа в зале.</p>' +
      '<div><button type="button" data-target="program">Во весь экран · PGM</button>' +
      '<button type="button" data-target="multiview">Отдельной плиткой в PGM</button></div></form>';
    viewer.root.append(panel);
    const finish = (target) => { panel.remove(); resolve(target); };
    panel.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
    panel.querySelectorAll("[data-target]").forEach((button) =>
      button.addEventListener("click", () => finish(button.dataset.target)));
    panel.querySelector("[data-target]")?.focus();
  });
}

function svgFor(annotation) {
  const points = annotation.points ?? [];
  const at = (point) => (point[0] * 1000).toFixed(2) + "," + (point[1] * 1000).toFixed(2);
  const color = COLORS.includes(annotation.color) ? annotation.color : "#111111";
  const width = clamp(Number(annotation.width) || 3, 1, 36) * 1000 / 900;
  const attrs = ' data-annotation-id="' + escapeHtml(annotation.id) + '" data-author="' +
    escapeHtml(annotation.authorName) + '" fill="none" stroke="' + color +
    '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"';
  if (annotation.tool === "circle" && points.length >= 2) {
    const left = points[0][0] * 1000, top = points[0][1] * 1000;
    return '<ellipse' + attrs + ' cx="' + ((left + points[1][0] * 1000) / 2) +
      '" cy="' + ((top + points[1][1] * 1000) / 2) + '" rx="' +
      Math.abs(points[1][0] * 1000 - left) / 2 + '" ry="' +
      Math.abs(points[1][1] * 1000 - top) / 2 + '"/>';
  }
  if (annotation.tool === "text") {
    return '<text data-annotation-id="' + escapeHtml(annotation.id) + '" data-author="' +
      escapeHtml(annotation.authorName) + '" x="' + points[0][0] * 1000 + '" y="' +
      points[0][1] * 1000 + '" fill="' + color + '" font-size="' +
      clamp(Number(annotation.fontSize) || 28, 8, 96) + '">' +
      escapeHtml(annotation.text) + '</text>';
  }
  if (points.length === 1) {
    return '<circle data-annotation-id="' + escapeHtml(annotation.id) + '" data-author="' +
      escapeHtml(annotation.authorName) + '" cx="' + points[0][0] * 1000 + '" cy="' +
      points[0][1] * 1000 + '" r="' + Math.max(2, width / 2) + '" fill="' + color + '"' +
      (annotation.tool === "marker" ? ' opacity=".42"' : '') + '/>';
  }
  return '<polyline' + attrs + ' points="' + points.map(at).join(" ") + '"' +
    (annotation.tool === "marker" ? ' opacity=".42" stroke-width="' + Math.max(15, width * 5) + '"' : "") + '/>';
}

export function minimizeDocumentViewer() {
  if (!current?.presentation) return;
  current.minimized = true;
  current.root.hidden = true;
}

export function expandPresentationViewer(presentationId) {
  if (!current?.minimized || current.presentation?.id !== presentationId) return false;
  current.minimized = false;
  current.root.hidden = false;
  current.root.querySelector('[data-viewer="close"]')?.focus();
  return true;
}

export function closePresentationViewer(presentationId) {
  if (current?.presentation?.id === presentationId) closeDocumentViewer();
}

export function closeDocumentViewer() {
  if (!current) return;
  current.layoutObserver?.disconnect();
  clearInterval(current.poll);
  clearTimeout(current.viewportTimer);
  clearTimeout(current.pendingRefresh);
  current.pageRender?.cancel();
  current.abort?.abort();
  current.root.remove();
  current = null;
}

function sizePresentationStage(viewer) {
  if (!viewer.presentation) return;
  const shell = viewer.root.querySelector(".document-viewer");
  const header = viewer.root.querySelector(".document-viewer-header");
  const tools = viewer.root.querySelector(".document-viewer-tools");
  const availableHeight = Math.max(1, shell.clientHeight - header.offsetHeight - tools.offsetHeight - 16);
  const width = Math.max(1, Math.min(shell.clientWidth - 24, availableHeight * 16 / 9));
  viewer.stage.style.width = width + "px";
  viewer.stage.style.height = width * 9 / 16 + "px";
}

export function updateDocumentViewerRights({ canView, canAnnotate }) {
  if (!current) return;
  if (!canView && !current.draft) { closeDocumentViewer(); return; }
  current.canAnnotate = Boolean((canAnnotate || current.draft) && (current.presentation || current.draft));
  if (!current.canAnnotate) {
    current.tool = "move";
    current.overlay.style.touchAction = "auto";
    current.drawing = null;
    current.moving = null;
    current.root.querySelector(".document-font-size")?.setAttribute("hidden", "");
    current.root.querySelectorAll("[data-tool]").forEach((button) => {
      const selected = button.dataset.tool === "move";
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  for (const button of current.root.querySelectorAll("[data-tool]")) {
    button.disabled = !current.canAnnotate && button.dataset.tool !== "move";
  }
  const colors = current.root.querySelector("[data-viewer-colors]");
  if (colors) colors.hidden = !current.canAnnotate;
  if (current.ready && current.canAnnotate && current.sceneBase && !current.color) {
    refreshScene(current).catch((error) => viewerError(current, error.message));
  }
}

export function documentSceneEvent(eventType, payload) {
  if (!current?.sceneId || !eventType.startsWith("document-scene.")) return;
  if (payload?.presentationId !== current.sceneId) return;
  if (current.pendingRefresh) return;
  current.pendingRefresh = setTimeout(async () => {
    const viewer = current;
    if (!viewer) return;
    viewer.pendingRefresh = null;
    await refreshScene(viewer).catch(() => {});
  }, 60);
}

async function refreshScene(viewer) {
  if (current !== viewer || !viewer.sceneBase) return;
  let scene = await viewer.api.get(viewer.scenePath);
  if (current !== viewer) return;
  if (viewer.canAnnotate && !scene.authors[viewer.userId] && !viewer.assigningColor) {
    viewer.assigningColor = true;
    try {
      scene = await viewer.api.post(viewer.sceneBase + "/color", {});
    } finally { viewer.assigningColor = false; }
  }
  if (current !== viewer || scene.revision < (viewer.scene?.revision ?? -1)) return;
  const prior = viewer.scene;
  viewer.scene = scene;
  const own = scene.authors[viewer.userId];
  viewer.color = own?.color ?? null;
  const used = new Set(Object.values(scene.authors).map((item) => item.color));
  viewer.colors.innerHTML = COLORS.map((color) => {
    const occupied = used.has(color) && color !== viewer.color;
    return '<button type="button" class="document-color' + (color === viewer.color ? ' selected' : '') +
      '" data-color="' + color + '" style="--swatch:' + color + '" title="' +
      (occupied ? 'Цвет занят' : 'Выбрать цвет') + '" ' + (occupied ? 'disabled' : '') + '></button>';
  }).join("");
  viewer.legend.innerHTML = Object.values(scene.authors).map((item) =>
    '<span><i style="background:' + item.color + '"></i>' + escapeHtml(item.displayName) + '</span>').join("");
  drawAnnotations(viewer);
  if (viewer.follow && (!prior || JSON.stringify(prior.viewport) !== JSON.stringify(scene.viewport))) {
    await applyViewport(viewer, scene.viewport);
  }
}

function drawAnnotations(viewer) {
  if (!viewer.scene) return;
  viewer.overlay.innerHTML = '<rect x="0" y="0" width="1000" height="1000" fill="transparent" pointer-events="all"></rect>' +
    viewer.scene.annotations.filter((item) => item.page === viewer.page).map(svgFor).join("");
}

async function renderPage(viewer) {
  const token = ++viewer.renderToken;
  if (viewer.pageRender) {
    viewer.pageRender.cancel();
    await viewer.pageRender.promise.catch(() => {});
    if (token !== viewer.renderToken || current !== viewer) return;
  }
  const scale = viewer.zoom;
  const stageStyle = getComputedStyle(viewer.stage);
  const availableWidth = Math.max(320, viewer.stage.clientWidth -
    parseFloat(stageStyle.paddingLeft) - parseFloat(stageStyle.paddingRight));
  let width = availableWidth * scale, height = width * 1.414;
  if (viewer.pdf) {
    const page = await viewer.pdf.getPage(viewer.page);
    const raw = page.getViewport({ scale: 1 });
    width = availableWidth * scale;
    height = width * raw.height / raw.width;
    const renderScale = Math.min(width * devicePixelRatio / raw.width, 4096 / raw.width);
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = viewer.canvas;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
    viewer.pageRender = task;
    try { await task.promise; }
    finally { if (viewer.pageRender === task) viewer.pageRender = null; }
  } else if (viewer.image) {
    width = availableWidth * scale;
    height = width * viewer.image.naturalHeight / viewer.image.naturalWidth;
    viewer.canvas.width = Math.min(4096, viewer.image.naturalWidth);
    viewer.canvas.height = Math.min(4096, viewer.image.naturalHeight);
    viewer.canvas.style.width = width + "px";
    viewer.canvas.style.height = height + "px";
    viewer.canvas.getContext("2d").drawImage(viewer.image, 0, 0, viewer.canvas.width, viewer.canvas.height);
  } else if (viewer.text !== null) {
    width = availableWidth * scale;
    height = Math.max(1100, Math.ceil(viewer.text.length / 75) * 22) * scale;
    viewer.canvas.width = Math.floor(width);
    viewer.canvas.height = Math.floor(height);
    viewer.canvas.style.width = width + "px";
    viewer.canvas.style.height = height + "px";
    const ctx = viewer.canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#222"; ctx.font = Math.max(16, 18 * scale) + "px monospace";
    viewer.text.split("\n").forEach((line, index) => ctx.fillText(line.slice(0, 250), 30, 45 + index * 24 * scale));
  }
  if (token !== viewer.renderToken || current !== viewer) return;
  viewer.paper.style.width = width + "px";
  viewer.paper.style.height = height + "px";
  viewer.overlay.setAttribute("viewBox", "0 0 1000 1000");
  viewer.pageLabel.textContent = viewer.page + " / " + viewer.pageCount;
  viewer.zoomLabel.textContent = Math.round(scale * 100) + "%";
  drawAnnotations(viewer);
}

async function applyViewport(viewer, viewport) {
  if (current !== viewer || !viewport) return;
  viewer.applyingViewport = true;
  try {
    if (viewer.page !== viewport.page || viewer.zoom !== viewport.zoom) {
      viewer.page = clamp(viewport.page, 1, viewer.pageCount);
      viewer.zoom = viewport.zoom;
      await renderPage(viewer);
    }
    viewer.stage.scrollLeft = clamp(viewer.paper.offsetLeft + viewport.centerX * viewer.paper.clientWidth -
      viewer.stage.clientWidth / 2, 0, viewer.stage.scrollWidth);
    viewer.stage.scrollTop = clamp(viewer.paper.offsetTop + viewport.centerY * viewer.paper.clientHeight -
      viewer.stage.clientHeight / 2, 0, viewer.stage.scrollHeight);
  } finally {
    viewer.applyingViewport = false;
  }
}

function scheduleViewport(viewer) {
  if (!viewer.canDriveViewport || viewer.applyingViewport || current !== viewer) return;
  clearTimeout(viewer.viewportTimer);
  viewer.viewportTimer = setTimeout(async () => {
    const x = clamp((viewer.stage.scrollLeft + viewer.stage.clientWidth / 2 -
      viewer.paper.offsetLeft) / viewer.paper.clientWidth, 0, 1);
    const y = clamp((viewer.stage.scrollTop + viewer.stage.clientHeight / 2 -
      viewer.paper.offsetTop) / viewer.paper.clientHeight, 0, 1);
    await viewer.api.post("/presentations/" + viewer.presentation.id + "/viewport", {
      page: viewer.page, zoom: viewer.zoom, centerX: x, centerY: y
    }).catch(() => {});
  }, 160);
}

function updateFollowingButton(viewer) {
  const button = viewer.root.querySelector('[data-viewer="follow"]');
  if (!button) return;
  const label = viewer.follow ? "Следую за ведущим · отключить" : "Свободный просмотр · следовать за ведущим";
  button.innerHTML = followIcon(viewer.follow);
  button.title = label;
  button.setAttribute("aria-label", label);
  button.classList.toggle("selected", viewer.follow);
  button.setAttribute("aria-pressed", String(viewer.follow));
}

function pauseFollowing(viewer) {
  if (!viewer.followAvailable || !viewer.follow) return;
  viewer.follow = false;
  updateFollowingButton(viewer);
}

async function setZoom(viewer, zoom, clientX = null, clientY = null) {
  const next = clamp(Math.round(zoom * 100) / 100, .25, 8);
  if (next === viewer.zoom) return;
  pauseFollowing(viewer);
  const rect = viewer.stage.getBoundingClientRect();
  const anchorX = clientX === null ? rect.width / 2 : clientX - rect.left;
  const anchorY = clientY === null ? rect.height / 2 : clientY - rect.top;
  const relativeX = (viewer.stage.scrollLeft + anchorX - viewer.paper.offsetLeft) / viewer.paper.clientWidth;
  const relativeY = (viewer.stage.scrollTop + anchorY - viewer.paper.offsetTop) / viewer.paper.clientHeight;
  viewer.zoom = next;
  await renderPage(viewer);
  viewer.stage.scrollLeft = viewer.paper.offsetLeft + relativeX * viewer.paper.clientWidth - anchorX;
  viewer.stage.scrollTop = viewer.paper.offsetTop + relativeY * viewer.paper.clientHeight - anchorY;
  scheduleViewport(viewer);
}

function pointFromEvent(viewer, event) {
  const rect = viewer.overlay.getBoundingClientRect();
  return [clamp((event.clientX - rect.left) / rect.width, 0, 1),
    clamp((event.clientY - rect.top) / rect.height, 0, 1)];
}

export async function openDocumentViewer({ api, document: item, presentation = null,
  userId, participantId = null, quickMeeting = false, canAnnotate = false, canControl = false,
  draft = false, onSendToHall = null, onStopPresentation = null,
  archiveScene = null }) {
  closeDocumentViewer();
  const isPresentationLeader = presentation?.leaderParticipantId
    ? presentation.leaderParticipantId === participantId
    : presentation?.leaderUserId ? presentation.leaderUserId === userId
      : presentation?.leaderAssigned ? false
        : presentation?.startedByParticipantId ? presentation.startedByParticipantId === participantId
        : presentation?.startedBy === userId;
  const canDriveViewport = Boolean(presentation && (quickMeeting ? isPresentationLeader : canControl));
  const hasLeader = !presentation?.leaderAssigned || Boolean(presentation.leaderParticipantId || presentation.leaderUserId);
  const followAvailable = Boolean(presentation && hasLeader && !archiveScene && !canDriveViewport);
  const response = await api.request("/documents/" + encodeURIComponent(item.id) + "/content");
  const blob = await response.blob();
  const root = document.createElement("div");
  root.className = "document-viewer-backdrop";
  root.innerHTML = '<section class="document-viewer' + (presentation ? ' document-viewer-presentation' : '') +
    '" role="dialog" aria-modal="true" aria-label="Просмотр документа">' +
    '<header class="document-viewer-header"><div class="document-viewer-title"><small>МАТЕРИАЛЫ</small><h2></h2></div>' +
    '<div class="document-viewer-controls"><div class="document-viewer-control-group"><button type="button" data-viewer="prev" aria-label="Предыдущая страница">←</button>' +
    '<span data-viewer-page></span><button type="button" data-viewer="next" aria-label="Следующая страница">→</button></div>' +
    '<div class="document-viewer-control-group"><button type="button" data-viewer="minus" aria-label="Уменьшить масштаб">−</button><span data-viewer-zoom></span>' +
    '<button type="button" data-viewer="plus" aria-label="Увеличить масштаб">+</button></div>' +
    (canControl ? '<button type="button" class="button" data-viewer="hall">' +
      (presentation?.programStreamId ? 'Завершить показ в PGM' :
        presentation?.multiviewStreamId ? 'Убрать плитку из PGM' : 'Отправить в зал') + '</button>' : '') +
    '<button type="button" class="dialog-icon-close" data-viewer="close" aria-label="Закрыть">×</button></div></header>' +
    (presentation || draft ? '<nav class="document-viewer-tools" aria-label="Инструменты пометок">' +
      toolButton('move', 'Перемещение документа', true) +
      (followAvailable ? '<button type="button" data-viewer="follow" class="selected" aria-pressed="true" title="Следую за ведущим · отключить" aria-label="Следую за ведущим · отключить">' + followIcon(true) + '</button>' : '') +
      toolButton('pen', 'Перо') +
      toolButton('marker', 'Маркер') + toolButton('line', 'Линия') +
      toolButton('circle', 'Окружность') + toolButton('text', 'Текст') +
      '<label class="document-font-size" hidden>Размер текста<select data-font-size aria-label="Размер текста">' +
      '<option value="16">16</option><option value="24">24</option><option value="28" selected>28</option>' +
      '<option value="36">36</option><option value="48">48</option><option value="64">64</option></select></label>' +
      toolButton('move-annotation', 'Переместить свою пометку') +
      toolButton('eraser', 'Стереть свою пометку') +
      '<div data-viewer-colors></div>' +
      '<aside data-viewer-legend aria-label="Авторы пометок"></aside></nav>' : '') +
    '<div class="document-viewer-stage"><div class="document-viewer-paper"><canvas></canvas>' +
    '<svg class="document-viewer-overlay" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg></div></div>' +
    '<div class="document-viewer-owner" hidden></div></section>';
  document.body.append(root);
  const sceneBase = archiveScene ? null : presentation ? "/presentations/" + presentation.id :
    draft ? "/documents/" + item.id + "/draft" : null;
  const viewer = { api, item, presentation, draft, userId, canAnnotate, canControl,
    canDriveViewport, followAvailable, onSendToHall, onStopPresentation,
    sceneBase, scenePath: presentation ? sceneBase + "/scene" : sceneBase,
    sceneId: presentation?.id ?? (draft ? "draft:" + item.id : null),
    root, stage: root.querySelector(".document-viewer-stage"),
    paper: root.querySelector(".document-viewer-paper"), canvas: root.querySelector("canvas"),
    overlay: root.querySelector(".document-viewer-overlay"), colors: root.querySelector("[data-viewer-colors]"),
    legend: root.querySelector("[data-viewer-legend]"), pageLabel: root.querySelector("[data-viewer-page]"),
    zoomLabel: root.querySelector("[data-viewer-zoom]"), owner: root.querySelector(".document-viewer-owner"),
    page: 1, pageCount: 1, zoom: 1, tool: "move", fontSize: 28,
    follow: followAvailable,
    renderToken: 0, text: null };
  current = viewer;
  root.querySelector('[data-viewer="close"]').addEventListener("click", () => {
    if (current !== viewer) return;
    if (viewer.presentation && !archiveScene && viewer.canControl) minimizeDocumentViewer();
    else closeDocumentViewer();
  });
  updateDocumentViewerRights({ canView: true, canAnnotate });
  root.querySelector("h2").textContent = item.fileName;
  if (presentation) {
    sizePresentationStage(viewer);
    viewer.layoutObserver = new ResizeObserver(() => {
      if (current !== viewer) return;
      const x = (viewer.stage.scrollLeft + viewer.stage.clientWidth / 2 - viewer.paper.offsetLeft) /
        Math.max(1, viewer.paper.clientWidth);
      const y = (viewer.stage.scrollTop + viewer.stage.clientHeight / 2 - viewer.paper.offsetTop) /
        Math.max(1, viewer.paper.clientHeight);
      const oldWidth = viewer.stage.clientWidth;
      sizePresentationStage(viewer);
      if (Math.abs(viewer.stage.clientWidth - oldWidth) < 1 || !viewer.ready) return;
      renderPage(viewer).then(() => {
        if (current !== viewer) return;
        viewer.stage.scrollLeft = viewer.paper.offsetLeft + x * viewer.paper.clientWidth -
          viewer.stage.clientWidth / 2;
        viewer.stage.scrollTop = viewer.paper.offsetTop + y * viewer.paper.clientHeight -
          viewer.stage.clientHeight / 2;
      }).catch((error) => viewerError(viewer, error.message));
    });
    viewer.layoutObserver.observe(root.querySelector(".document-viewer"));
    viewer.layoutObserver.observe(root.querySelector(".document-viewer-header"));
    viewer.layoutObserver.observe(root.querySelector(".document-viewer-tools"));
  }
  try {
    if (item.mediaType === "application/pdf" || /\.pdf$/i.test(item.fileName)) {
      viewer.pdf = await pdfjsLib.getDocument({
        data: await blob.arrayBuffer(),
        cMapUrl: new URL("./vendor/pdf-cmaps/", import.meta.url).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("./vendor/pdf-standard-fonts/", import.meta.url).href
      }).promise;
      viewer.pageCount = viewer.pdf.numPages;
    } else if (item.mediaType.startsWith("image/")) {
      viewer.image = new Image();
      const url = URL.createObjectURL(blob);
      viewer.image.src = url;
      await viewer.image.decode();
      URL.revokeObjectURL(url);
    } else if (/\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(item.fileName)) {
      const preview = await api.request("/documents/" + encodeURIComponent(item.id) + "/preview.pdf");
      viewer.pdf = await pdfjsLib.getDocument({
        data: await preview.arrayBuffer(),
        cMapUrl: new URL("./vendor/pdf-cmaps/", import.meta.url).href,
        cMapPacked: true,
        standardFontDataUrl: new URL("./vendor/pdf-standard-fonts/", import.meta.url).href
      }).promise;
      viewer.pageCount = viewer.pdf.numPages;
    } else if (item.mediaType.startsWith("text/") || /\.(txt|md|csv|log)$/i.test(item.fileName)) {
      viewer.text = await blob.text();
    } else {
      root.querySelector(".document-viewer-stage").innerHTML =
        '<p class="document-viewer-unsupported">Для этого формата нужен серверный конвертер страниц. ' +
        'Файл доступен для скачивания.</p><a class="button" download>Скачать документ</a>';
      root.querySelector("a").href = URL.createObjectURL(blob);
      return;
    }
    if (current !== viewer) return;
    await renderPage(viewer);
    if (current !== viewer) return;
    viewer.ready = true;
    if (archiveScene) {
      viewer.scene = archiveScene;
      viewer.legend.innerHTML = Object.values(archiveScene.authors ?? {}).map((author) =>
        '<span><i style="background:' + author.color + '"></i>' + escapeHtml(author.displayName) + '</span>').join("");
      drawAnnotations(viewer);
    } else if (viewer.sceneBase) {
      await refreshScene(viewer);
      if (current !== viewer) return;
      viewer.poll = setInterval(() => refreshScene(viewer).catch(() => {}), 4000);
    }
  } catch (error) {
    if (current !== viewer) return;
    closeDocumentViewer();
    throw error;
  }

  if (current !== viewer) return;

  viewer.stage.addEventListener("scroll", () => scheduleViewport(viewer), { passive: true });
  viewer.stage.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom(viewer, viewer.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY)
      .catch((error) => viewerError(viewer, error.message));
  }, { passive: false });
  viewer.stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || viewer.tool !== "move" || event.target.closest("[data-annotation-id]")) return;
    viewer.drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: viewer.stage.scrollLeft, top: viewer.stage.scrollTop };
    viewer.stage.setPointerCapture(event.pointerId);
    viewer.stage.classList.add("dragging");
  });
  viewer.stage.addEventListener("pointermove", (event) => {
    if (!viewer.drag || event.pointerId !== viewer.drag.id) return;
    if (event.clientX !== viewer.drag.x || event.clientY !== viewer.drag.y) pauseFollowing(viewer);
    viewer.stage.scrollLeft = viewer.drag.left + viewer.drag.x - event.clientX;
    viewer.stage.scrollTop = viewer.drag.top + viewer.drag.y - event.clientY;
  });
  const finishDrag = (event) => {
    if (viewer.drag?.id !== event.pointerId) return;
    viewer.drag = null;
    viewer.stage.classList.remove("dragging");
  };
  viewer.stage.addEventListener("pointerup", finishDrag);
  viewer.stage.addEventListener("pointercancel", finishDrag);
  viewer.stage.addEventListener("touchstart", (event) => {
    if (event.touches.length >= 2) {
      viewer.drawing = null;
      const [a, b] = event.touches;
      viewer.touch = { kind: "pinch", distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: viewer.zoom, ratio: 1, x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      pauseFollowing(viewer);
      event.preventDefault();
    } else if (viewer.tool === "move") {
      const touch = event.touches[0];
      viewer.touch = { kind: "pan", x: touch.clientX, y: touch.clientY,
        left: viewer.stage.scrollLeft, top: viewer.stage.scrollTop };
    }
  }, { passive: false });
  viewer.stage.addEventListener("touchmove", (event) => {
    if (event.touches.length >= 2 && viewer.touch?.kind === "pinch") {
      const [a, b] = event.touches;
      viewer.touch.ratio = clamp(Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) /
        Math.max(1, viewer.touch.distance), .25 / viewer.touch.zoom, 8 / viewer.touch.zoom);
      viewer.touch.x = (a.clientX + b.clientX) / 2;
      viewer.touch.y = (a.clientY + b.clientY) / 2;
      viewer.paper.style.transform = `scale(${viewer.touch.ratio})`;
      viewer.paper.style.transformOrigin = "center center";
      viewer.zoomLabel.textContent = Math.round(viewer.touch.zoom * viewer.touch.ratio * 100) + "%";
      event.preventDefault();
    } else if (event.touches.length === 1 && viewer.touch?.kind === "pan") {
      const touch = event.touches[0];
      if (touch.clientX !== viewer.touch.x || touch.clientY !== viewer.touch.y) pauseFollowing(viewer);
      viewer.stage.scrollLeft = viewer.touch.left + viewer.touch.x - touch.clientX;
      viewer.stage.scrollTop = viewer.touch.top + viewer.touch.y - touch.clientY;
      event.preventDefault();
    }
  }, { passive: false });
  viewer.stage.addEventListener("touchend", (event) => {
    if (viewer.touch?.kind === "pinch" && event.touches.length < 2) {
      const { zoom, ratio, x, y } = viewer.touch;
      viewer.touch = null;
      viewer.paper.style.transform = "";
      viewer.paper.style.transformOrigin = "";
      setZoom(viewer, zoom * ratio, x, y).catch((error) => viewerError(viewer, error.message));
    } else if (!event.touches.length) viewer.touch = null;
  });
  viewer.stage.addEventListener("pointerdown", (event) => {
    const marked = event.target.closest("[data-annotation-id]");
    if (marked) {
      const annotation = viewer.scene?.annotations.find((item) => item.id === marked.dataset.annotationId);
      if (viewer.canAnnotate && annotation?.authorId === viewer.userId &&
          viewer.tool === "eraser") {
        event.preventDefault();
        viewer.api.delete(viewer.sceneBase + "/annotations/" + annotation.id)
          .then(() => refreshScene(viewer)).catch((error) => viewerError(viewer, error.message));
        return;
      }
      if (viewer.canAnnotate && annotation?.authorId === viewer.userId &&
          viewer.tool === "move-annotation") {
        event.preventDefault();
        viewer.stage.setPointerCapture(event.pointerId);
        viewer.moving = { id: event.pointerId, annotation,
          start: pointFromEvent(viewer, event) };
        return;
      }
      viewer.owner.hidden = false;
      viewer.owner.textContent = marked.dataset.author;
      viewer.owner.style.left = event.clientX + "px";
      viewer.owner.style.top = event.clientY + "px";
      setTimeout(() => { if (current === viewer) viewer.owner.hidden = true; }, 3500);
      return;
    }
    if (!viewer.canAnnotate || ["move", "eraser", "move-annotation"].includes(viewer.tool)) return;
    if (!viewer.color) { viewerError(viewer, "Свободный цвет пометок пока не назначен"); return; }
    event.preventDefault();
    viewer.stage.setPointerCapture(event.pointerId);
    viewer.drawing = [pointFromEvent(viewer, event)];
  });
  viewer.stage.addEventListener("pointermove", (event) => {
    if (viewer.moving?.id === event.pointerId) {
      const { annotation, start } = viewer.moving;
      const now = pointFromEvent(viewer, event);
      const xs = annotation.points.map((point) => point[0]);
      const ys = annotation.points.map((point) => point[1]);
      const dx = clamp(now[0] - start[0], -Math.min(...xs), 1 - Math.max(...xs));
      const dy = clamp(now[1] - start[1], -Math.min(...ys), 1 - Math.max(...ys));
      viewer.moving.points = annotation.points.map(([x, y]) => [x + dx, y + dy]);
      drawAnnotations(viewer);
      const preview = viewer.overlay.querySelector('[data-annotation-id="' + annotation.id + '"]');
      if (preview) preview.outerHTML = svgFor({ ...annotation, points: viewer.moving.points });
      return;
    }
    if (!viewer.drawing) return;
    if (["pen", "marker"].includes(viewer.tool) || viewer.drawing.length < 2) {
      viewer.drawing.push(pointFromEvent(viewer, event));
    } else viewer.drawing[1] = pointFromEvent(viewer, event);
    const provisional = { id: "draft", tool: viewer.tool, page: viewer.page,
      points: viewer.drawing, color: viewer.color, width: viewer.tool === "marker" ? 12 : 3 };
    drawAnnotations(viewer);
    viewer.overlay.insertAdjacentHTML("beforeend", svgFor(provisional));
  });
  viewer.stage.addEventListener("pointerup", async (event) => {
    if (viewer.moving?.id === event.pointerId) {
      const moved = viewer.moving;
      viewer.moving = null;
      if (moved.points) {
        try {
          await viewer.api.patch(viewer.sceneBase + "/annotations/" + moved.annotation.id,
            { points: moved.points });
          await refreshScene(viewer);
        } catch (error) { drawAnnotations(viewer); viewerError(viewer, error.message); }
      }
      return;
    }
    if (!viewer.drawing) return;
    const points = viewer.drawing;
    viewer.drawing = null;
    if (points.length === 1 && viewer.tool !== "text") {
      const [x, y] = points[0];
      const dx = 4 / Math.max(1, viewer.paper.clientWidth);
      const dy = 4 / Math.max(1, viewer.paper.clientHeight);
      points.push([clamp(x + (x > 0.5 ? -dx : dx), 0, 1),
        viewer.tool === "circle" ? clamp(y + (y > 0.5 ? -dy : dy), 0, 1) : y]);
    }
    const payload = { tool: viewer.tool, page: viewer.page, points,
      width: viewer.tool === "marker" ? 12 : 3 };
    if (viewer.tool === "text") {
      const value = await askAnnotationText(viewer);
      if (!value) { drawAnnotations(viewer); return; }
      payload.text = value;
      payload.fontSize = viewer.fontSize;
    }
    try {
      await viewer.api.post(viewer.sceneBase + "/annotations", payload);
      await refreshScene(viewer);
    } catch (error) {
      drawAnnotations(viewer);
      viewerError(viewer, error.message);
    }
  });
  viewer.stage.addEventListener("pointercancel", () => {
    viewer.moving = null; viewer.drawing = null; drawAnnotations(viewer);
  });
  root.querySelector("[data-font-size]")?.addEventListener("change", (event) => {
    viewer.fontSize = Number(event.target.value);
  });
  root.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-viewer]")?.dataset.viewer;
    const tool = event.target.closest("[data-tool]")?.dataset.tool;
    const color = event.target.closest("[data-color]")?.dataset.color;
    if (tool) {
      viewer.tool = tool;
      viewer.overlay.style.touchAction = tool === "move" ? "auto" : "none";
      root.querySelectorAll("[data-tool]").forEach((button) => {
        const selected = button.dataset.tool === tool;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      root.querySelector(".document-font-size").hidden = tool !== "text";
    }
    if (color && viewer.canAnnotate) {
      try { await api.post(viewer.sceneBase + "/color", { color }); await refreshScene(viewer); }
      catch (error) { viewerError(viewer, error.message); }
    }
    if (action === "hall") {
      try {
        const target = presentation.programStreamId ? "remove-program" :
          presentation.multiviewStreamId ? "remove-multiview" : await askBroadcastTarget(viewer);
        if (!target) return;
        const updated = await onSendToHall?.(presentation.id, target);
        if (updated) {
          viewer.presentation = updated;
          presentation = updated;
          event.target.textContent = updated.programStreamId ? "Завершить показ в PGM" :
            updated.multiviewStreamId ? "Убрать плитку из PGM" : "Отправить в зал";
        }
      } catch (error) { viewerError(viewer, error.message); }
    }
    if (action === "prev" || action === "next") {
      pauseFollowing(viewer);
      viewer.page = clamp(viewer.page + (action === "next" ? 1 : -1), 1, viewer.pageCount);
      await renderPage(viewer); scheduleViewport(viewer);
    }
    if (action === "minus" || action === "plus") {
      await setZoom(viewer, viewer.zoom + (action === "plus" ? .25 : -.25));
    }
    if (action === "follow") {
      viewer.follow = !viewer.follow;
      updateFollowingButton(viewer);
      if (viewer.follow) await applyViewport(viewer, viewer.scene?.viewport);
    }
  });
}
