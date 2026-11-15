// The same seven visual checks are used by Room Planner and the basic hall wizard.
window.VoxPtzCommissioning = Object.freeze({
  labels: Object.freeze({
    "pan-left": "Поворот −45°", "pan-right": "Поворот +45°", "tilt-up": "Наклон +15°",
    "tilt-down": "Наклон −15°", "zoom-in": "Приближение", "zoom-out": "Отдаление", stop: "Стоп",
    "preset-recall": "Вызов пресета", "preset-save": "Пробное сохранение пресета"
  }),
  questions: Object.freeze({
    "pan-left": "Камера повернулась на −45°? Проверьте кадр в предпросмотре.",
    "pan-right": "Камера повернулась на +45°? Проверьте кадр в предпросмотре.",
    "tilt-up": "Камера поднялась на +15°? Проверьте кадр в предпросмотре.",
    "tilt-down": "Камера опустилась на −15°? Проверьте кадр в предпросмотре.",
    "zoom-in": "Камера приблизила изображение? Проверьте кадр в предпросмотре.",
    "zoom-out": "Камера отдалила изображение? Проверьте кадр в предпросмотре.",
    stop: "Камера остановилась? Проверьте кадр в предпросмотре.",
    "preset-recall": "Камера перешла в выбранный пресет? Проверьте кадр в предпросмотре."
  }),
  targets: Object.freeze({
    "pan-left": "Поворот в позицию −45°", "pan-right": "Поворот в позицию +45°",
    "tilt-up": "Наклон в позицию +15°", "tilt-down": "Наклон в позицию −15°",
    "zoom-in": "Приближение", "zoom-out": "Отдаление", stop: "Остановка движения",
    "preset-recall": "Вызов сохранённого пресета"
  }),
  speed(value) { return Math.max(1, Math.min(100, Math.round(Number(value) || 75))); },
  async begin(api, cameraId, options) {
    return api(`/api/v1/admin/cameras/${encodeURIComponent(cameraId)}/commissioning`,
      { method: "POST", body: JSON.stringify(options) });
  },
  async test(api, cameraId, options) {
    return api(`/api/v1/admin/cameras/${encodeURIComponent(cameraId)}/commissioning/test`,
      { method: "POST", body: JSON.stringify(options) });
  },
  async confirm(api, cameraId, options) {
    return api(`/api/v1/admin/cameras/${encodeURIComponent(cameraId)}/commissioning/confirm`,
      { method: "POST", body: JSON.stringify(options) });
  },
  async complete(api, cameraId, options) {
    return api(`/api/v1/admin/cameras/${encodeURIComponent(cameraId)}/commissioning/complete`,
      { method: "POST", body: JSON.stringify(options) });
  }
});
