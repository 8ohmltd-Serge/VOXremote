const loaded = new Set();

export function panelFontFamily(id) {
  return id ? `"vox-panel-${id}", Geologica, Calibri, "Segoe UI", sans-serif` : "";
}

export async function installPanelFonts(fonts = []) {
  if (typeof FontFace !== "function") return;
  for (const font of fonts) {
    if (loaded.has(font.id)) continue;
    try {
      const encoded = font.data.split(",")[1];
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const face = new FontFace(`vox-panel-${font.id}`, bytes.buffer);
      await face.load();
      document.fonts.add(face);
      loaded.add(font.id);
    } catch (error) {
      console.warn("Could not load panel font", font.id, error);
    }
  }
}
