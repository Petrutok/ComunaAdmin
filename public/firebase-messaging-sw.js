importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCwJjzr7rRwLFecLrbhG3G4pfAxiAXEwZc",
  authDomain: "village-hub-h1qiy.firebaseapp.com",
  projectId: "village-hub-h1qiy",
  storageBucket: "village-hub-h1qiy.firebasestorage.app",
  messagingSenderId: "802509995277",
  appId: "1:802509995277:web:4c8011f42c67c5da5cc444"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  
  const notificationTitle = payload.notification.title || 'Notificare nouă';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
