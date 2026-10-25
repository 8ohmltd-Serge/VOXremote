const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (symbol) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[symbol]);

export function roomSeatScheme(selection) {
  const room = selection.room;
  const width = Math.max(1000, Number(room.widthMm) || 1000);
  const height = Math.max(1000, Number(room.heightMm) || 1000);
  const markerRadius = Math.max(90, Math.min(220, Math.min(width, height) * 0.032));
  const fontSize = Math.max(80, markerRadius * 0.9);
  const cameraSize = markerRadius * 0.8;
  const rect = (item, className) => {
    const rectWidth = Math.max(100, Number(item.widthMm) || 100);
    const rectHeight = Math.max(100, Number(item.depthMm ?? item.heightMm) || 100);
    const x = Number(item.xMm) || 0, y = Number(item.yMm) || 0;
    return `<g transform="translate(${x} ${y}) rotate(${Number(item.rotationDeg) || 0})"><rect class="${className}" x="${-rectWidth / 2}" y="${-rectHeight / 2}" width="${rectWidth}" height="${rectHeight}" rx="${Math.min(80, rectWidth / 10, rectHeight / 10)}"/></g>`;
  };
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="aspect-ratio:${width} / ${height}" role="img" aria-label="Схема зала ${escapeHtml(room.name)}">
    <rect class="seat-room" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${Math.min(80, Math.min(width, height) / 20)}"/>
    ${(room.tables ?? []).map((item) => rect(item, "seat-table")).join("")}
    ${(room.obstacles ?? []).map((item) => rect(item, "seat-obstacle")).join("")}
    ${(room.cameras ?? []).map((item) => `<g class="seat-camera" transform="translate(${Number(item.xMm) || 0} ${Number(item.yMm) || 0}) rotate(${Number(item.yawDeg) || 0})"><path d="M${-cameraSize},${-cameraSize * 0.7} h${cameraSize * 1.35} l${cameraSize * 0.8},${cameraSize * 0.7} -${cameraSize * 0.8},${cameraSize * 0.7} h${-cameraSize * 1.35}z"/></g>`).join("")}
    ${selection.stations.map((item) => `<g class="seat-point ${item.available ? "available" : item.occupied ? "occupied" : "no-camera"} ${item.id === selection.selectedStationId ? "is-current" : ""}" data-seat-id="${escapeHtml(item.id)}" transform="translate(${Number(item.xMm) || 0} ${Number(item.yMm) || 0}) rotate(${Number(item.rotationDeg) || 0})"><circle r="${markerRadius}"/><text style="font-size:${fontSize}px" text-anchor="middle" dominant-baseline="central">${item.number}</text></g>`).join("")}
  </svg>`;
}
