// Service Worker pentru Comuna App - FIXED pentru iOS
console.log('[SW] Service Worker loading...', new Date().toISOString());

// Cache configuration  
const CACHE_NAME = 'comuna-v3'; // Incrementat versiunea
const urlsToCache = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - SIMPLIFIED pentru iOS
self.addEventListener('install', (event) => {
  console.log('[SW] Install event', new Date().toISOString());
  
  // IMPORTANT: Skip waiting imediat pentru iOS
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Cache populated');
      })
      .catch((error) => {
        console.error('[SW] Cache error:', error);
      })
  );
});

// Activate event - SIMPLIFIED
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event', new Date().toISOString());
  
  // IMPORTANT: Claim clients imediat
  event.waitUntil(
    Promise.all([
      // Curăță cache-urile vechi
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('comuna-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Preia controlul imediat
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activated and claimed');
    })
  );
});

// Fetch event - SIMPLIFIED pentru iOS
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension și alte protocoale non-http
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Returnează răspunsul direct
        return response;
      })
      .catch(() => {
        // Fallback la cache doar dacă fetch eșuează
        return caches.match(event.request)
          .then((response) => response || caches.match('/offline.html'));
      })
  );
});

// Push event
self.addEventListener('push', function(event) {
  console.log('[SW] Push received', new Date().toISOString());
  
  if (!event.data) {
    console.log('[SW] No data in push event');
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
    console.log('[SW] Push data:', data);
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body || data.message || 'Notificare nouă',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'default',
    requireInteraction: false,
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
      .then(() => console.log('[SW] Notification shown'))
      .catch((error) => console.error('[SW] Error showing notification:', error))
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then(function(clientList) {
      // Focus existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message event pentru debugging
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded completely', new Date().toISOString());