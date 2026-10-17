// ============================================================================
// Global College — Progressive Web App (PWA) Service Worker
// Enables Desktop (Windows/macOS/Linux) & Mobile (Android/iOS) Installation
// Strategy: High-speed Stale-While-Revalidate & Cache-First for Hashed Chunks
// ============================================================================

const CACHE_NAME = 'global-college-pwa-v5';
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

// 4. Web Push Notifications: Handle background push & notification clicks
self.addEventListener('push', (event) => {
  let data = {
    title: 'Global College Alert',
    body: 'You have a new institutional update from Global College.',
    icon: '/logo.png',
    badge: '/favicon.ico',
    url: '/',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open Portal' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

