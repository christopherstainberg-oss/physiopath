/* PhysioPath service worker — offline-first caching + safe update flow.
   Bump CACHE version whenever app assets change so clients update. */
const CACHE = "physiopath-v79";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/conditions.js",
  "./data/protocols.js",
  "./data/exercises.js",
  "./data/medications.js",
  "./data/surgeries.js",
  "./data/sports.js",
  "./data/activities.js",
  "./data/adls.js",
  "./data/adl-exercises.js",
  "./data/coach-kb.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  // Do NOT skipWaiting here — the page shows a "Refresh" prompt and messages us when ready.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Let the page trigger activation of a waiting worker.
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navigations: network-first, fall back to the cached app shell (works offline, incl. ?go= URLs).
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Everything else: cache-first, then network (and cache same-origin successes).
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
