// A document show temporarily replaces the program picture in full-screen mode.
export function suspendProgramFullscreen(syncButton) {
  if (!document.documentElement.classList.contains("program-fullscreen-mode")) return false;
  document.documentElement.classList.replace("program-fullscreen-mode", "program-fullscreen-suspended");
  syncButton();
  return true;
}

export function restoreProgramFullscreen(syncButton) {
  if (!document.documentElement.classList.contains("program-fullscreen-suspended")) return;
  document.documentElement.classList.replace("program-fullscreen-suspended", "program-fullscreen-mode");
  syncButton();
}

export function prepareFullscreenNavigation() {
  document.querySelectorAll("#mobileNav .nav-item[data-tab]").forEach((button) => {
    if (button.querySelector(".nav-icon")) return;
    const icon = document.querySelector(`#desktopNav .nav-item[data-tab="${button.dataset.tab}"] .nav-icon`);
    if (icon) button.prepend(icon.cloneNode(true));
  });
}

export function syncProgramFullscreenButton() {
  prepareFullscreenNavigation();
  const expanded = document.documentElement.classList.contains("program-fullscreen-mode");
  document.querySelectorAll(".program-fullscreen-button").forEach((button) => {
    button.setAttribute("aria-label", expanded ? "Свернуть трансляцию" : "На весь экран");
    button.title = expanded ? "Свернуть трансляцию" : "Развернуть трансляцию на весь экран";
    const label = button.querySelector(".btn-label");
    if (label) label.textContent = expanded ? "Свернуть" : "На весь экран";
  });
}
