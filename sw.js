// Offline support: serve from cache straight away (so the game opens with no
// signal), and refresh the cache in the background so updates arrive next launch.
const CACHE = 'blox-legends-v1';
const CORE = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'vendor/three.module.min.js',
  'vendor/three.core.min.js',
  'fonts/lexend-latin-400-normal.woff2',
  'fonts/lexend-latin-600-normal.woff2',
  'fonts/lexend-latin-700-normal.woff2',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
