const COLOR = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;

export function validControlColor(value) { return typeof value === "string" && COLOR.test(value); }

export function canonicalControlColor(value) {
  if (!validControlColor(value)) return null;
  return (value.length === 7 ? `${value}FF` : value).toUpperCase();
}

export function controlColorInk(value, base = "#FFFFFF") {
  if (!validControlColor(value)) return "";
  const foreground = canonicalControlColor(value);
  const background = canonicalControlColor(base) ?? "#FFFFFFFF";
  const alpha = parseInt(foreground.slice(7, 9), 16) / 255;
  const rgb = [1, 3, 5].map((at) => {
    const top = parseInt(foreground.slice(at, at + 2), 16);
    const bottom = parseInt(background.slice(at, at + 2), 16);
    return (top * alpha + bottom * (1 - alpha)) / 255;
  });
  const linear = rgb.map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  return luminance > .179 ? "#000000" : "#FFFFFF";
}
