const CACHE = 'smartloan-v1';

const PRECACHE = [
  '/',
  '/admin.html',
  '/app.js',
  '/admin.js',
  '/styles.css',
  '/admin.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/pages/welcome.html',
  '/pages/auth.html',
  '/pages/dashboard.html',
  '/pages/admin-dashboard.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE) return caches.delete(k); }))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
