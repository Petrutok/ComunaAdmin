// Service Worker: offline cache + web push.
// Bump CACHE_NAME on every change to this file (see CLAUDE.md).

const CACHE_NAME = 'primaria-v7';
const urlsToCache = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// ============================================
// INSTALL / ACTIVATE
// ============================================
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(() => {
        // Don't fail installation if pre-caching fails
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Drop caches from previous deployments
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('primaria-')) {
              return caches.delete(cacheName);
            }
          })
        )
      ),
      self.clients.claim()
    ])
  );
});

// ============================================
// FETCH
// ============================================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http protocols
  if (!event.request.url.startsWith('http')) return;

  // Firebase Storage/Firestore: never intercept, always straight to network
  if (
    event.request.url.includes('firebasestorage.googleapis.com') ||
    event.request.url.includes('firestore.googleapis.com')
  ) {
    return;
  }

  // Every branch below MUST resolve to a real Response object -
  // respondWith(undefined) throws "Returned response is null" in the browser.
  const offlineFallback = () =>
    new Response('Offline', { status: 503, statusText: 'Service Unavailable' });

  // API calls: network only, never serve stale API data from cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => offlineFallback())
    );
    return;
  }

  // Pages (navigations): Network First. HTML must always be fresh -
  // serving cached HTML from an old deployment requests hashed assets
  // (JS/fonts) that no longer exist and 404s.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          return offline || offlineFallback();
        })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): Cache First - Next.js hashes
  // their filenames, so a cache hit is always the correct content
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => offlineFallback())
  );
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', function(event) {
  if (!event.data) {
    return;
  }

  let data = {
    title: 'Notificare nouă',
    body: 'Ai primit o notificare',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  try {
    data = event.data.json();
  } catch (e) {
    // keep the defaults; the notification still shows
  }

  const options = {
    body: data.body || data.message || 'Notificare nouă',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.data?.url || '/',
      timestamp: new Date().toISOString()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificare', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Focus an existing window if we have one
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      // Otherwise open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================
// MESSAGES FROM THE PAGE
// ============================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
