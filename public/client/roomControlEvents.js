import { controlColorInk, validControlColor } from "./controlColor.js";

export function createRoomControlEvents(page, getState, notify, navigate) {
  const pressed = new Map();
  const queues = new Map();
  function send(controlId, state, payload) {
    const context = getState();
    if (!context.profile?.meetingId || !context.roomControl) return Promise.resolve();
    const task = () => context.api.post(`/control-core/meetings/${encodeURIComponent(context.profile.meetingId)}/events`, {
      controlId, state, payload, expectedVersion: context.roomControl.version,
      panelId: context.roomControlPanelId
    });
    const next = (queues.get(controlId) ?? Promise.resolve()).catch(() => {}).then(task);
    queues.set(controlId, next);
    next.catch((error) => notify(error.message));
    return next;
  }
  function end(id) {
    const gesture = pressed.get(id);
    if (!gesture) return;
    clearTimeout(gesture.timer);
    pressed.delete(id);
    void send(id, gesture.held ? "holdrelease" : "release", false);
  }
  function opaqueHit(event, button) {
    const image = button.querySelector("img.room-control-icon");
    if (!image?.complete || !image.naturalWidth) return false;
    const rect = image.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientY < rect.top ||
        event.clientX >= rect.right || event.clientY >= rect.bottom) return false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(Math.floor((event.clientX - rect.left) / rect.width * canvas.width),
        Math.floor((event.clientY - rect.top) / rect.height * canvas.height), 1, 1).data[3] > 24;
    } catch { return false; }
  }
  function begin(button, event) {
    const id = button.dataset.roomControlButton;
    if (pressed.has(id) || button.dataset.hit === "passthrough" ||
        event.type === "pointerdown" && (event.button !== 0 ||
          button.dataset.hit === "touch-on-fill" && !opaqueHit(event, button))) return;
    event.preventDefault();
    const item = getState().roomControl?.panel.controls.find((control) => control.id === id);
    if (item?.action === "navigate") {
      navigate(item.targetPageId);
      return;
    }
    if (event.pointerId !== undefined) button.setPointerCapture(event.pointerId);
    const gesture = { held: false, timer: null };
    pressed.set(id, gesture);
    void send(id, "press", item?.type === "button" ? item.value ?? true : true);
    gesture.timer = setTimeout(() => {
      if (!pressed.has(id)) return;
      gesture.held = true;
      void send(id, "hold", item?.type === "button" ? item.value ?? true : true);
    }, 600);
  }
  page.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-room-control-button]");
    if (button) begin(button, event);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    page.addEventListener(name, (event) => {
      const button = event.target.closest("[data-room-control-button]");
      if (button) end(button.dataset.roomControlButton);
    });
  }
  page.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key) || event.repeat) return;
    const button = event.target.closest("[data-room-control-button]");
    if (button) begin(button, event);
  });
  page.addEventListener("keyup", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const button = event.target.closest("[data-room-control-button]");
    if (button) { event.preventDefault(); end(button.dataset.roomControlButton); }
  });
  return { send };
}

export function applyRoomControlPush(state, payload) {
  if (!payload || !state.roomControl || payload.roomId !== state.roomControl.roomId ||
      payload.version !== state.roomControl.version ||
      payload.panelId && payload.panelId !== state.roomControlPanelId) return;
  state.roomControl.state ??= {};
  state.roomControl.state[payload.stateKey] = payload.value;
  if (state.activeTab !== "roomcontrol") return;
  const item = state.roomControl.panel.controls.find((entry) => entry.id === payload.controlId);
  if (!item) return;
  const tile = document.querySelector(`.room-control-tile:has([data-room-control-button="${CSS.escape(item.id)}"], [data-room-control-slider="${CSS.escape(item.id)}"])`);
  if (!tile) return;
  const button = tile.querySelector("[data-room-control-button]");
  if (button) {
    button.setAttribute("aria-pressed", String(Boolean(payload.value)));
    const detail = button.querySelector("small");
    if (item.states) {
      const selected = item.states.find((entry) => entry.value === payload.value ||
        typeof payload.value === "boolean" && typeof entry.value === "number" &&
        entry.value === Number(payload.value));
      button.querySelector("span").textContent = selected?.label || item.label;
      if (detail) detail.textContent = !selected && item.type === "multistate" ? "Состояние неизвестно" : "";
      let image = button.querySelector("img.room-control-icon");
      const source = selected?.icon || item.icon;
      if (!image && source) {
        image = document.createElement("img");
        image.className = "room-control-icon";
        image.alt = "";
        button.prepend(image);
      }
      if (image) {
        image.hidden = !source;
        if (source) image.src = source;
      }
      button.style.backgroundColor = validControlColor(selected?.color) ? selected.color : "";
      button.style.color = validControlColor(selected?.color) ? controlColorInk(selected.color) : "";
    }
  }
  const slider = tile.querySelector("[data-room-control-slider]");
  if (slider && document.activeElement !== slider) slider.value = payload.value;
  const output = tile.querySelector("output");
  if (output) output.textContent = payload.value;
}
