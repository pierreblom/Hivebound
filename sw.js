const CACHE = 'hivebound-v0.6.6';
const LOCAL_ASSETS = [
  '/', '/index.html', '/styles.css', '/game-core.js', '/app.js', '/manifest.webmanifest',
  '/icons/hivebound-icon.svg', '/icons/hivebound-icon-192.png', '/icons/hivebound-icon-512.png',
  '/assets/illustrations/season-cycle.png',
  '/assets/icons/wax-comb.svg', '/assets/icons/nectar-flower.svg', '/assets/icons/honey-jar.svg', '/assets/icons/crown-coins.svg',
  '/assets/hive/queen-bee.png', '/assets/hive/worker-bee.png', '/assets/hive/wasp.png',
  '/assets/hive/egg.svg', '/assets/hive/larva.svg', '/assets/hive/pupa.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || caches.match('/index.html'))));
});
