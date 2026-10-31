// Service worker : l'app s'ouvre instantanément et reste consultable hors ligne (sauf l'analyse).
const VERSION = "ada-v11";
const SHELL = [
  "/",
  "/index.html",
  "/css/app.css",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/js/app.js",
  "/js/store.js",
  "/js/router.js",
  "/js/ui.js",
  "/js/install.js",
  "/js/taxonomy.js",
  "/js/markdown.js",
  "/js/config.js",
  "/js/cloud.js",
  "/js/fiche.js",
  "/js/seed.js",
  "/js/views/login.js",
  "/js/views/home.js",
  "/js/views/library.js",
  "/js/views/reel.js",
  "/js/views/board.js",
  "/js/views/snippets.js",
  "/js/views/tools.js",
  "/js/views/editor.js",
  "/js/views/importer.js",
  "/js/views/share.js",
  "/js/views/settings.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__/")) return; // API et connexion Google : toujours en direct

  // Polices Google, SDK Firebase et générateur de QR code (adresses versionnées) : cache d'abord.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) || (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/npm/qrcode@"))) {
    event.respondWith(
      caches.open(`${VERSION}-runtime`).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok || res.type === "opaque") cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }
  if (url.origin !== location.origin) return;

  // Navigation : réseau d'abord (nouvelle version), coquille en cache sinon.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  // Fichiers de l'app : réponse immédiate depuis le cache, mise à jour en arrière-plan.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
