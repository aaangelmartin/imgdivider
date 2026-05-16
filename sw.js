/**
 * ImgDivider — Service Worker
 * Cache-first strategy for full offline support.
 */

const CACHE_NAME = 'imgdivider-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/main.css',
  '/src/css/components.css',
  '/src/css/responsive.css',
  '/src/js/vendor/jszip.min.js',
  '/src/js/app.js',
  '/src/js/uiController.js',
  '/src/js/imageProcessor.js',
  '/src/js/presets.js',
  '/src/js/zipExporter.js',
  '/src/js/sw-register.js',
  '/src/assets/icons/favicon-16.png',
  '/src/assets/icons/favicon-32.png',
  '/src/assets/icons/icon-72.png',
  '/src/assets/icons/icon-96.png',
  '/src/assets/icons/icon-128.png',
  '/src/assets/icons/icon-144.png',
  '/src/assets/icons/icon-152.png',
  '/src/assets/icons/icon-192.png',
  '/src/assets/icons/icon-384.png',
  '/src/assets/icons/icon-512.png'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // Optionally cache new GET requests
        if (event.request.method === 'GET' && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback could go here
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
