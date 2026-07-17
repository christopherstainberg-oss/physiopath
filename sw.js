/* PhysioPath service worker — offline-first, SPLIT caches.
   TWO independent cache versions, so a routine UI/shell change no longer evicts the ~30MB of
   generated data files (which are content-stable, yet were re-downloaded on every bump):
     - SHELL: the app shell (html/css/app.js/icons/manifest + the two eager data files).
       Bump SHELL_VERSION whenever any of those change — i.e. most commits. Old shells are purged.
     - DATA:  the big lazy-loaded data files, cached on first use and KEPT across shell bumps.
       Bump DATA_VERSION ONLY when a generated data file's *content* actually changes (rare). */
const SHELL_VERSION = "v171";
const DATA_VERSION  = "v1";
const SHELL_CACHE = "physiopath-shell-" + SHELL_VERSION;
const DATA_CACHE  = "physiopath-data-"  + DATA_VERSION;
const KEEP = [SHELL_CACHE, DATA_CACHE];
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/protocols.js",
  "./data/adls.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  // Do NOT skipWaiting here — the page shows a "Refresh" prompt and messages us when ready.
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", e => {
  // Purge everything that isn't the current shell or the stable data cache. This keeps the
  // data cache across shell bumps (the whole point), and cleans up the pre-split caches once.
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
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

  // Everything else: cache-first (matches either cache), then network.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          // Shell assets are precached in SHELL_CACHE, so a miss here is a lazy data file —
          // keep it in the stable DATA cache so shell bumps don't evict it.
          caches.open(DATA_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
