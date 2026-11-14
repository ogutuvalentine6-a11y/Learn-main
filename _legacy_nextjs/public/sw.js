// Learn Platform — Service Worker
// Strategy:
//   - API calls: network only (never cached — stale data is worse than none)
//   - Auth: network only (cookies handled by browser, not SW)
//   - Static assets: cache-first
//   - Page navigations: network-first with offline fallback
// Bump CACHE_VERSION to invalidate all caches on deploy.

const CACHE_VERSION = "learn-v1";
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

// Never cache these — always hit network
const NEVER_CACHE = [
  "/api/",
  "/_next/webpack-hmr",
  "/_next/static/webpack",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Skip non-GET (POST/PATCH/DELETE all go to network)
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin (analytics, third-party)
  if (url.origin !== self.location.origin) return;

  // Never cache API or HMR
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return;

  // Navigation requests: network-first, fall back to cache, then offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
