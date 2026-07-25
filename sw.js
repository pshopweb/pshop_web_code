/* ==========================================================================
   PShop — Service Worker
   Strategy:
     • App shell (HTML/CSS/JS/icons) → stale-while-revalidate
     • Seed JSON data               → stale-while-revalidate (cache first,
                                      refresh in background for instant load)
     • Images                       → cache-first with runtime caching
   ========================================================================== */
const VERSION = 'pshop-v1.1.0';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE  = `${VERSION}-data`;
const IMG_CACHE   = `${VERSION}-img`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/css/pages/home.css',
  './assets/js/core/app.js',
  './assets/js/pages/home.js',
  './assets/img/icons/logo.svg',
  './assets/img/icons/favicon.svg',
  './assets/img/misc/placeholder.svg'
];

const DATA_ASSETS = [
  './assets/data/products.json',
  './assets/data/categories.json',
  './assets/data/banners.json',
  './assets/data/reviews.json',
  './assets/data/coupons.json',
  './assets/data/faqs.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_ASSETS).catch(() => {/* tolerate a missing optional asset */}))
      .then(() => caches.open(DATA_CACHE))
      .then(c => c.addAll(DATA_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // let CDN/font requests pass through

  // Seed data — stale-while-revalidate: serve cache instantly, refresh in background.
  if (url.pathname.includes('/assets/data/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(res => {
          caches.open(DATA_CACHE).then(c => c.put(request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Images — cache first.
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        caches.open(IMG_CACHE).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => caches.match('./assets/img/misc/placeholder.svg')))
    );
    return;
  }

  // Navigations — network first so users get fresh HTML, cache as fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { caches.open(SHELL_CACHE).then(c => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Everything else — stale while revalidate.
  event.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request).then(res => {
        caches.open(SHELL_CACHE).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
