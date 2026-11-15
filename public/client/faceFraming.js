// Face framing of the participant's own camera (owner request 2026-11-03).
// The device finds the face four times a second on a small copy of the
// picture and sends only the face box; VideoCore cuts the participant's tile
// around it on the server. The published camera stream is not changed.
// MediaPipe Tasks Vision 1.2.0 and BlazeFace short range (Apache-2.0) are
// served by VOX-S itself; nothing is fetched from the internet.
const BASE = "/client/vendor/mediapipe/";
const DETECT_INTERVAL_MS = 250;
const LOST_AFTER_MS = 3000;
const KEEPALIVE_MS = 15000;
const MIN_SEND_INTERVAL_MS = 400;
const MOVE_HOLD_MS = 800;
const SAMPLE_WIDTH = 256;

let detectorPromise = null;

function loadDetector() {
  // A transient asset or WASM load failure must not disable face framing for
  // the rest of a remote participant's session.
  detectorPromise ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import(`${BASE}vision_bundle.mjs`);
    if (!(await FilesetResolver.isSimdSupported())) throw new Error("WebAssembly SIMD is unavailable");
    return FaceDetector.createFromOptions({
      wasmLoaderPath: `${BASE}vision_wasm_internal.js`, wasmBinaryPath: `${BASE}vision_wasm_internal.wasm`
    }, {
      baseOptions: { modelAssetPath: `${BASE}blaze_face_short_range.tflite`, delegate: "CPU" },
      runningMode: "VIDEO", minDetectionConfidence: 0.6
    });
  })().catch((error) => { detectorPromise = null; throw error; });
  return detectorPromise;
}

/** Whether a new face box differs enough from the sent one to move the tile. */
export function faceMoved(sent, box) {
  if (!sent || !box) return sent !== box;
  const centre = (value) => ({ x: value.x + value.w / 2, y: value.y + value.h / 2 });
  const a = centre(sent), b = centre(box);
  return Math.abs(a.x - b.x) > 0.05 || Math.abs(a.y - b.y) > 0.05 || Math.abs(box.h / sent.h - 1) > 0.2;
}

/** The largest detected face as fractions of the sampled frame, or null. */
export function largestFace(detections, width, height) {
  let best = null;
  for (const detection of detections ?? []) {
    const box = detection.boundingBox;
    if (!box || box.width <= 0 || box.height <= 0) continue;
    if (!best || box.width * box.height > best.width * best.height) best = box;
  }
  if (!best) return null;
  const x = Math.max(0, best.originX / width), y = Math.max(0, best.originY / height);
  return { x, y, w: Math.min(best.width / width, 1 - x), h: Math.min(best.height / height, 1 - y) };
}

/**
 * Follows the face in `producer.track` until the producer closes, the server
 * reports framing off or `stop()` is called. `send(box)` posts a box or null
 * and resolves to the server answer ({ enabled }).
 */
export function startFaceFraming(producer, send) {
  let stopped = false, timer = null, video = null, track = null;
  let sent = null, sentAt = 0, seenAt = 0, smoothed = null, movingSince = 0, sending = false;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const stop = () => {
    if (stopped) return;
    stopped = true; clearTimeout(timer);
    if (video) { video.srcObject = null; video.remove(); }
    if (sent) send(null).catch(() => {});
  };
  const post = (box) => {
    if (sending) return;
    sending = true; sent = box; sentAt = Date.now();
    send(box).then((answer) => { if (answer?.enabled === false) { handle.refused = true; stop(); } })
      .catch(() => {}).finally(() => { sending = false; });
  };
  const tick = async () => {
    if (stopped) return;
    if (producer.closed || !producer.track || producer.track.readyState !== "live") { stop(); return; }
    try {
      const detector = await loadDetector();
      if (stopped) return;
      if (producer.track !== track) {
        // Safari decodes a playing element only; a hidden, 1 px element in
        // the document keeps frames flowing without being visible.
        track = producer.track;
        video ??= Object.assign(document.createElement("video"), { muted: true, playsInline: true, autoplay: true });
        video.setAttribute("aria-hidden", "true");
        video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
        if (!video.isConnected) document.body.append(video);
        video.srcObject = new MediaStream([track]);
        await video.play().catch(() => {});
      }
      if (video.readyState >= 2 && video.videoWidth) {
        canvas.width = SAMPLE_WIDTH;
        canvas.height = Math.max(2, Math.round(SAMPLE_WIDTH * video.videoHeight / video.videoWidth));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const result = detector.detectForVideo(canvas, performance.now());
        const box = largestFace(result?.detections, canvas.width, canvas.height);
        const now = Date.now();
        if (box) {
          seenAt = now;
          smoothed = smoothed ? Object.fromEntries(Object.keys(box).map((key) => [key, smoothed[key] * 0.5 + box[key] * 0.5])) : box;
          const moved = faceMoved(sent, smoothed);
          if (moved) movingSince ||= now;
          else movingSince = 0;
          if (now - sentAt >= MIN_SEND_INTERVAL_MS &&
              (!sent || moved && now - movingSince >= MOVE_HOLD_MS || now - sentAt >= KEEPALIVE_MS)) {
            post(smoothed);
            movingSince = 0;
          }
        } else if (sent && now - seenAt >= LOST_AFTER_MS) {
          smoothed = null; movingSince = 0; post(null);
        }
      }
    } catch (error) {
      // The remote participant may join before cached model assets finish
      // loading. Keep the camera live and retry without creating another
      // detector for every 250 ms tick.
      handle.lastError = error?.message ?? String(error);
      timer = setTimeout(tick, 10000);
      return;
    }
    timer = setTimeout(tick, DETECT_INTERVAL_MS);
  };
  // refused: the server does not frame this camera; stopped: no longer running.
  const handle = { stop, refused: false, get stopped() { return stopped; } };
  timer = setTimeout(tick, 0);
  return handle;
}
