// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Inițializează Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCwJjzr7rRwLFecLrbhG3G4pfAxiAXEwZc",
  authDomain: "village-hub-h1qiy.firebaseapp.com",
  projectId: "village-hub-h1qiy",
  storageBucket: "village-hub-h1qiy.firebasestorage.app",
  messagingSenderId: "802509995277",
  appId: "1:802509995277:web:4c8011f42c67c5da5cc444"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Notificare nouă';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Deschide'
      }
    ]
  };

  // Adaugă link dacă există
  if (payload.fcmOptions?.link || payload.data?.url) {
    notificationOptions.data.url = payload.fcmOptions?.link || payload.data?.url;
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  
  event.notification.close();

  // Deschide URL-ul din notificare
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Caută o fereastră deja deschisă
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Dacă nu există fereastră deschisă, deschide una nouă
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});