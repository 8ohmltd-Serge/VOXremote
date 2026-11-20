import * as pdfjsLib from "./vendor/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;

const COLORS = ["#FF304F", "#236DFF", "#00A85A", "#B23CFF", "#FF8A00", "#00B8D9",
  "#F735A8", "#A4A900", "#7047FF", "#00B89B", "#ED592B", "#1483E0"];
const VALID_COLORS = new Set([...COLORS, "#E03446", "#245DC1", "#21805B", "#8A47BA", "#BA6519", "#087C91",
  "#9B416E", "#647827", "#7148D0", "#008C79", "#AA4D37", "#365892"]);
const shortName = (name) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length < 2 ? parts[0] ?? "" : `${parts[0]} ${parts.slice(1, 3).map((part) => part[0] + ".").join("")}`;
};
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
  text: '<path d="M4 6V4h16v2M12 4v16m-4 0h8"/>',
  pointer: '<path d="M5 3v15.5l4.2-3.8 2.9 6.6 2.9-1.3-2.9-6.4H18L5 3Z"/>'
};
// Show pointer ("указка"): the holder sends at most 25 positions a second,
// one request in flight; viewers ease towards the newest position and hide
// the arrow after a short pause, even if the hide event is lost.
const POINTER_SEND_MS = 40;
const POINTER_IDLE_MS = 3000;
// Double click / double tap in pointer mode flashes a red beacon for everyone.
const BEACON_MS = 1200;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 32;
const POINTER_ARROW_SVG = '<svg viewBox="-3 -3 38 54" width="27" height="38" aria-hidden="true">' +
  '<path d="M0 0v40l10.5-9.5 7 16 7-3-7-15.5H30Z" fill="#E03446" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
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
// Every open request takes a number; a slower earlier request that finishes
// later is discarded instead of leaving an orphaned window (A-01).
let openSequence = 0;
let loading = null;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusTarget(opener) {
  if (opener?.element?.isConnected) return opener.element;
  return opener?.selector ? document.querySelector(opener.selector) : null;
}

function rememberOpener() {
  const element = document.activeElement instanceof HTMLElement && document.activeElement !== document.body &&
    !document.activeElement.closest(".document-viewer-backdrop") ? document.activeElement : null;
  if (!element) return null;
  const documentId = element.dataset.documentId;
  return { element, selector: documentId ? `[data-document-id="${CSS.escape(documentId)}"]` : null };
}

function hideLoading() {
  loading?.root.remove();
  loading = null;
}

function showLoading(item, opener) {
  hideLoading();
  const root = document.createElement("div");
  root.className = "document-viewer-backdrop document-viewer-loading";
  root.innerHTML = '<section class="document-viewer-pending" role="dialog" aria-modal="true" aria-busy="true" aria-label="Открытие документа">' +
    '<p role="status"></p><button type="button" class="button button-secondary" data-viewer-cancel>Отмена</button></section>';
  root.querySelector("p").textContent = "Загрузка документа «" + (item?.fileName ?? "") + "»…";
  root.querySelector("[data-viewer-cancel]").addEventListener("click", () => {
    openSequence += 1;
    hideLoading();
    focusTarget(opener)?.focus({ preventScroll: true });
  });
  document.body.append(root);
  // Focus the panel, not "Отмена": a repeated Enter must not cancel the open.
  const panel = root.querySelector(".document-viewer-pending");
  panel.tabIndex = -1;
  panel.focus({ preventScroll: true });
  loading = { root, opener };
}

// Esc and Tab for the viewer and its own small dialogs (A-16). A client modal
// opened above the viewer (body.has-modal) handles the keys itself.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "Tab") return;
  if (document.body.classList.contains("has-modal")) return;
  if (loading && !current) {
    if (event.key === "Escape") { event.preventDefault(); loading.root.querySelector("[data-viewer-cancel]")?.click(); }
    else { event.preventDefault(); loading.root.querySelector("[data-viewer-cancel]")?.focus(); }
    return;
  }
  if (!current || current.minimized || !current.root.isConnected) return;
  const inner = current.root.querySelector(".document-text-dialog");
  if (event.key === "Escape") {
    event.preventDefault();
    if (current.root.querySelector("[data-viewer-colors]:not([hidden])")) { togglePalette(current, false); return; }
    if (current.root.querySelector(".document-viewer")?.classList.contains("is-document-expanded")) {
      current.root.querySelector(".document-viewer").classList.remove("is-document-expanded");
      if (documentFullscreenOwned && document.fullscreenElement === document.documentElement) void document.exitFullscreen?.();
      documentFullscreenOwned = false;
      return;
    }
    if (inner) inner.querySelector("[data-cancel]")?.click();
    else current.root.querySelector('[data-viewer="close"]')?.click();
    return;
  }
  const scope = inner ?? current.root.querySelector(".document-viewer");
  const focusable = [...scope.querySelectorAll(FOCUSABLE)].filter((node) => !node.closest("[hidden]") && node.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable.at(-1);
  if (!scope.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

// A hidden tab does not poll the scene; it catches up once on return (A-14).
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && current?.sceneBase && current.ready) refreshScene(current).catch(() => {});
});
let documentFullscreenOwned = false;
document.addEventListener("fullscreenchange", () => {
  if (!current?.ready || current.minimized) return;
  const panel = current.root.querySelector(".document-viewer");
  if (!document.fullscreenElement && documentFullscreenOwned && !matchMedia("(pointer: coarse)").matches) {
    panel?.classList.remove("is-document-expanded");
    documentFullscreenOwned = false;
  }
  const button = panel?.querySelector('[data-viewer="fullscreen"]');
  if (button) {
    const expanded = document.fullscreenElement === panel || panel.classList.contains("is-document-expanded");
    button.setAttribute("aria-label", expanded ? "Свернуть документ" : "Развернуть документ на весь экран");
    button.title = expanded ? "Свернуть" : "На весь экран";
  }
  void renderPage(current).catch((error) => viewerError(current, error.message));
});

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
    panel.innerHTML = '<form role="dialog" aria-modal="true" aria-label="Текст пометки">' +
      '<button type="button" class="dialog-icon-close" data-cancel aria-label="Закрыть">×</button>' +
      '<label>Текст пометки<input type="text" maxlength="500" required></label>' +
      '<p class="document-text-error" role="alert" hidden>Введите текст пометки</p>' +
      '<div><button type="button" data-cancel>Отмена</button><button type="submit">Сохранить</button></div></form>';
    viewer.root.append(panel);
    const finish = (value) => { panel.remove(); resolve(value); viewer.stage?.focus?.({ preventScroll: true }); };
    panel.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => finish(null)));
    panel.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = panel.querySelector("input").value.trim();
      if (!value) { panel.querySelector(".document-text-error").hidden = false; panel.querySelector("input").focus(); return; }
      finish(value);
    });
    panel.querySelector("input").focus();
  });
}

