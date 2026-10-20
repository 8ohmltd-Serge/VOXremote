const CACHE = "vox-s-client-v0.7.77-release1";
const SHELL = [
  "/client/",
  "/client/styles.css",
  "/client/refresh.css",
  "/client/legibility.css",
  "/client/controls.css",
  "/client/app.js",
  "/client/clientBuild.js",
  "/client/notificationLocale.js",
  "/client/clientViews.js",
  "/client/roomControlEvents.js",
  "/client/clientOperations.js",
  "/client/eventConnection.js",
  "/client/documentViewer.js",
  "/client/vendor/pdf.mjs",
  "/client/vendor/pdf.worker.mjs",
  "/client/identityEncoding.js",
  "/client/serviceRequestLocale.js",
  "/client/i18n.js",
  "/client/dockLayout.js",
  "/client/icon.svg",
  "/client/manifest.webmanifest",
  "/client/assets/voxordia-logo.svg",
  "/client/assets/fonts/geologica-cyrillic-ext.woff2",
  "/client/assets/fonts/geologica-cyrillic.woff2",
  "/client/assets/fonts/geologica-latin-ext.woff2",
  "/client/assets/fonts/geologica-latin.woff2",
  "/client/vendor/hls.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (!url.pathname.startsWith("/client/")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/client/")))
  );
});
