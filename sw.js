/* Tatry 2026 — service worker (FR-7 offline resilience) */
const V = "t26-v7";
const SHELL = [
  "./", "./index.html", "./app.js", "./data.js", "./i18n.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
];
const TILES = "t26-tiles-v7";
const MAX_TILES = 1200;

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { mode: "cors" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  if (keys.length > MAX_TILES) {
    await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => c.delete(k)));
  }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Předpověď: síť první, cache jako záloha (data si drží i localStorage)
  if (url.hostname === "api.open-meteo.com") {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(V).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Mapové dlaždice a styly: cache první (offline mapa §3 MVP bod 6)
  const isTile = /tile\.openstreetmap\.org|tile\.opentopomap\.org|tile\.waymarkedtrails\.org/.test(url.hostname);
  if (isTile) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(TILES).then(c => c.put(req, copy).then(trimTiles));
        }
        return r;
      }).catch(() => hit))
    );
    return;
  }

  // Aplikační shell (HTML/JS/CSS): SÍŤ PRVNÍ, cache jen jako záloha offline.
  // Zabraňuje tomu, aby po nasazení nové verze zůstal viset starý kód.
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req))
  );
});
