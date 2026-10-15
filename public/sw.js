// ============================================================================
// Global College — Progressive Web App (PWA) Service Worker
// Enables Desktop (Windows/macOS/Linux) & Mobile (Android/iOS) Installation
// Strategy: High-speed Stale-While-Revalidate & Cache-First for Hashed Chunks
// ============================================================================

const CACHE_NAME = 'global-college-pwa-v4';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Ignore individual asset pre-cache misses
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests over http/https
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Skip cross-origin API calls (Supabase, Paystack, external APIs)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Static Assets with Content Hashes (/assets/*): CACHE-FIRST for lightning-fast loads
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
            const contentType = networkResponse.headers.get('content-type') || '';
            // Only cache valid asset MIME types, never cache SPA index.html fallback as JS/CSS
            if (!contentType.includes('text/html')) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. HTML Navigation requests: Always live network first (ensures fresh hashed chunk script tags)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request).catch(async () => {
        // Only if device is totally offline, fallback to cached shell
        const cached = await caches.match('/index.html') || await caches.match('/');
        if (cached) return cached;
        throw new Error('Offline and no cached shell available');
      })
    );
    return;
  }

  // 3. Other Local Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