function askBroadcastTarget(viewer) {
  return new Promise((resolve) => {
    const panel = document.createElement("div");
    panel.className = "document-text-dialog";
    panel.innerHTML = '<form class="document-broadcast-choice" role="dialog" aria-modal="true" aria-label="Куда отправить документ">' +
      '<button type="button" class="dialog-icon-close" data-cancel aria-label="Закрыть">×</button>' +
      '<h3>Куда отправить документ?</h3><p>Выберите, как показать документ в трансляции зала.</p>' +
      '<div><button type="button" data-target="program">Во весь экран</button>' +
      '<button type="button" data-target="multiview">Отдельной плиткой</button></div></form>';
    viewer.root.append(panel);
    const finish = (target) => { panel.remove(); resolve(target); };
    panel.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
    panel.querySelectorAll("[data-target]").forEach((button) =>
      button.addEventListener("click", () => finish(button.dataset.target)));
    panel.querySelector("[data-target]")?.focus();
  });
}

function svgShape(annotation) {
  const points = annotation.points ?? [];
  const at = (point) => (point[0] * 1000).toFixed(2) + "," + (point[1] * 1000).toFixed(2);
  const color = VALID_COLORS.has(annotation.color) ? annotation.color : "#111111";
  const width = clamp(Number(annotation.width) || 3, 1, 36) * 1000 / 900;
  const attrs = ' data-annotation-id="' + escapeHtml(annotation.id) + '" data-author="' +
    escapeHtml(annotation.authorName) + '" aria-label="Пометка: ' + escapeHtml(annotation.authorName) + '" fill="none" stroke="' + color +
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

function svgFor(annotation) {
  return '<g><title>' + escapeHtml(annotation.authorName) + '</title>' + svgShape(annotation) + '</g>';
}

export function minimizeDocumentViewer() {
  if (!current?.presentation) return;
  if (documentFullscreenOwned && document.fullscreenElement === document.documentElement) void document.exitFullscreen?.();
  documentFullscreenOwned = false;
  current.minimized = true;
  current.root.hidden = true;
  document.dispatchEvent(new Event("vox:document-viewer-closed"));
  focusTarget(current.opener)?.focus({ preventScroll: true });
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

export function closeDocumentViewer({ restoreFocus = true } = {}) {
  if (loading) { openSequence += 1; hideLoading(); }
  if (!current) return;
  const opener = current.opener;
  if (documentFullscreenOwned && document.fullscreenElement === document.documentElement) void document.exitFullscreen?.();
  documentFullscreenOwned = false;
  current.layoutObserver?.disconnect();
  stopPointer(current);
  clearInterval(current.poll);
  clearInterval(current.pointerPoll);
  clearTimeout(current.viewportTimer);
  clearTimeout(current.pendingRefresh);
  current.pageRender?.cancel();
  current.abort?.abort();
  current.root.remove();
  current = null;
  if (restoreFocus) focusTarget(opener)?.focus({ preventScroll: true });
}

function sizePresentationStage(viewer) {
  if (!viewer.presentation) return;
  const shell = viewer.root.querySelector(".document-viewer");
  const header = viewer.root.querySelector(".document-viewer-header");
  const tools = viewer.root.querySelector(".document-viewer-tools");
  const pointerStatus = viewer.root.querySelector("[data-pointer-status]");
  const availableHeight = Math.max(1, shell.clientHeight - header.offsetHeight - tools.offsetHeight -
    (pointerStatus?.offsetHeight ?? 0) - 8);
  const width = Math.max(1, Math.min(shell.clientWidth - 12, availableHeight * 16 / 9));
  viewer.stage.style.width = width + "px";
  viewer.stage.style.height = width * 9 / 16 + "px";
}

export function updateDocumentViewerRights({ canView, canAnnotate }) {
  if (!current) return;
  if (!canView && !current.draft) { closeDocumentViewer(); return; }
  // A right granted on request (DocumentCore "по запросу") adds to the
  // participant's own annotation right until the show ends.
  current.baseCanAnnotate = Boolean(canAnnotate);
  current.canAnnotate = Boolean((canAnnotate || current.draft || current.annotateGranted) &&
    (current.presentation || current.draft));
  if (!current.canAnnotate && current.tool !== "pointer") {
    current.tool = "move";
    current.overlay.style.touchAction = "auto";
    current.overlay.style.cursor = "";
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
    button.disabled = button.dataset.tool === "pointer" ? !pointerAllowed(current)
      : !current.canAnnotate && button.dataset.tool !== "move";
  }
  const picker = current.root.querySelector(".document-color-picker");
  if (picker) picker.hidden = !current.canAnnotate;
  if (!current.canAnnotate) togglePalette(current, false);
  if (current.ready && current.canAnnotate && current.sceneBase && !current.color) {
    refreshScene(current).catch((error) => viewerError(current, error.message));
  }
}

// True while the shared view of this show is open on screen (not folded).
export function isPresentationViewerOpen(presentationId) {
  return Boolean(current && !current.minimized && current.presentation?.id === presentationId);
}

export function documentSceneEvent(eventType, payload) {
  if (!current?.sceneId || !eventType.startsWith("document-scene.")) return;
  if (payload?.presentationId !== current.sceneId) return;
  // Pointer traffic never reloads the scene: it is not part of it.
  if (eventType === "document-scene.pointer") { remotePointer(current, payload); return; }
  if (eventType === "document-scene.pointer-beacon") {
    if (payload.holderUserId !== current.userId) showBeacon(current, payload);
    return;
  }
  if (eventType === "document-scene.pointer-control") {
    refreshPointer(current).catch(() => {});
    return;
  }
  if (eventType === "document-scene.annotate-control") {
    refreshAnnotateAccess(current).catch(() => {});
    return;
  }
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
  for (const [id, pending] of viewer.pendingAnnotations) {
    if (pending.serverId && scene.annotations.some((item) => item.id === pending.serverId))
      viewer.pendingAnnotations.delete(id);
  }
  const own = scene.authors[viewer.userId];
  viewer.color = own?.color ?? null;
  const ownersByColor = new Map();
  for (const [authorId, author] of Object.entries(scene.authors)) {
    if (!ownersByColor.has(author.color)) ownersByColor.set(author.color, []);
    ownersByColor.get(author.color).push({ ...author, authorId });
  }
  // Existing conferences may still own colors from the earlier palette.
  // Include those colors in the menu, otherwise every visible swatch looks free.
  viewer.colors.innerHTML = [...new Set([...COLORS, ...VALID_COLORS])].map((color) => {
    const owners = ownersByColor.get(color) ?? [];
    const occupied = owners.length > 0 && color !== viewer.color;
    const shortOwners = owners.map((item) => shortName(item.displayName)).join(", ");
    const fullOwners = owners.map((item) => item.displayName).join(", ");
    const status = color === viewer.color ? "Ваш цвет" : occupied ? "Занят" : "Свободен";
    const description = color === viewer.color ? "Ваш цвет" : occupied ? `Занят: ${fullOwners}` : "Выбрать цвет";
    return '<button type="button" class="document-color' + (color === viewer.color ? ' selected' : '') + (occupied ? ' occupied' : '') +
      '" data-color="' + color + '" style="--swatch:' + color + '" title="' + escapeHtml(description) +
      '" aria-label="' + escapeHtml(description) + '" role="menuitemradio" aria-checked="' +
      (color === viewer.color) + '" ' + (occupied ? 'disabled' : '') +
      '><i aria-hidden="true"></i><span>' + escapeHtml(status) + '</span></button>';
  }).join("");
  const swatch = viewer.root.querySelector('[data-viewer="palette"]');
  if (swatch) swatch.style.setProperty("--swatch", viewer.color ?? "transparent");
  viewer.legend.innerHTML = Object.values(scene.authors).map((item) =>
    '<span title="' + escapeHtml(item.displayName) + '"><i style="background:' + item.color + '"></i>' +
    escapeHtml(shortName(item.displayName)) + '</span>').join("");
  drawAnnotations(viewer);
  if (viewer.follow && (!prior || JSON.stringify(prior.viewport) !== JSON.stringify(scene.viewport))) {
    await applyViewport(viewer, scene.viewport);
  }
}

function drawAnnotations(viewer) {
  if (!viewer.scene) return;
  viewer.overlay.innerHTML = '<rect x="0" y="0" width="1000" height="1000" fill="transparent" pointer-events="all"></rect>' +
    viewer.scene.annotations.filter((item) => item.page === viewer.page).map(svgFor).join("") +
    [...viewer.pendingAnnotations.values()].filter((item) => item.page === viewer.page &&
      !viewer.scene.annotations.some((saved) => saved.id === item.serverId)).map(svgFor).join("");
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
  if (viewer.pointer?.visible) {
    if (viewer.pointerState?.you?.holder) hideOwnPointer(viewer);
    else placePointer(viewer);
  }
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

async function publishViewport(viewer) {
  if (!viewer.canDriveViewport || viewer.applyingViewport || current !== viewer) return;
  clearTimeout(viewer.viewportTimer);
  const x = clamp((viewer.stage.scrollLeft + viewer.stage.clientWidth / 2 -
    viewer.paper.offsetLeft) / viewer.paper.clientWidth, 0, 1);
  const y = clamp((viewer.stage.scrollTop + viewer.stage.clientHeight / 2 -
    viewer.paper.offsetTop) / viewer.paper.clientHeight, 0, 1);
  const position = { page: viewer.page, zoom: viewer.zoom, centerX: x, centerY: y };
  viewer.viewportPending = (viewer.viewportPending ?? Promise.resolve()).catch(() => {}).then(() =>
    viewer.api.post("/presentations/" + viewer.presentation.id + "/viewport", position));
  await viewer.viewportPending;
}

function scheduleViewport(viewer) {
  if (!viewer.canDriveViewport || viewer.applyingViewport || current !== viewer) return;
  clearTimeout(viewer.viewportTimer);
  viewer.viewportTimer = setTimeout(() => publishViewport(viewer).catch(() => {}), 160);
}

function updateFollowingButton(viewer) {
  const button = viewer.root.querySelector('[data-viewer="follow"]');
  if (!button) return;
  const holder = viewer.pointerState?.holder;
  button.hidden = Boolean(viewer.pointerState?.you?.holder);
  button.disabled = !holder;
  const label = !holder ? "Ожидание владельца указки" : viewer.follow
    ? `Следую за владельцем указки: ${holder.displayName} · отключить`
    : `Свободный просмотр · следовать за владельцем указки: ${holder.displayName}`;
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

function pointerAllowed(viewer) {
  const you = viewer.pointerState?.you;
  return Boolean(viewer.pointerBase && (you?.holder || you?.canTake));
}

function selectTool(viewer, tool) {
  if (viewer.tool === "pointer" && tool !== "pointer") hideOwnPointer(viewer);
  viewer.tool = tool;
  viewer.overlay.style.touchAction = tool === "move" ? "auto" : "none";
  const cursors = { move: "grab", pen: "crosshair", marker: "crosshair", line: "crosshair",
    circle: "crosshair", text: "text", "move-annotation": "move", eraser: "cell", pointer: "none" };
  viewer.overlay.style.cursor = cursors[tool] ?? "default";
  // The shared red pointer is the only cursor while the local user operates
  // the Pointer tool.  Keeping the OS cursor visible creates two competing
  // pointers on desktop browsers and makes an accurate indication impossible.
  viewer.stage.classList.toggle("document-pointer-active", tool === "pointer");
  viewer.root.querySelectorAll("[data-tool]").forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const fontSize = viewer.root.querySelector(".document-font-size");
  if (fontSize) fontSize.hidden = tool !== "text";
}

async function refreshPointer(viewer) {
  if (!viewer?.pointerBase || current !== viewer) return;
  const state = await viewer.api.get(viewer.pointerBase);
  if (current === viewer) applyPointerState(viewer, state);
}

function applyPointerState(viewer, state) {
  const wasHolder = viewer.pointerState?.you?.holder;
  const previousOwner = viewer.pointerState?.holder?.userId ?? null;
  viewer.pointerState = state;
  const you = state.you ?? {};
  viewer.canDriveViewport = state.holder ? Boolean(you.holder) : viewer.legacyCanDriveViewport;
  viewer.followAvailable = !you.holder;
  if (you.holder) viewer.follow = false;
  else if (state.holder?.userId && state.holder.userId !== previousOwner) {
    viewer.follow = true;
    void applyViewport(viewer, viewer.scene?.viewport);
  }
  updateFollowingButton(viewer);
  if (!you.holder && viewer.tool === "pointer") selectTool(viewer, "move");
  if (!you.holder) viewer.stage.classList.remove("document-pointer-active");
  if (wasHolder && !you.holder) { viewer.pointer.next = null; clearTimeout(viewer.pointer.timer); viewer.pointer.timer = null; }
  const button = viewer.root.querySelector('[data-tool="pointer"]');
  if (button) {
    button.hidden = state.policy?.enabled === false;
    button.disabled = !pointerAllowed(viewer);
    const label = you.holder ? "Указка · водите по документу, двойное нажатие — маячок" : you.canTake ? "Указка" :
      "Указка · попросите её у оператора";
    button.title = label;
    button.setAttribute("aria-label", label);
  }
  if (!state.holder) hidePointer(viewer);
  else if (state.pointer && !you.holder && !viewer.pointer.visible) remotePointer(viewer, { ...state.pointer, visible: true });
  renderPointerStatus(viewer);
}

// The palette is a drop-down: one swatch button in the toolbar opens the
// twelve colours, which frees the toolbar for the request buttons.
function togglePalette(viewer, open) {
  const menu = viewer?.root?.querySelector("[data-viewer-colors]");
  const button = viewer?.root?.querySelector('[data-viewer="palette"]');
  if (!menu || !button) return;
  const next = open ?? menu.hidden;
  menu.hidden = !next;
  button.setAttribute("aria-expanded", String(next));
  if (next) {
    // Fixed position: the toolbar scrolls horizontally on a phone and would
    // clip an absolutely positioned menu.
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth || 320;
    menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - width - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(rect.bottom + 6, innerHeight - menu.offsetHeight - 8)) + "px";
  }
  if (next) (menu.querySelector(".document-color.selected") ?? menu.querySelector(".document-color:not(:disabled)"))?.focus();
}

async function refreshAnnotateAccess(viewer) {
  if (!viewer?.annotateBase || current !== viewer) return;
  const state = await viewer.api.get(viewer.annotateBase);
  if (current !== viewer) return;
  viewer.annotateState = state;
  const granted = Boolean(state.you?.granted);
  if (granted !== Boolean(viewer.annotateGranted)) {
    viewer.annotateGranted = granted;
    updateDocumentViewerRights({ canView: true, canAnnotate: viewer.baseCanAnnotate });
  }
  renderPointerStatus(viewer);
}

function annotateStatusParts(viewer) {
  const state = viewer.annotateState;
  if (!state || state.mode !== "request") return [];
  const you = state.you ?? {};
  const parts = [];
  if (you.granted && !you.direct) parts.push('<span class="document-pointer-wait">Пометки вам разрешены</span>');
  if (you.canRequest) {
    parts.push(you.requested
      ? '<span class="document-pointer-wait">Запрос пометок отправлен</span><button type="button" data-annotate="cancel">Отменить</button>'
      : '<button type="button" data-annotate="request">Попросить пометки</button>');
  }
  if (you.canManage) {
    for (const request of (state.requests ?? []).slice(0, 3)) {
      const id = escapeHtml(request.userId);
      parts.push('<span class="document-pointer-request"><span><strong>' + escapeHtml(request.displayName) +
        '</strong> просит пометки</span><button type="button" data-annotate="grant" data-user-id="' + id + '">Разрешить</button>' +
        '<button type="button" class="secondary" data-annotate="deny" data-user-id="' + id + '">Отклонить</button></span>');
    }
    if ((state.requests ?? []).length > 3) parts.push('<span>ещё ' + (state.requests.length - 3) + '</span>');
    for (const item of (state.granted ?? []).slice(0, 6)) {
      parts.push('<span class="document-annotate-grant">Пометки: ' + escapeHtml(item.displayName) +
        '<button type="button" class="secondary" data-annotate="revoke" data-user-id="' + escapeHtml(item.userId) +
        '" aria-label="Снять право пометок: ' + escapeHtml(item.displayName) + '">Снять</button></span>');
    }
  }
  return parts;
}

function renderPointerStatus(viewer) {
  const status = viewer.root.querySelector("[data-pointer-status]");
  if (!status) return;
  const state = viewer.pointerState ?? { you: {} };
  const you = state.you ?? {};
  const parts = [];
  if (state.holder) {
    parts.push('<span class="document-pointer-holder"><i aria-hidden="true"></i>' + (you.holder ? 'Указка у вас' :
      'Указкой управляет: <strong>' + escapeHtml(state.holder.displayName) + '</strong>') + '</span>');
  }
  if (you.holder) parts.push('<button type="button" data-pointer="release">Вернуть указку</button>');
  else if (you.canManage && state.holder) parts.push('<button type="button" data-pointer="release">Забрать указку</button>');
  else if (you.canTake && state.holder) parts.push('<button type="button" data-pointer="take">Взять указку</button>');
  if (you.canRequest && !you.holder) {
    parts.push(you.requested
      ? '<span class="document-pointer-wait">Запрос отправлен</span><button type="button" data-pointer="cancel">Отменить</button>'
      : '<button type="button" data-pointer="request">Попросить указку</button>');
  }
  if (you.canManage) {
    for (const request of (state.requests ?? []).slice(0, 3)) {
      const id = escapeHtml(request.userId);
      parts.push('<span class="document-pointer-request"><span><strong>' + escapeHtml(request.displayName) +
        '</strong> просит указку</span><button type="button" data-pointer="grant" data-user-id="' + id + '">Разрешить</button>' +
        '<button type="button" class="secondary" data-pointer="deny" data-user-id="' + id + '">Отклонить</button></span>');
    }
    if ((state.requests ?? []).length > 3) parts.push('<span>ещё ' + (state.requests.length - 3) + '</span>');
  }
  parts.push(...annotateStatusParts(viewer));
  status.innerHTML = parts.join("");
  status.hidden = !parts.length;
}

async function pointerAction(viewer, action, userId = null) {
  const path = { request: "/request", cancel: "/cancel", release: "/release", take: "/take",
    grant: "/grant", deny: "/deny" }[action];
  if (!path) return;
  const state = await viewer.api.post(viewer.pointerBase + path, userId ? { userId } : {});
  if (current === viewer) applyPointerState(viewer, state);
}

function placePointer(viewer) {
  const { shown, cursor } = viewer.pointer;
  if (!cursor || !shown) return;
  cursor.style.transform = "translate(" + (shown.x * viewer.paper.clientWidth).toFixed(1) + "px," +
    (shown.y * viewer.paper.clientHeight).toFixed(1) + "px)";
}

function showPointer(viewer, x, y, { smooth = false } = {}) {
  const pointer = viewer.pointer;
  if (!pointer.cursor) return;
  pointer.target = { x, y };
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!pointer.visible || !smooth || !pointer.shown || reduced) {
    pointer.shown = { x, y };
    cancelAnimationFrame(pointer.raf);
    pointer.raf = null;
    placePointer(viewer);
  } else if (!pointer.raf) {
    const step = () => {
      if (current !== viewer || !pointer.visible) { pointer.raf = null; return; }
      const dx = pointer.target.x - pointer.shown.x, dy = pointer.target.y - pointer.shown.y;
      const done = Math.abs(dx) < 0.0004 && Math.abs(dy) < 0.0004;
      pointer.shown = done ? { ...pointer.target } : { x: pointer.shown.x + dx * 0.38, y: pointer.shown.y + dy * 0.38 };
      placePointer(viewer);
      pointer.raf = done ? null : requestAnimationFrame(step);
    };
    pointer.raf = requestAnimationFrame(step);
  }
  if (!pointer.visible) {
    pointer.visible = true;
    pointer.cursor.hidden = false;
  }
  viewer.stage.classList.toggle("pointer-live", Boolean(viewer.pointerState?.you?.holder));
  clearTimeout(pointer.idle);
  pointer.idle = setTimeout(() => { if (current === viewer) hidePointer(viewer); }, POINTER_IDLE_MS);
}

function hidePointer(viewer) {
  const pointer = viewer.pointer;
  if (!pointer) return;
  clearTimeout(pointer.idle);
  cancelAnimationFrame(pointer.raf);
  pointer.raf = null;
  pointer.visible = false;
  if (pointer.cursor) pointer.cursor.hidden = true;
  viewer.stage?.classList.remove("pointer-live");
}

function remotePointer(viewer, payload) {
  if (!viewer.pointer || payload.holderUserId === viewer.userId) return;
  if (payload.visible !== true || payload.page !== viewer.page) { hidePointer(viewer); return; }
  showPointer(viewer, Number(payload.x), Number(payload.y), { smooth: true });
}

function sendPointer(viewer, point) {
  const pointer = viewer.pointer;
  pointer.next = point;
  if (pointer.busy || pointer.timer) return;
  pointer.timer = setTimeout(() => flushPointer(viewer),
    Math.max(0, POINTER_SEND_MS - (performance.now() - pointer.sentAt)));
}

async function flushPointer(viewer) {
  const pointer = viewer.pointer;
  pointer.timer = null;
  const point = pointer.next;
  pointer.next = null;
  if (!point || current !== viewer) return;
  pointer.busy = true;
  pointer.sentAt = performance.now();
  try {
    await viewer.api.post(viewer.pointerBase + "/move", point);
  } catch (error) {
    pointer.next = null;
    refreshPointer(viewer).catch(() => {});
  } finally {
    pointer.busy = false;
    if (pointer.next && current === viewer) sendPointer(viewer, pointer.next);
  }
}

function hideOwnPointer(viewer) {
  const pointer = viewer.pointer;
  if (!pointer || !viewer.pointerState?.you?.holder) return;
  pointer.next = null;
  clearTimeout(pointer.timer);
  pointer.timer = null;
  const wasVisible = pointer.visible;
  hidePointer(viewer);
  if (wasVisible) viewer.api.post(viewer.pointerBase + "/hide", {}).catch(() => {});
}

function stopPointer(viewer) {
  const pointer = viewer?.pointer;
  if (!pointer) return;
  clearTimeout(pointer.timer);
  clearTimeout(pointer.idle);
  cancelAnimationFrame(pointer.raf);
  if (viewer.pointerState?.you?.holder && pointer.visible) {
    viewer.api.post(viewer.pointerBase + "/hide", {}).catch(() => {});
  }
}

function showBeacon(viewer, { page, x, y, durationMs } = {}) {
  if (!viewer?.pointer?.cursor || page !== viewer.page) return;
  const left = Number(x), top = Number(y);
  if (!(left >= 0 && left <= 1 && top >= 0 && top <= 1)) return;
  const duration = clamp(Number(durationMs) || BEACON_MS, 300, 3000);
  const beacon = document.createElement("div");
  beacon.className = "document-beacon";
  beacon.setAttribute("aria-hidden", "true");
  beacon.style.left = (left * 100) + "%";
  beacon.style.top = (top * 100) + "%";
  beacon.style.setProperty("--beacon-ms", duration + "ms");
  beacon.innerHTML = "<i></i><i></i><b></b>";
  viewer.paper.append(beacon);
  setTimeout(() => beacon.remove(), duration);
}

function beaconTap(viewer, event) {
  const rect = viewer.overlay.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  const last = viewer.pointer.lastTap;
  const now = performance.now();
  viewer.pointer.lastTap = { at: now, clientX: event.clientX, clientY: event.clientY };
  if (!last || now - last.at > DOUBLE_TAP_MS ||
      Math.hypot(event.clientX - last.clientX, event.clientY - last.clientY) > DOUBLE_TAP_PX) return;
  viewer.pointer.lastTap = null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  const point = { page: viewer.page, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
  showBeacon(viewer, point);
  viewer.api.post(viewer.pointerBase + "/beacon", point).catch(() => refreshPointer(viewer).catch(() => {}));
}

function trackPointer(viewer, event) {
  if (viewer.tool !== "pointer" || !viewer.pointerState?.you?.holder) return;
  const rect = viewer.overlay.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  if (x < 0 || x > 1 || y < 0 || y > 1) { hideOwnPointer(viewer); return; }
  showPointer(viewer, x, y);
  sendPointer(viewer, { page: viewer.page, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 });
}

function pointFromEvent(viewer, event) {
  const rect = viewer.overlay.getBoundingClientRect();
  return [clamp((event.clientX - rect.left) / rect.width, 0, 1),
    clamp((event.clientY - rect.top) / rect.height, 0, 1)];
}

export async function openDocumentViewer({ api, document: item, presentation = null,
  userId, participantId = null, quickMeeting = false, canAnnotate = false, canControl = false, canModerate = false, canProgram = false,
  draft = false, onSendToHall = null, onStopPresentation = null,
  archiveScene = null }) {
  const opener = rememberOpener() ?? current?.opener ?? loading?.opener ?? null;
  closeDocumentViewer({ restoreFocus: false });
  const sequence = ++openSequence;
  showLoading(item, opener);
  const isPresentationLeader = presentation?.leaderParticipantId
    ? presentation.leaderParticipantId === participantId
    : presentation?.leaderUserId ? presentation.leaderUserId === userId
      : presentation?.leaderAssigned ? false
        : presentation?.startedByParticipantId ? presentation.startedByParticipantId === participantId
        : presentation?.startedBy === userId;
  const canDriveViewport = Boolean(presentation && (quickMeeting ? isPresentationLeader : canControl));
  const followAvailable = Boolean(presentation && !archiveScene);
  let blob;
  try {
    const response = await api.request("/documents/" + encodeURIComponent(item.id) + "/content");
    blob = await response.blob();
  } catch (error) {
    if (sequence !== openSequence) return;
    hideLoading();
    focusTarget(opener)?.focus({ preventScroll: true });
    throw error;
  }
  // A later open (double tap, another document) or Cancel superseded this one.
  if (sequence !== openSequence) return;
  hideLoading();
  closeDocumentViewer({ restoreFocus: false });
  const root = document.createElement("div");
  root.className = "document-viewer-backdrop";
  root.innerHTML = '<section class="document-viewer' + (presentation ? ' document-viewer-presentation' : '') +
    '" role="dialog" aria-modal="true" aria-label="Просмотр документа">' +
    '<header class="document-viewer-header"><div class="document-viewer-title"><small>Материалы</small><h2></h2></div>' +
    '<div class="document-viewer-controls"><div class="document-viewer-control-group"><button type="button" data-viewer="prev" aria-label="Предыдущая страница">←</button>' +
    '<span data-viewer-page></span><button type="button" data-viewer="next" aria-label="Следующая страница">→</button></div>' +
    '<div class="document-viewer-control-group"><button type="button" data-viewer="minus" aria-label="Уменьшить масштаб">−</button><span data-viewer-zoom></span>' +
    '<button type="button" data-viewer="plus" aria-label="Увеличить масштаб">+</button></div>' +
    (canProgram ? '<button type="button" class="button" data-viewer="hall">' +
      (presentation?.programStreamId ? 'Убрать из трансляции' :
        presentation?.multiviewStreamId ? 'Убрать плитку' : 'Отправить в зал') + '</button>' : '') +
    (presentation || draft ? '<button type="button" data-viewer="tools" aria-expanded="true" aria-controls="documentViewerTools">Свернуть инструменты</button>' : '') +
    '<button type="button" data-viewer="fullscreen" aria-label="Развернуть документ на весь экран" title="На весь экран">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg></button>' +
    '<button type="button" class="dialog-icon-close" data-viewer="close" aria-label="Закрыть">×</button></div></header>' +
    (presentation || draft ? '<nav id="documentViewerTools" class="document-viewer-tools" aria-label="Инструменты пометок">' +
      toolButton('move', 'Перемещение документа', true) +
      (followAvailable ? '<button type="button" data-viewer="follow" class="selected" aria-pressed="true" disabled title="Ожидание владельца указки" aria-label="Ожидание владельца указки">' + followIcon(true) + '</button>' : '') +
      (presentation && !archiveScene ? toolButton('pointer', 'Указка') : '') +
      toolButton('pen', 'Перо') +
      toolButton('marker', 'Маркер') + toolButton('line', 'Линия') +
      toolButton('circle', 'Окружность') + toolButton('text', 'Текст') +
      '<label class="document-font-size" hidden>Размер текста<select data-font-size aria-label="Размер текста">' +
      '<option value="16">16</option><option value="24">24</option><option value="28" selected>28</option>' +
      '<option value="36">36</option><option value="48">48</option><option value="64">64</option></select></label>' +
      toolButton('move-annotation', 'Переместить свою пометку') +
      toolButton('eraser', canModerate ? 'Стереть пометку' : 'Стереть свою пометку') +
      '<div class="document-color-picker"><button type="button" data-viewer="palette" aria-haspopup="true" aria-expanded="false" ' +
      'title="Цвет пометок" aria-label="Цвет пометок"><i aria-hidden="true"></i></button>' +
      '<div data-viewer-colors role="menu" aria-label="Цвет пометок" hidden></div></div>' +
      '<aside data-viewer-legend aria-label="Авторы пометок"></aside></nav>' +
      (presentation && !archiveScene ? '<div class="document-pointer-status" data-pointer-status role="status" hidden></div>' : '') : '') +
    '<div class="document-viewer-stage" tabindex="-1"><p class="document-viewer-progress" role="status">Подготовка страниц…</p><div class="document-viewer-paper"><canvas></canvas>' +
    '<svg class="document-viewer-overlay" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg>' +
    (presentation && !archiveScene ? '<div class="document-pointer" data-pointer-cursor hidden>' + POINTER_ARROW_SVG + '</div>' : '') +
    '</div></div>' +
    '<div class="document-viewer-owner" hidden></div></section>';
  document.body.append(root);
  const sceneBase = archiveScene ? null : presentation ? "/presentations/" + presentation.id :
    draft ? "/documents/" + item.id + "/draft" : null;
  const viewer = { api, item, presentation, draft, userId, canAnnotate, canControl, canModerate,
    canDriveViewport, legacyCanDriveViewport: canDriveViewport, followAvailable, onSendToHall, onStopPresentation,
    sceneBase, scenePath: presentation ? sceneBase + "/scene" : sceneBase,
    sceneId: presentation?.id ?? (draft ? "draft:" + item.id : null),
    root, stage: root.querySelector(".document-viewer-stage"),
    paper: root.querySelector(".document-viewer-paper"), canvas: root.querySelector("canvas"),
    overlay: root.querySelector(".document-viewer-overlay"), colors: root.querySelector("[data-viewer-colors]"),
    legend: root.querySelector("[data-viewer-legend]"), pageLabel: root.querySelector("[data-viewer-page]"),
    zoomLabel: root.querySelector("[data-viewer-zoom]"), owner: root.querySelector(".document-viewer-owner"),
    page: 1, pageCount: 1, zoom: 1, tool: "move", fontSize: 28,
    follow: followAvailable,
    pointerBase: presentation && !archiveScene ? "/presentations/" + presentation.id + "/pointer" : null,
    annotateBase: presentation && !archiveScene ? "/presentations/" + presentation.id + "/annotate-access" : null,
    annotateState: null, annotateGranted: false, baseCanAnnotate: Boolean(canAnnotate),
    pointerState: null,
    pointer: { cursor: root.querySelector("[data-pointer-cursor]"), visible: false, shown: null, target: null,
      raf: null, idle: null, timer: null, busy: false, next: null, sentAt: 0, lastTap: null },
    renderToken: 0, text: null, pendingAnnotations: new Map(), pendingSequence: 0, opener };
  current = viewer;
  const closeButton = root.querySelector('[data-viewer="close"]');
  root.querySelector('[data-viewer="close"]').addEventListener("click", () => {
    if (current !== viewer) return;
    if (viewer.presentation && !archiveScene && viewer.canControl) minimizeDocumentViewer();
    else { closeDocumentViewer(); document.dispatchEvent(new Event("vox:document-viewer-closed")); }
  });
  // For the show's controller "×" only folds the window: the show goes on.
  if (viewer.presentation && !archiveScene && viewer.canControl) {
    closeButton.setAttribute("aria-label", "Свернуть окно (показ продолжается)");
    closeButton.title = "Свернуть окно — показ продолжается, вернуться можно кнопкой «В показе»";
  } else closeButton.title = "Закрыть";
  closeButton.focus({ preventScroll: true });
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
    const pointerStatus = root.querySelector("[data-pointer-status]");
    if (pointerStatus) viewer.layoutObserver.observe(pointerStatus);
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
    root.querySelector(".document-viewer-progress")?.remove();
    if (archiveScene) {
      viewer.scene = archiveScene;
      viewer.legend.innerHTML = Object.values(archiveScene.authors ?? {}).map((author) =>
        '<span title="' + escapeHtml(author.displayName) + '"><i style="background:' + author.color + '"></i>' +
        escapeHtml(shortName(author.displayName)) + '</span>').join("");
      drawAnnotations(viewer);
    } else if (viewer.sceneBase) {
      await refreshScene(viewer);
      if (current !== viewer) return;
      await refreshPointer(viewer).catch(() => {});
      await refreshAnnotateAccess(viewer).catch(() => {});
      if (current !== viewer) return;
      let polls = 0;
      viewer.poll = setInterval(() => {
        if (document.hidden) return;
        refreshScene(viewer).catch(() => {});
        // Pointer movement arrives as volatile events. Refresh its ephemeral
        // snapshot on every scene poll so a Connect/browser handover heals
        // within four seconds even if one SSE frame was lost.
        polls++;
        refreshPointer(viewer).catch(() => {});
        if (polls % 3 === 0) refreshAnnotateAccess(viewer).catch(() => {});
      }, 4000);
      if (viewer.pointerBase) viewer.pointerPoll = setInterval(() => {
        if (!document.hidden) refreshPointer(viewer).catch(() => {});
      }, 1000);
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
  // Pointer mode: a mouse points by hovering, a finger by touching; the page
  // under the finger does not scroll (overlay touch-action: none).
  viewer.stage.addEventListener("pointermove", (event) => trackPointer(viewer, event));
  viewer.stage.addEventListener("pointerdown", (event) => {
    if (viewer.tool !== "pointer") return;
    event.preventDefault();
    trackPointer(viewer, event);
    if (viewer.pointerState?.you?.holder && viewer.pointerState.policy?.beacon !== false) beaconTap(viewer, event);
  });
  // The double tap is the beacon, never a page zoom or a text selection.
  viewer.stage.addEventListener("dblclick", (event) => {
    if (viewer.tool === "pointer") event.preventDefault();
  });
  viewer.stage.addEventListener("pointerleave", () => {
    if (viewer.tool === "pointer") hideOwnPointer(viewer);
  });
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
      if (viewer.canAnnotate && annotation && (annotation.authorId === viewer.userId || viewer.canModerate) &&
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
    if (!viewer.canAnnotate || ["move", "eraser", "move-annotation", "pointer"].includes(viewer.tool)) return;
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
    const pendingId = `pending-${++viewer.pendingSequence}`;
    viewer.pendingAnnotations.set(pendingId, { ...payload, id: pendingId, color: viewer.color });
    drawAnnotations(viewer);
    try {
      const saved = await viewer.api.post(viewer.sceneBase + "/annotations", payload);
      const pending = viewer.pendingAnnotations.get(pendingId);
      if (pending) pending.serverId = saved?.id ?? saved?.body?.id ?? null;
      await refreshScene(viewer);
    } catch (error) {
      viewer.pendingAnnotations.delete(pendingId);
      drawAnnotations(viewer);
      viewerError(viewer, error.message);
    }
  });
  viewer.stage.addEventListener("pointercancel", () => {
    viewer.moving = null; viewer.drawing = null; drawAnnotations(viewer);
  });
  // Select drawing tools on pointer-down as well as click. Some mobile and
  // embedded browsers suppress the later click after a scrollable toolbar
  // gesture; applying the idempotent selection here keeps every tool usable.
  root.querySelector(".document-viewer-tools")?.addEventListener("pointerdown", (event) => {
    const tool = event.target.closest("[data-tool]")?.dataset.tool;
    if (!tool || tool === "pointer") return;
    event.preventDefault();
    selectTool(viewer, tool);
  });
  root.querySelector("[data-font-size]")?.addEventListener("change", (event) => {
    viewer.fontSize = Number(event.target.value);
  });
  root.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-viewer]")?.dataset.viewer;
    if (action === "tools") {
      const tools = root.querySelector(".document-viewer-tools");
      tools.hidden = !tools.hidden;
      const button = event.target.closest('[data-viewer="tools"]');
      button.setAttribute("aria-expanded", String(!tools.hidden));
      button.textContent = tools.hidden ? "Показать инструменты" : "Свернуть инструменты";
      return;
    }
    if (action === "fullscreen") {
      const panel = root.querySelector(".document-viewer");
      const expanded = panel.classList.toggle("is-document-expanded");
      if (expanded && !document.fullscreenElement) {
        try { await document.documentElement.requestFullscreen?.({ navigationUI: "hide" }); documentFullscreenOwned = document.fullscreenElement === document.documentElement; }
        catch { documentFullscreenOwned = false; }
      } else if (!expanded && documentFullscreenOwned && document.fullscreenElement === document.documentElement) {
        await document.exitFullscreen?.().catch(() => {});
        documentFullscreenOwned = false;
      }
      const button = root.querySelector('[data-viewer="fullscreen"]');
      button.setAttribute("aria-label", expanded ? "Свернуть документ" : "Развернуть документ на весь экран");
      button.title = expanded ? "Свернуть" : "На весь экран";
      if (viewer.ready) void renderPage(viewer);
      return;
    }
    const tool = event.target.closest("[data-tool]")?.dataset.tool;
    const color = event.target.closest("[data-color]")?.dataset.color;
    const pointerButton = event.target.closest("[data-pointer]");
    if (tool === "pointer") {
      try {
        if (!viewer.pointerState?.you?.holder) {
          if (!viewer.pointerState?.you?.canTake) {
            viewerError(viewer, "Указку выдаёт оператор — нажмите «Попросить указку»");
            return;
          }
          await pointerAction(viewer, "take");
        }
        if (current === viewer && viewer.pointerState?.you?.holder) selectTool(viewer, "pointer");
      } catch (error) { viewerError(viewer, error.message); }
    } else if (tool) selectTool(viewer, tool);
    if (pointerButton && !pointerButton.disabled) {
      pointerButton.disabled = true;
      try { await pointerAction(viewer, pointerButton.dataset.pointer, pointerButton.dataset.userId ?? null); }
      catch (error) { viewerError(viewer, error.message); }
      finally { if (pointerButton.isConnected) pointerButton.disabled = false; }
    }
    if (color && viewer.canAnnotate) {
      togglePalette(viewer, false);
      root.querySelector('[data-viewer="palette"]')?.focus({ preventScroll: true });
      try { await api.post(viewer.sceneBase + "/color", { color }); await refreshScene(viewer); }
      catch (error) { viewerError(viewer, error.message); }
    }
    if (action === "palette") togglePalette(viewer);
    else if (!event.target.closest(".document-color-picker")) togglePalette(viewer, false);
    const annotateButton = event.target.closest("[data-annotate]");
    if (annotateButton && !annotateButton.disabled && viewer.annotateBase) {
      annotateButton.disabled = true;
      try {
        const action = annotateButton.dataset.annotate;
        const userId = annotateButton.dataset.userId ?? null;
        const state = await api.post(viewer.annotateBase + "/" + action, userId ? { userId } : {});
        if (current === viewer) {
          viewer.annotateState = state;
          const granted = Boolean(state.you?.granted);
          if (granted !== viewer.annotateGranted) {
            viewer.annotateGranted = granted;
            updateDocumentViewerRights({ canView: true, canAnnotate: viewer.baseCanAnnotate });
          }
          renderPointerStatus(viewer);
        }
      } catch (error) { viewerError(viewer, error.message); }
      finally { if (annotateButton.isConnected) annotateButton.disabled = false; }
    }
    if (action === "hall") {
      // One choice dialog and one request per press, even on a double tap.
      if (viewer.hallBusy) return;
      viewer.hallBusy = true;
      const hallButton = event.target.closest('[data-viewer="hall"]');
      try {
        const target = presentation.programStreamId ? "remove-program" :
          presentation.multiviewStreamId ? "remove-multiview" : await askBroadcastTarget(viewer);
        if (!target) return;
        hallButton.disabled = true;
        if (!target.startsWith("remove-")) await publishViewport(viewer);
        const updated = await onSendToHall?.(presentation.id, target);
        if (updated) {
          viewer.presentation = updated;
          presentation = updated;
          hallButton.textContent = updated.programStreamId ? "Убрать из трансляции" :
            updated.multiviewStreamId ? "Убрать плитку" : "Отправить в зал";
        }
      } catch (error) { viewerError(viewer, error.message); }
      finally { viewer.hallBusy = false; if (hallButton?.isConnected) hallButton.disabled = false; }
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
