// Top and bottom bar shared by the public pages (0.8.41): the Gateway (/, guides, status), the
// conference entry /conference/, room booking /booking/ and the service sign-in screen /service/.
// Styles: /client/portalChrome.css. Load in <head> without defer: pages with their own language
// table (conference entry, service sign-in) call VoxPortalChrome.renderLanguages() from their scripts.
//
// Theme: one saved choice for all these pages under "vox-portal-theme" ("light" | "dark"; no key = as in
// the system). The saved choice wins; otherwise the system setting; only when the browser reports no
// colour-scheme preference at all, the device clock decides (light 07:00–20:00). The effective theme is
// always written to <html data-theme>. The inline script in each page head does the same before first paint.
(function (root) {
  "use strict";
  const THEME_KEY = "vox-portal-theme";
  const LEGACY_THEME_KEYS = ["vox-gateway-theme", "vox-booking-theme"];
  const LANG_KEY = "vx-lang";
  const CATALOG_LANGS = ["ru", "en", "de", "fr", "es", "it"];
  const $ = (selector) => document.querySelector(selector);

  const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => {
    try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* private mode */ }
  };

  // ---------- Theme ----------
  function savedTheme() {
    let theme = read(THEME_KEY);
    if (theme === null) {
      // Older per-page keys are read once and removed.
      theme = LEGACY_THEME_KEYS.map(read).find((value) => value === "light" || value === "dark") ?? null;
      if (theme) write(THEME_KEY, theme);
      for (const key of LEGACY_THEME_KEYS) write(key, null);
    }
    return theme === "light" || theme === "dark" ? theme : "system";
  }
  const media = (query) => (typeof matchMedia === "function" ? matchMedia(query) : null);
  const darkQuery = media("(prefers-color-scheme: dark)");
  const lightQuery = media("(prefers-color-scheme: light)");
  const byClock = () => { const hour = new Date().getHours(); return hour >= 7 && hour < 20 ? "light" : "dark"; };
  function systemTheme() {
    if (darkQuery?.matches) return "dark";
    if (lightQuery?.matches) return "light";
    return byClock();
  }

  const themeNames = { system: "как в системе", light: "светлое", dark: "тёмное" };
  let theme = "system";
  function applyTheme() {
    document.documentElement.dataset.theme = theme === "system" ? systemTheme() : theme;
    const toggle = $("#themeToggle");
    if (toggle) toggle.textContent = `Оформление: ${themeNames[theme] ?? themeNames.system}`;
  }
  function initTheme() {
    theme = savedTheme();
    applyTheme();
    const toggle = $("#themeToggle");
    if (toggle && !toggle.__chromeBound) {
      toggle.__chromeBound = true;
      toggle.addEventListener("click", () => {
        theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
        write(THEME_KEY, theme === "system" ? null : theme);
        applyTheme();
      });
    }
    darkQuery?.addEventListener?.("change", applyTheme);
    lightQuery?.addEventListener?.("change", applyTheme);
    // The clock fallback only matters when the browser has no colour-scheme preference.
    setInterval(() => { if (theme === "system" && !darkQuery?.matches && !lightQuery?.matches) applyTheme(); }, 60_000);
  }

  // ---------- Build in the footer ----------
  async function initBuild() {
    const target = $("#footerBuild");
    if (!target) return;
    try {
      const response = await fetch("/api/v1/status", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const status = await response.json();
      const build = status.build || status.version;
      if (build) target.textContent = `VOX-S ${build}`;
    } catch { /* offline: keep "VOX-S" */ }
  }

  // ---------- Language picker ----------
  // One pattern on every page: compact caps buttons; Russian is offered only while another language is active.
  function renderLanguages({ container = $("#languagePicker"), languages = CATALOG_LANGS, current = "ru", onChoose } = {}) {
    if (!container) return;
    const hadFocus = container.contains(document.activeElement) ? document.activeElement.dataset.lang : null;
    const codes = languages.filter((code, index) => languages.indexOf(code) === index && (code !== "ru" || current !== "ru"));
    codes.sort((a, b) => (a === "ru" ? -1 : b === "ru" ? 1 : 0));
    container.replaceChildren(...codes.map((code) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "language-choice";
      button.lang = code;
      button.dataset.lang = code;
      button.textContent = code.toUpperCase();
      if (code === "ru") button.setAttribute("aria-label", "Русский язык");
      button.setAttribute("aria-pressed", String(code === current));
      button.addEventListener("click", () => onChoose?.(code));
      return button;
    }));
    // Keep keyboard focus in the picker after a choice (the Russian button may have just disappeared).
    if (hadFocus) (container.querySelector(`[data-lang="${hadFocus}"]`) ?? container.querySelector("button"))?.focus();
  }

  // Pages translated only by the shared catalogue (Gateway, guides, status, booking). Order: ?lang= in the
  // link, the saved choice, the browser languages, otherwise Russian.
  let catalogLanguage = "ru";
  function browserLanguage(known = CATALOG_LANGS) {
    return (navigator.languages?.length ? navigator.languages : [navigator.language || ""])
      .map((value) => String(value).slice(0, 2).toLowerCase()).find((value) => known.includes(value));
  }
  async function setCatalogLanguage(code, remember = true) {
    catalogLanguage = code;
    if (remember) write(LANG_KEY, code);
    document.documentElement.lang = code;
    renderLanguages({ current: code, onChoose: (next) => setCatalogLanguage(next) });
    await root.VoxLocale?.use?.(code);
  }
  function initCatalogLanguage() {
    const picker = $("#languagePicker");
    if (!picker || picker.dataset.languageSource !== "catalog") return;
    const first = [new URLSearchParams(location.search).get("lang")?.slice(0, 2).toLowerCase(), read(LANG_KEY), browserLanguage()]
      .find((value) => value && CATALOG_LANGS.includes(value)) || "ru";
    setCatalogLanguage(first, false);
  }

  root.VoxPortalChrome = {
    THEME_KEY, renderLanguages, browserLanguage,
    get language() { return catalogLanguage; },
    applyTheme
  };
  const start = () => { initTheme(); initCatalogLanguage(); initBuild(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof globalThis !== "undefined" ? globalThis : this);
