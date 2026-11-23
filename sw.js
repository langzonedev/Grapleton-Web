const CACHE = 'grapleton-shell-v4';
const scope = self.registration.scope;
const files = [
  './', './index.html', './style.css', './calendar.css', './app.js', './calendar.js', './store.js', './manifest.webmanifest',
  './assets/grapleton-v3-header-128.png',
  './assets/grapleton-v3-192.png', './assets/grapleton-v3-512.png',
  './assets/grapleton-v3-maskable-192.png', './assets/grapleton-v3-maskable-512.png',
  './assets/grapleton-v3-apple-touch-180.png',
  './assets/grapleton-v3-favicon-32.png', './assets/grapleton-v3-favicon-48.png',
  './assets/bottle-red.svg', './assets/bottle-white.svg', './assets/bottle-rose.svg',
  './assets/bottle-sparkling.svg', './assets/bottle-other.svg', './assets/cellar-serif.woff2',
];
const shellURLs = new Set(files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(files.map(file => new Request(new URL(file, scope), { cache: 'reload' })))));
});
self.addEventListener('message', event => {
  if (event.data === 'grapleton:apply-update') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('grapleton-shell-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const navigation = request.mode === 'navigate';
  if (!navigation && !shellURLs.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(navigation ? scope : request)) ?? fetch(request);
  })());
});

