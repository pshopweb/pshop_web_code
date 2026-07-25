/* ==========================================================================
   PShop — Service Worker
   Strategy:
     • App shell (HTML/CSS/JS/icons) → stale-while-revalidate
     • Data JS modules             → included in shell cache (loaded as JS)
     • Images                       → cache-first with runtime caching
   ========================================================================== */
const VERSION = 'pshop-v1.2.0';
const SHELL_CACHE = `${VERSION}-shell`;
const IMG_CACHE   = `${VERSION}-img`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/css/pages/home.css',
  './assets/js/core/app.js',
  './assets/js/pages/home.js',
  './assets/data/products.js',
  './assets/data/categories.js',
  './assets/data/banners.js',
  './assets/img/icons/logo.svg',
  './assets/img/icons/favicon.svg',
  './assets/img/misc/placeholder.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_ASSETS).catch(() => {/* tolerate a missing optional asset */}))
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
