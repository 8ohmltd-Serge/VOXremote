// VOX-S interface localisation layer, shared by every browser page.
//
// The Russian text itself is the catalogue key ("source-keyed"): pages keep
// writing Russian, and this layer shows the chosen language instead. It
// translates text nodes and the usual attributes (title, placeholder,
// aria-label, alt, button values) as they appear, including text that scripts
// add later, plus alert/confirm/prompt. Strings built from templates become
// patterns with {0}, {1} placeholders. Text that is not in the catalogue, such
// as user-entered names, is never touched. Russian is the reference language:
// choosing it restores the original text.
(function (root) {
  "use strict";
  const CYR = /[Ѐ-ӿ]/u;
  const PLACEHOLDER = /\{\d+\}/gu;
  const collapse = (value) => String(value).replace(/\s+/gu, " ").trim();
  // Two lowercase words in a row are a sentence fragment, not a proper name.
  const SENTENCE_PART = /(?:^|\s)[а-яё]{2,}\s+[а-яё]{2,}/u;
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

  // ---- Pure engine (no DOM): used by the page layer and by tests. ----
  function createEngine() {
    let exact = new Map();
    let patterns = [];
    const misses = new Map();
    let userData = new Map(); // translations of user-entered text, filled in the background
    const engine = {
      load(strings) {
        exact = new Map(); patterns = []; misses.clear();
        for (const [source, target] of Object.entries(strings ?? {})) {
          if (typeof target !== "string" || !target) continue;
          const labels = source.match(PLACEHOLDER);
          if (!labels) { exact.set(source, target); continue; }
          const parts = source.split(PLACEHOLDER);
          patterns.push({ labels, target, head: parts[0], tail: parts[parts.length - 1],
            weight: parts.reduce((sum, part) => sum + part.length, 0),
            regex: new RegExp(`^${parts.map(escapeRegExp).join("(.*?)")}$`, "su") });
        }
        patterns.sort((a, b) => b.weight - a.weight);
      },
      // Translations of user text (names of rooms, conferences, people).
      setUserData(map) { userData = map instanceof Map ? map : new Map(); misses.clear(); },
      leftovers: null, // when a Set: collects user text that stayed Russian
      get size() { return exact.size + patterns.length; },
      // Returns the translation of one visible string or null when unknown.
      translate(raw) {
        const text = String(raw ?? "");
        if (!CYR.test(text)) return null;
        const lead = /^\s*/u.exec(text)[0];
        const trail = text.length > lead.length ? /\s*$/u.exec(text)[0] : "";
        const core = collapse(text);
        const hit = engine.translateCore(core);
        return hit === null ? null : lead + hit + trail;
      },
      translateCore(core) {
        if (exact.has(core)) return exact.get(core);
        if (userData.has(core)) return userData.get(core);
        if (misses.has(core)) { engine.leftovers?.add(core); return null; }
        // The same words in another case: "плановая" for "Плановая".
        const first = core.charAt(0);
        const swapped = first === first.toLowerCase() ? first.toUpperCase() + core.slice(1) : first.toLowerCase() + core.slice(1);
        if (swapped !== core && exact.has(swapped)) {
          const hit = exact.get(swapped);
          return first === first.toLowerCase() ? hit.charAt(0).toLowerCase() + hit.slice(1) : hit.charAt(0).toUpperCase() + hit.slice(1);
        }
        for (const pattern of patterns) {
          if (!core.startsWith(pattern.head) || !core.endsWith(pattern.tail)) continue;
          const match = pattern.regex.exec(core);
          if (!match) continue;
          const values = new Map();
          let usable = true;
          pattern.labels.forEach((label, index) => {
            const captured = match[index + 1];
            let shown = captured;
            if (CYR.test(captured)) {
              shown = engine.translateCore(collapse(captured));
              // Untranslated words (not a name) mean a wrong, partial match.
              if (shown === null) {
                if (SENTENCE_PART.test(captured) || /^[а-яё]/u.test(captured.trim())) usable = false;
                else engine.leftovers?.add(collapse(captured));
                shown = captured;
              }
            }
            values.set(label, shown);
          });
          if (!usable) continue;
          return pattern.target.replace(PLACEHOLDER, (label) => (values.has(label) ? values.get(label) : label));
        }
        // "5 мест": a number and a catalogue word.
        const counted = /^(\d+(?:[.,]\d+)?)\s+(\S.*)$/u.exec(core);
        if (counted) {
          const unit = engine.translateCore(counted[2]);
          if (unit !== null) return `${counted[1]} ${unit}`;
        }
        // "Основной зал · 0 мест": parts joined by a middle dot, each looked up on its own.
        if (core.includes(" · ")) {
          const parts = core.split(" · ");
          let any = false; let ok = true;
          const done = parts.map((part) => {
            if (!CYR.test(part)) return part;
            const hit = engine.translateCore(part) ?? engine.translateCore(`· ${part}`)?.replace(/^·\s*/u, "") ?? null;
            if (hit !== null) { any = true; return hit; }
            if (SENTENCE_PART.test(part)) ok = false; else engine.leftovers?.add(part);
            return part;
          });
          if (any && ok) return done.join(" · ");
        }
        // Several catalogue sentences in one text: "Сохранено. Повторите вход."
        const sentences = core.split(/(?<=[.!?…])\s+/u);
        if (sentences.length > 1) {
          const parts = sentences.map((sentence) => engine.translateCore(sentence));
          if (parts.every((part) => part !== null)) return parts.join(" ");
        }
        if (misses.size > 4000) misses.clear();
        misses.set(core, true);
        engine.leftovers?.add(core);
        return null;
      }
    };
    return engine;
  }

  const api = { createEngine, CYR, collapse };
  root.VoxLocale = api;
  if (typeof document === "undefined") return;

  // ---- Page layer ----
  const engine = createEngine();
  const ATTRIBUTES = ["title", "placeholder", "aria-label", "alt", "aria-description"];
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG"]);
  const STORAGE_KEYS = ["vx-lang", "edge-s-interface-language"];
  const state = { language: "ru", explicit: false, generation: 0, loaded: "ru", directions: Object.create(null) };
  const catalogCache = new Map();
  let observer = null;

  const skipped = (node, attributesOnly = false) => {
    for (let el = node.nodeType === 1 ? node : node.parentElement; el; el = el.parentElement) {
      if ((!attributesOnly && SKIP_TAGS.has(el.tagName.toUpperCase())) || el.getAttribute?.("translate") === "no" ||
          el.hasAttribute?.("data-vx-skip")) return true;
    }
    return false;
  };

  function processText(node) {
    const data = node.data;
    if (node.__vxOut !== undefined && node.__vxGen === state.generation && data === node.__vxOut) return;
    const source = node.__vxOut !== undefined && data === node.__vxOut ? node.__vxSrc : data;
    if (!CYR.test(source)) { delete node.__vxOut; return; }
    if (skipped(node)) return;
    const out = state.language === "ru" ? null : engine.translate(source);
    if (out === null) {
      if (source !== data) node.data = source;
      delete node.__vxOut; delete node.__vxSrc;
      return;
    }
    node.__vxSrc = source; node.__vxOut = out; node.__vxGen = state.generation;
    if (out !== data) node.data = out;
  }

  function processAttribute(element, name) {
    const store = element.__vxAttr ?? (element.__vxAttr = Object.create(null));
    const current = element.getAttribute(name);
    if (current === null) return;
    const saved = store[name];
    if (saved && saved.gen === state.generation && current === saved.out) return;
    const source = saved && current === saved.out ? saved.src : current;
    if (!CYR.test(source) || skipped(element, true)) { delete store[name]; return; }
    const out = state.language === "ru" ? null : engine.translate(source);
    if (out === null) {
      if (source !== current) element.setAttribute(name, source);
      delete store[name];
      return;
    }
    store[name] = { src: source, out, gen: state.generation };
    if (out !== current) element.setAttribute(name, out);
  }

  function processElement(element) {
    for (const name of ATTRIBUTES) if (element.hasAttribute(name)) processAttribute(element, name);
    if (element.tagName === "INPUT" && /^(?:button|submit|reset)$/iu.test(element.type) && element.hasAttribute("value")) {
      processAttribute(element, "value");
    }
  }

  function walk(rootNode) {
    if (rootNode.nodeType === 3) { processText(rootNode); return; }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 9 && rootNode.nodeType !== 11) return;
    if (rootNode.nodeType === 1) processElement(rootNode);
    const walker = document.createTreeWalker(rootNode, 1 | 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === 3) processText(node); else processElement(node);
    }
  }

  function observe() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver((records) => {
      scheduleUserData(2500, true);
      for (const record of records) {
        if (record.type === "characterData") processText(record.target);
        else if (record.type === "attributes") processElement(record.target);
        else for (const added of record.addedNodes) walk(added);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: [...ATTRIBUTES, "value"] });
  }

  async function loadCatalog(code) {
    if (catalogCache.has(code)) return catalogCache.get(code);
    const pending = fetch(`/api/v1/ui-catalog/${encodeURIComponent(code)}`, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null)).catch(() => null);
    catalogCache.set(code, pending);
    const result = await pending;
    if (!result) catalogCache.delete(code);
    return result;
  }

  // ---- User text (names of rooms, conferences, people) ----
  // Not in the catalogue, so it is translated by the server in the background
  // after the language changes; results are remembered in this browser.
  const DATA = { timer: 0, off: false, busy: false, asked: new Set(), map: new Map(), language: "" };
  const dataKey = () => `vx-data-tr-${state.language}`;
  function loadUserData() {
    DATA.language = state.language; DATA.map = new Map();
    try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(dataKey()) || "{}"))) DATA.map.set(k, v); } catch { /* private mode */ }
    engine.setUserData(DATA.map);
  }
  function saveUserData() {
    try {
      const entries = [...DATA.map].slice(-3000);
      localStorage.setItem(dataKey(), JSON.stringify(Object.fromEntries(entries)));
    } catch { /* storage full or private mode */ }
  }
  function scheduleUserData(delay = 1500, keep = false) {
    if (state.language === "ru" || DATA.off) return;
    if (keep && DATA.pending) return;
    clearTimeout(DATA.timer); DATA.pending = true;
    DATA.timer = setTimeout(() => { DATA.pending = false; collectUserData(); }, delay);
  }
  function userTextCandidates() {
    const found = new Set();
    engine.leftovers = found;
    const check = (raw) => { const core = collapse(raw); if (core.length >= 2 && core.length <= 200 && CYR.test(core)) engine.translateCore(core); };
    const walker = document.createTreeWalker(document.documentElement, 1 | 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === 3) {
        if (skipped(node)) continue;
        check(node.__vxOut !== undefined && node.data === node.__vxOut ? node.__vxSrc : node.data);
      } else if (!skipped(node, true)) {
        for (const name of ATTRIBUTES) {
          const saved = node.__vxAttr?.[name];
          const current = node.getAttribute(name);
          if (current !== null) check(saved && current === saved.out ? saved.src : current);
        }
      }
    }
    engine.leftovers = null;
    return [...found].filter((text) => !DATA.asked.has(`${state.language}|${text}`) && !DATA.map.has(text));
  }
  async function collectUserData() {
    if (state.language === "ru" || DATA.off || state.loaded !== state.language) return;
    if (DATA.busy) { scheduleUserData(3000); return; }
    const language = state.language;
    const batch = userTextCandidates().slice(0, 40);
    if (!batch.length) return;
    DATA.busy = true;
    for (const text of batch) DATA.asked.add(`${language}|${text}`);
    try {
      const response = await fetch("/api/v1/ui-translate-data", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: language, texts: batch }) });
      const result = response.ok ? await response.json() : null;
      if (!result || result.available === false) { DATA.off = true; return; }
      if (result.busy) for (const text of batch) DATA.asked.delete(`${language}|${text}`);
      if (state.language !== language) return;
      let added = 0;
      for (const [source, out] of Object.entries(result.translations ?? {})) {
        if (typeof out === "string" && out && !CYR.test(out)) {
          // The model drops quotes and brackets around a name; keep the ones the text had.
          const head = /^[^\p{L}\p{N}]*/u.exec(source)[0];
          const tail = /[^\p{L}\p{N}]*$/u.exec(source)[0];
          const fixed = (out.startsWith(head) ? "" : head) + out + (out.endsWith(tail) ? "" : tail);
          DATA.map.set(collapse(source), fixed); added += 1;
        }
      }
      if (added) { engine.setUserData(DATA.map); saveUserData(); apply(true); }
      scheduleUserData(result.busy ? 4000 : 400);
    } catch { /* offline: try again on the next change */ }
    finally { DATA.busy = false; }
  }

  function apply(fromData = false) {
    state.generation += 1;
    if (document.body) walk(document.documentElement);
    else document.addEventListener("DOMContentLoaded", () => walk(document.documentElement), { once: true });
    window.dispatchEvent(new CustomEvent("vox-ui-locale-changed", { detail: state.language }));
    if (fromData !== true) scheduleUserData();
  }

  // Page code tells the layer which language is on screen.
  async function use(code, options = {}) {
    const language = String(code || "ru").toLowerCase();
    state.explicit = true;
    state.language = language;
    if (options.direction) state.directions[language] = options.direction;
    if (language === "ru") { engine.load({}); state.loaded = "ru"; apply(); return language; }
    const catalog = await loadCatalog(language);
    if (state.language !== language) return state.language; // a later call won
    engine.load(catalog?.strings ?? {});
    state.loaded = language;
    DATA.off = false; loadUserData();
    if (catalog?.direction) state.directions[language] = catalog.direction;
    if (state.directions[language]) document.documentElement.dir = state.directions[language];
    observe();
    apply();
    return language;
  }

  function storedLanguage() {
    for (const key of STORAGE_KEYS) {
      try { const value = localStorage.getItem(key); if (value) return value.toLowerCase(); } catch { /* private mode */ }
    }
    return null;
  }

  // Pages that do not choose a language themselves follow the browser choice
  // saved by another page, otherwise the installation default.
  async function autoResolve() {
    if (state.explicit) return;
    const url = new URLSearchParams(location.search).get("lang");
    let code = (url || storedLanguage() || "").slice(0, 8).toLowerCase();
    if (!code) {
      const settings = await fetch("/api/v1/language-settings", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null)).catch(() => null);
      code = settings?.interfaceLanguage ?? "ru";
      if (settings?.customInterfaceLanguages) {
        const custom = settings.customInterfaceLanguages.find((entry) => entry.code === code);
        if (custom?.direction) state.directions[code] = custom.direction;
      }
    }
    if (state.explicit) return;
    document.documentElement.lang = code;
    await use(code);
    state.explicit = false;
  }

  function wrapDialogs() {
    for (const name of ["alert", "confirm", "prompt"]) {
      const original = root[name]?.bind(root);
      if (!original) continue;
      root[name] = (message, ...rest) => original(engine.translate(message) ?? message, ...rest);
    }
  }

  // The Russian original of an element's text, for code that tests what it wrote.
  function sourceText(element) {
    let text = "";
    const walker = document.createTreeWalker(element, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      text += node.__vxOut !== undefined && node.data === node.__vxOut ? node.__vxSrc : node.data;
    }
    return text;
  }

  Object.assign(api, {
    use, apply, sourceText, get language() { return state.language; },
    translate: (text) => (state.language === "ru" ? null : engine.translate(text)),
    // Explicit helper for strings composed in code: t("Сохранено: {0}", count)
    t(text, ...values) {
      const out = (state.language === "ru" ? null : engine.translateCore(collapse(text))) ?? text;
      return out.replace(PLACEHOLDER, (label) => String(values[Number(label.slice(1, -1))] ?? label));
    }
  });
  wrapDialogs();
  const start = () => { autoResolve(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0), { once: true });
  else setTimeout(start, 0);
})(typeof globalThis !== "undefined" ? globalThis : this);
