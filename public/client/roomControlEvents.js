import { controlColorInk, validControlColor } from "./controlColor.js";

function paintButton(button, item, value) {
  const selected = item.states?.find((entry) => entry.value === value ||
    typeof value === "boolean" && typeof entry.value === "number" && entry.value === Number(value));
  const hover = button.matches(":hover") ? item.hover : null;
  button.querySelector("span").textContent = hover?.label || selected?.label || item.label;
  const detail = button.querySelector("small");
  if (detail) detail.textContent = !selected && item.type === "multistate" ? "Состояние неизвестно" : "";
  const source = hover?.icon || selected?.icon || item.icon;
  let image = button.querySelector("img.room-control-icon");
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
  const color = validControlColor(hover?.color) ? hover.color : selected?.color;
  const fill = selected?.color;
  button.closest(".room-control-tile")?.classList.toggle("fill-passthrough", button.dataset.hit === "touch-on-fill" &&
    (!validControlColor(fill) || fill.length === 9 && fill.slice(7).toLowerCase() === "00"));
  const fontColor = hover?.fontColor || selected?.fontColor || item.fontColor;
  const fontSize = hover?.fontSize || selected?.fontSize || item.fontSize;
  if (validControlColor(color)) {
    button.style.setProperty("--control-state-color", color);
  } else {
    button.style.removeProperty("--control-state-color");
  }
  if (validControlColor(fontColor)) button.style.setProperty("--control-state-ink", fontColor);
  else if (validControlColor(color)) button.style.setProperty("--control-state-ink", controlColorInk(color));
  else button.style.removeProperty("--control-state-ink");
  button.style.fontSize = Number.isInteger(fontSize) ? `${fontSize}px` : "";
}

