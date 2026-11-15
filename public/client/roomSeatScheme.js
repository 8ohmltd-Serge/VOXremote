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
    ${selection.stations.map((item) => `<g class="seat-point ${item.available ? "available" : item.occupied ? "occupied" : "no-camera"} ${item.id === selection.selectedStationId ? "is-current" : ""}" data-seat-id="${escapeHtml(item.id)}" transform="translate(${Number(item.xMm) || 0} ${Number(item.yMm) || 0}) rotate(${Number(item.rotationDeg) || 0})"><title>${escapeHtml(item.name)}${item.externalDeskId ? ` · Пульт ${escapeHtml(item.externalDeskId)}` : ""}</title><rect class="seat-chair-back" x="${-markerRadius * .75}" y="${-markerRadius * .9}" width="${markerRadius * 1.5}" height="${markerRadius * 1.25}" rx="${markerRadius * .32}"/><path class="seat-chair-base" d="M${-markerRadius * .85} ${markerRadius * .12} Q0 ${markerRadius * .65} ${markerRadius * .85} ${markerRadius * .12} L${markerRadius * .65} ${markerRadius * .85} H${-markerRadius * .65}Z"/><circle class="seat-number" cy="${-markerRadius * .25}" r="${markerRadius * .48}"/><text y="${-markerRadius * .25}" style="font-size:${fontSize * .72}px" text-anchor="middle" dominant-baseline="central">${item.number}</text>${item.externalDeskId ? `<g class="seat-console" transform="translate(${markerRadius * 1.08} ${-markerRadius * .35})"><rect x="${-markerRadius * .48}" y="${-markerRadius * .32}" width="${markerRadius * .96}" height="${markerRadius * .64}" rx="${markerRadius * .12}"/><path d="M${-markerRadius * .3} ${-markerRadius * .08}h${markerRadius * .6}M${-markerRadius * .3} ${markerRadius * .1}h${markerRadius * .35}"/><circle cx="${markerRadius * .28}" cy="${markerRadius * .12}" r="${markerRadius * .07}"/></g>` : ""}</g>`).join("")}
  </svg>`;
}

export function roomSeatDialog(selection) {
  return `<header class="room-seat-head"><div><h3>${selection.selectedStationId ? "Изменить место" : "Выберите место"}</h3><p>Нажмите свободное место на схеме или в списке. Текущее место можно выбрать повторно.</p></div><button type="button" class="dialog-icon-close" data-dialog-close data-seat-later aria-label="Закрыть">×</button></header>
    <div class="room-seat-layout"><div class="room-seat-scheme">${roomSeatScheme(selection)}</div>
    <div class="room-seat-list">${selection.stations.map((item) => `<button type="button" class="${item.id === selection.selectedStationId ? "is-current" : ""}" data-seat-id="${escapeHtml(item.id)}" ${item.available ? "" : "disabled"}>${item.number}. ${escapeHtml(item.name)}${item.externalDeskId ? ` · пульт ${escapeHtml(item.externalDeskId)}` : ""}${item.id === selection.selectedStationId ? " · текущее место" : item.occupied ? " · занято" : item.hasCamera ? "" : " · нет камеры"}</button>`).join("")}</div></div>
    <div class="actions"><button type="button" data-seat-later>Выбрать позже</button></div>`;
}
