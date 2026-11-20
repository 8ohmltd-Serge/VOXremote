// The brand's red O in page titles (owner rule, 0.8.41): in every h1 of the public pages exactly one
// letter O is red — among all o/O/о/О (Latin and Cyrillic) of the phrase, the one nearest to the centre
// of the phrase by character index; on a tie the left one. A phrase without O has no red letter.
//
// Titles marked data-red-o keep their Russian text as the source; after the translation layer
// (/client/uiLocale.js) switches the language, the title is rebuilt from the translated phrase.
// Pages that localise the title themselves call VoxRedO.render(element, text).
// The heading carries the plain phrase in aria-label and translate="no", so a screen reader reads
// the word whole and the translation layer never sees the split pieces.
(function (root) {
  "use strict";
  const IS_O = /^[oOоО]$/u;
  const collapse = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();

  // Index (in code points) of the red O, or -1.
  function pick(text) {
    const chars = Array.from(collapse(text));
    const centre = (chars.length - 1) / 2;
    let best = -1;
    let distance = Infinity;
    chars.forEach((char, index) => {
      if (!IS_O.test(char)) return;
      const d = Math.abs(index - centre);
      if (d < distance) { best = index; distance = d; }
    });
    return best;
  }

  function render(element, text, own = true) {
    if (!element) return;
    const phrase = collapse(text);
    if (own) element.__redOOwn = true;
    element.setAttribute("translate", "no");
    element.setAttribute("aria-label", phrase);
    const chars = Array.from(phrase);
    const at = pick(phrase);
    if (at < 0 || typeof document === "undefined") { element.textContent = phrase; return; }
    const mark = document.createElement("span");
    mark.className = "o";
    mark.textContent = chars[at];
    element.replaceChildren(chars.slice(0, at).join(""), mark, chars.slice(at + 1).join(""));
  }

  const locale = () => root.VoxLocale;
  function source(element) {
    if (element.__redOSource === undefined) {
      element.__redOSource = collapse(locale()?.sourceText?.(element) ?? element.textContent);
    }
    return element.__redOSource;
  }
  function refresh() {
    if (typeof document === "undefined") return;
    for (const element of document.querySelectorAll("h1[data-red-o]")) {
      if (element.__redOOwn) continue;
      const text = source(element);
      render(element, locale()?.translate?.(text) ?? text, false);
    }
  }

  root.VoxRedO = { pick, render, refresh };
  if (typeof document === "undefined" || typeof window === "undefined") return;
  window.addEventListener("vox-ui-locale-changed", refresh);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
  else refresh();
})(typeof globalThis !== "undefined" ? globalThis : this);