export function createRoomControlEvents(page, getState, notify, navigate) {
  const pressed = new Map();
  const specialPointers = new Map();
  const textTimers = new Map();
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
  function begin(button, event) {
    const id = button.dataset.roomControlButton;
    if (pressed.has(id) || button.dataset.hit === "passthrough" ||
        event.type === "pointerdown" && event.button !== 0) return;
    event.preventDefault();
    const item = getState().roomControl?.panel.controls.find((control) => control.id === id);
    const action = item?.eventActions?.press ?? { action: item?.action, targetPageId: item?.targetPageId };
    if (action?.action === "none") return;
    if (["navigate", "popup-open", "popup-close", "popup-toggle"].includes(action?.action)) {
      navigate(action.targetPageId, action.action);
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
  function paintCompound(item, value) {
    for (const group of page.querySelectorAll(`[data-compound-id="${CSS.escape(item.id)}"]`)) {
      for (const button of group.querySelectorAll("[data-sub-id]")) {
        const enabled = Boolean(value && typeof value === "object" && value[button.dataset.subId]);
        const style = item.states?.[Number(enabled)] ?? {};
        button.setAttribute("aria-pressed", String(enabled));
        button.style.backgroundColor = validControlColor(style.color) ? style.color : "";
        button.style.color = validControlColor(style.fontColor) ? style.fontColor : "";
        button.style.fontSize = Number.isInteger(style.fontSize) ? `${style.fontSize}px` : "";
      }
    }
  }
  function paintCircular(control, item, value) {
    const current = Number.isFinite(Number(value)) ? Number(value) : item.min;
    const degrees = Math.max(0, Math.min(360, (current - item.min) / (item.max - item.min) * 360));
    const fill = validControlColor(item.levelFillColor) ? item.levelFillColor : "#ED3229";
    const empty = validControlColor(item.levelEmptyColor) ? item.levelEmptyColor : "#D9D3CC";
    control.style.background = item.fillDirection === "counterclockwise"
      ? `conic-gradient(${empty} ${360 - degrees}deg,${fill} 0)`
      : `conic-gradient(${fill} ${degrees}deg,${empty} 0)`;
    control.setAttribute("aria-valuenow", String(current));
    control.querySelector("output").textContent = String(current);
  }
  function moveSpecial(control, event) {
    const id = control.dataset.roomControlCircular ?? control.closest("[data-room-control-dpad]")?.dataset.roomControlDpad;
    const item = getState().roomControl?.panel.controls.find((entry) => entry.id === id);
    if (!item) return;
    let value;
    if (item.type === "circular-level") {
      const box = control.getBoundingClientRect();
      let angle = Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      if (item.fillDirection === "counterclockwise") angle = (360 - angle) % 360;
      const step = Math.max(1, (item.max - item.min) / 100);
      value = Math.max(item.min, Math.min(item.max, item.min + Math.round((angle / 360 * (item.max - item.min)) / step) * step));
      if (item.feedbackMode !== "channel") {
        getState().roomControl.state[item.stateKey] = value;
        page.querySelectorAll(`[data-room-control-circular="${CSS.escape(id)}"]`).forEach((node) => paintCircular(node, item, value));
      }
    } else if (control.dataset.roomControlDirection === "joystick") {
      const box = control.getBoundingClientRect(), radius = Math.max(1, Math.min(box.width, box.height) / 2);
      let x = (event.clientX - box.left - box.width / 2) / radius;
      let y = (box.top + box.height / 2 - event.clientY) / radius;
      const magnitude = Math.min(1, Math.hypot(x, y));
      if (Math.hypot(x, y) > 1) { x *= magnitude / Math.hypot(x, y); y *= magnitude / Math.hypot(x, y); }
      control.querySelector("span").style.transform = `translate(${x * 42}%,${-y * 42}%)`;
      value = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), angle: Number(((Math.atan2(x, y) * 180 / Math.PI + 360) % 360).toFixed(1)), magnitude: Number(magnitude.toFixed(3)) };
    } else value = control.dataset.roomControlDirection;
    const gesture = specialPointers.get(control);
    if (gesture) gesture.value = value;
    if (!gesture || Date.now() - gesture.sentAt >= 40) {
      if (gesture) gesture.sentAt = Date.now();
      void send(id, "move", value);
    }
  }
  page.addEventListener("click", (event) => {
    const button = event.target.closest("[data-room-control-sub]");
    if (!button) return;
    const context = getState();
    const item = context.roomControl?.panel.controls.find((entry) => entry.id === button.dataset.roomControlSub);
    if (!item || !["keypad", "updown"].includes(item.type)) return;
    const current = context.roomControl.state?.[item.stateKey];
    let payload;
    if (item.type === "keypad") {
      payload = { keyId: button.dataset.subId };
      if (item.feedbackMode !== "channel") {
        context.roomControl.state[item.stateKey] = { ...(current && typeof current === "object" ? current : {}),
          [payload.keyId]: !Boolean(current?.[payload.keyId]) };
      }
    } else {
      const base = Number(current && typeof current === "object" ? current.value : current);
      const step = button.dataset.subId === "up" ? item.step : -item.step;
      const value = button.dataset.subId === "stop" ? "stop" : Math.max(item.min,
        Math.min(item.max, Number(((Number.isFinite(base) ? base : item.min) + step).toFixed(8))));
      payload = { buttonId: button.dataset.subId, value };
      if (value !== "stop" && item.feedbackMode !== "channel") {
        context.roomControl.state[item.stateKey] = { ...(current && typeof current === "object" ? current : {}), value };
      }
    }
    if (item.feedbackMode !== "channel") paintCompound(item, context.roomControl.state[item.stateKey]);
    void send(item.id, "press", payload);
  });
  page.addEventListener("input", (event) => {
    const field = event.target.closest("[data-room-control-text]");
    if (field) {
      const id = field.dataset.roomControlText;
      clearTimeout(textTimers.get(id));
      textTimers.set(id, setTimeout(() => { textTimers.delete(id); void send(id, "change", field.value); }, 120));
      return;
    }
    const slider = event.target.closest("[data-room-control-slider]");
    if (slider) {
      const id = slider.dataset.roomControlSlider;
      const item = getState().roomControl?.panel.controls.find((entry) => entry.id === id);
      slider.closest(".room-control-slider")?.querySelector("output")?.replaceChildren(document.createTextNode(slider.value));
      if (item?.feedbackMode !== "channel") getState().roomControl.state[item.stateKey] = Number(slider.value);
      void send(id, "move", Number(slider.value));
    }
  });
  page.addEventListener("pointerdown", (event) => {
    const close = event.target.closest("[data-room-control-popup-close]");
    if (close) { event.preventDefault(); navigate(close.dataset.roomControlPopupClose, "popup-close"); return; }
    const special = event.target.closest("[data-room-control-circular], [data-room-control-direction]");
    if (special && event.button === 0) {
      event.preventDefault(); special.setPointerCapture(event.pointerId);
      specialPointers.set(special, { pointerId: event.pointerId, sentAt: 0, value: null });
      moveSpecial(special, event);
      return;
    }
    const button = event.target.closest("[data-room-control-button]");
    if (button) begin(button, event);
  });
  page.addEventListener("pointermove", (event) => {
    const special = event.target.closest("[data-room-control-circular], [data-room-control-direction]");
    if (specialPointers.get(special)?.pointerId === event.pointerId) moveSpecial(special, event);
  });
  function finishSpecial(event) {
    const special = event.target.closest("[data-room-control-circular], [data-room-control-direction]");
    const gesture = specialPointers.get(special);
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    specialPointers.delete(special);
    const id = special.dataset.roomControlCircular ?? special.closest("[data-room-control-dpad]")?.dataset.roomControlDpad;
    const item = getState().roomControl?.panel.controls.find((entry) => entry.id === id);
    if (item?.type === "circular-level") void send(id, "release", gesture.value);
    else if (item?.type === "dpad") {
      special.querySelector("span")?.style.removeProperty("transform");
      void send(id, "stop", item.dpadMode === "joystick" ? { x: 0, y: 0, angle: 0, magnitude: 0 } : "stop");
    }
  }
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) page.addEventListener(name, finishSpecial);
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    page.addEventListener(name, (event) => {
      const button = event.target.closest("[data-room-control-button]");
      if (button) end(button.dataset.roomControlButton);
    });
  }
  page.addEventListener("keydown", (event) => {
    const field = event.target.closest("[data-room-control-text]");
    if (field && event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      clearTimeout(textTimers.get(field.dataset.roomControlText));
      textTimers.delete(field.dataset.roomControlText);
      void send(field.dataset.roomControlText, "submit", field.value);
      return;
    }
    const circular = event.target.closest("[data-room-control-circular]");
    if (circular && ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const id = circular.dataset.roomControlCircular;
      const context = getState();
      const item = context.roomControl?.panel.controls.find((entry) => entry.id === id);
      if (!item) return;
      const current = Number(context.roomControl.state?.[item.stateKey] ?? item.min);
      const value = event.key === "Home" ? item.min : event.key === "End" ? item.max
        : Math.max(item.min, Math.min(item.max, current + (["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1)));
      if (item.feedbackMode !== "channel") {
        context.roomControl.state[item.stateKey] = value;
        page.querySelectorAll(`[data-room-control-circular="${CSS.escape(id)}"]`).forEach((node) => paintCircular(node, item, value));
      }
      void send(id, "release", value);
      return;
    }
    if (!["Enter", " "].includes(event.key) || event.repeat) return;
    const button = event.target.closest("[data-room-control-button]");
    if (button) begin(button, event);
  });
  page.addEventListener("keyup", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const button = event.target.closest("[data-room-control-button]");
    if (button) { event.preventDefault(); end(button.dataset.roomControlButton); }
  });
  for (const name of ["pointerover", "pointerout"]) page.addEventListener(name, (event) => {
    const button = event.target.closest?.("[data-room-control-button]");
    if (!button || button.contains(event.relatedTarget)) return;
    const context = getState();
    const item = context.roomControl?.panel.controls.find((entry) => entry.id === button.dataset.roomControlButton);
    if (item) paintButton(button, item, context.roomControl.state?.[item.stateKey]);
  });
  return { send, paintCompound };
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
  if (["keypad", "updown"].includes(item.type)) {
    for (const group of document.querySelectorAll(`[data-compound-id="${CSS.escape(item.id)}"]`)) {
      for (const button of group.querySelectorAll("[data-sub-id]")) {
        const enabled = Boolean(payload.value && typeof payload.value === "object" && payload.value[button.dataset.subId]);
        const style = item.states?.[Number(enabled)] ?? {};
        button.setAttribute("aria-pressed", String(enabled));
        button.style.backgroundColor = validControlColor(style.color) ? style.color : "";
        button.style.color = validControlColor(style.fontColor) ? style.fontColor : "";
      }
    }
    return;
  }
  if (item.type === "circular-level") {
    for (const control of document.querySelectorAll(`[data-room-control-circular="${CSS.escape(item.id)}"]`)) {
      const current = Number.isFinite(Number(payload.value)) ? Number(payload.value) : item.min;
      const degrees = Math.max(0, Math.min(360, (current - item.min) / (item.max - item.min) * 360));
      const fill = validControlColor(item.levelFillColor) ? item.levelFillColor : "#ED3229";
      const empty = validControlColor(item.levelEmptyColor) ? item.levelEmptyColor : "#D9D3CC";
      control.style.background = item.fillDirection === "counterclockwise"
        ? `conic-gradient(${empty} ${360 - degrees}deg,${fill} 0)`
        : `conic-gradient(${fill} ${degrees}deg,${empty} 0)`;
      control.setAttribute("aria-valuenow", String(current));
      control.querySelector("output").textContent = String(current);
    }
    return;
  }
  if (item.type === "text-input") {
    for (const field of document.querySelectorAll(`[data-room-control-text="${CSS.escape(item.id)}"]`)) {
      if (document.activeElement !== field) field.value = String(payload.value ?? "");
    }
    return;
  }
  const tile = document.querySelector(`.room-control-tile:has([data-room-control-button="${CSS.escape(item.id)}"], [data-room-control-slider="${CSS.escape(item.id)}"])`);
  if (!tile) return;
  const button = tile.querySelector("[data-room-control-button]");
  if (button) {
    button.setAttribute("aria-pressed", String(Boolean(payload.value)));
    paintButton(button, item, payload.value);
  }
  const slider = tile.querySelector("[data-room-control-slider]");
  if (slider && document.activeElement !== slider) slider.value = payload.value;
  const output = tile.querySelector("output");
  if (output) output.textContent = payload.value;
}
