// Service Worker pentru Comuna App
console.log('[SW] Service Worker loading...');

// Cache configuration
const CACHE_NAME = 'comuna-v2';
const urlsToCache = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .then((response) => response || caches.match('/offline.html'))
  );
});

// Push event
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  
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
      url: data.url || data.data?.url || '/'
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

// Helper function for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

console.log('[SW] Service Worker loaded');