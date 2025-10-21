console.log('[SW] Service Worker loading...', new Date().toISOString());

// Cache configuration
const CACHE_NAME = 'primaria-v5';
const urlsToCache = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Install event', new Date().toISOString());
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

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event', new Date().toISOString());
  
  event.waitUntil(
    Promise.all([
      // Curăță cache-urile vechi
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('primaria-')) {
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

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension și alte protocoale non-http
  if (!event.request.url.startsWith('http')) return;

  // Skip Firebase Storage URLs - don't cache, always fetch from network
  if (event.request.url.includes('firebasestorage.googleapis.com')) {
    console.log('[SW] Bypassing cache for Firebase Storage:', event.request.url);
    return; // Let browser handle it normally without service worker intervention
  }

  // Skip Firestore URLs
  if (event.request.url.includes('firestore.googleapis.com')) {
    return; // Let browser handle it normally
  }

  // Network First pentru API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response pentru cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache First pentru assets statice
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Verifică dacă răspunsul e valid
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
      .catch(() => {
        // Fallback la offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});

// ============================================
// BACKGROUND SYNC - Pentru sincronizarea acțiunilor offline
// ============================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  } else if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  } else if (event.tag === 'sync-announcements') {
    event.waitUntil(syncAnnouncements());
  } else if (event.tag.startsWith('sync-form-')) {
    const formId = event.tag.replace('sync-form-', '');
    event.waitUntil(syncSpecificForm(formId));
  }
});

// Funcții pentru sincronizare
async function syncForms() {
  try {
    console.log('[SW] Syncing offline forms...');
    
    // Deschide IndexedDB pentru a prelua formularele salvate offline
    const db = await openDB();
    const tx = db.transaction('pendingForms', 'readonly');
    const store = tx.objectStore('pendingForms');
    const forms = await store.getAll();
    
    for (const form of forms) {
      try {
        const response = await fetch('/api/forms/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form.data)
        });
        
        if (response.ok) {
          // Șterge formularul din IndexedDB după trimitere cu succes
          const deleteTx = db.transaction('pendingForms', 'readwrite');
          await deleteTx.objectStore('pendingForms').delete(form.id);
          
          // Notifică utilizatorul
          await self.registration.showNotification('Formular trimis', {
            body: `Formularul "${form.data.title}" a fost trimis cu succes!`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'form-sync-success',
            data: { formId: form.id }
          });
        }
      } catch (error) {
        console.error('[SW] Error syncing form:', form.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error in syncForms:', error);
  }
}

async function syncReports() {
  try {
    console.log('[SW] Syncing reports...');
    
    const db = await openDB();
    const tx = db.transaction('pendingReports', 'readonly');
    const store = tx.objectStore('pendingReports');
    const reports = await store.getAll();
    
    for (const report of reports) {
      try {
        const formData = new FormData();
        formData.append('title', report.data.title);
        formData.append('description', report.data.description);
        formData.append('location', report.data.location);
        
        if (report.data.image) {
          formData.append('image', report.data.image);
        }
        
        const response = await fetch('/api/reports/submit', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const deleteTx = db.transaction('pendingReports', 'readwrite');
          await deleteTx.objectStore('pendingReports').delete(report.id);
          
          await self.registration.showNotification('Raport trimis', {
            body: `Raportul "${report.data.title}" a fost înregistrat!`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'report-sync-success',
            data: { reportId: report.id }
          });
        }
      } catch (error) {
        console.error('[SW] Error syncing report:', report.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error in syncReports:', error);
  }
}

async function syncAnnouncements() {
  try {
    console.log('[SW] Syncing announcements...');
    
    const db = await openDB();
    const tx = db.transaction('pendingAnnouncements', 'readonly');
    const store = tx.objectStore('pendingAnnouncements');
    const announcements = await store.getAll();
    
    for (const announcement of announcements) {
      try {
        const response = await fetch('/api/announcements/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(announcement.data)
        });
        
        if (response.ok) {
          const deleteTx = db.transaction('pendingAnnouncements', 'readwrite');
          await deleteTx.objectStore('pendingAnnouncements').delete(announcement.id);
          
          await self.registration.showNotification('Anunț publicat', {
            body: `Anunțul "${announcement.data.title}" a fost publicat!`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'announcement-sync-success',
            data: { announcementId: announcement.id }
          });
        }
      } catch (error) {
        console.error('[SW] Error syncing announcement:', announcement.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error in syncAnnouncements:', error);
  }
}

async function syncSpecificForm(formId) {
  try {
    console.log('[SW] Syncing specific form:', formId);
    
    const db = await openDB();
    const tx = db.transaction('pendingForms', 'readonly');
    const form = await tx.objectStore('pendingForms').get(formId);
    
    if (form) {
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.data)
      });
      
      if (response.ok) {
        const deleteTx = db.transaction('pendingForms', 'readwrite');
        await deleteTx.objectStore('pendingForms').delete(formId);
        
        await self.registration.showNotification('Formular sincronizat', {
          body: 'Formularul a fost trimis cu succes!',
          icon: '/icon-192x192.png'
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error syncing specific form:', error);
  }
}

// ============================================
// PERIODIC BACKGROUND SYNC - Pentru actualizări periodice
// ============================================
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'check-announcements') {
    event.waitUntil(checkNewAnnouncements());
  } else if (event.tag === 'check-tax-deadlines') {
    event.waitUntil(checkTaxDeadlines());
  } else if (event.tag === 'update-content') {
    event.waitUntil(updateAppContent());
  } else if (event.tag === 'check-form-status') {
    event.waitUntil(checkFormStatus());
  }
});

// Funcții pentru periodic sync
async function checkNewAnnouncements() {
  try {
    console.log('[SW] Checking for new announcements...');
    
    const response = await fetch('/api/announcements/latest');
    if (response.ok) {
      const data = await response.json();
      
      // Salvează în cache pentru acces offline
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/announcements/latest', response.clone());
      
      // Verifică dacă sunt anunțuri noi
      const lastCheck = await getLastCheckTime('announcements');
      const newAnnouncements = data.announcements.filter(a => 
        new Date(a.createdAt) > new Date(lastCheck)
      );
      
      if (newAnnouncements.length > 0) {
        await self.registration.showNotification('Anunțuri noi', {
          body: `Ai ${newAnnouncements.length} anunț(uri) nou(i) de la primărie`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'new-announcements',
          data: { url: '/anunturi' }
        });
      }
      
      await saveLastCheckTime('announcements');
    }
  } catch (error) {
    console.error('[SW] Error checking announcements:', error);
  }
}

async function checkTaxDeadlines() {
  try {
    console.log('[SW] Checking tax deadlines...');
    
    const response = await fetch('/api/taxes/deadlines');
    if (response.ok) {
      const data = await response.json();
      
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/taxes/deadlines', response.clone());
      
      // Verifică taxele cu scadență în următoarele 7 zile
      const upcomingTaxes = data.taxes.filter(tax => {
        const deadline = new Date(tax.deadline);
        const now = new Date();
        const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);
        return daysUntilDeadline > 0 && daysUntilDeadline <= 7;
      });
      
      if (upcomingTaxes.length > 0) {
        const taxNames = upcomingTaxes.map(t => t.name).join(', ');
        await self.registration.showNotification('Taxe de plătit', {
          body: `Ai taxe cu scadență apropiată: ${taxNames}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'tax-deadline',
          requireInteraction: true,
          actions: [
            { action: 'pay', title: 'Plătește acum' },
            { action: 'later', title: 'Mai târziu' }
          ],
          data: { url: '/taxes' }
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error checking tax deadlines:', error);
  }
}

async function updateAppContent() {
  try {
    console.log('[SW] Updating app content...');
    
    // Actualizează cache-ul pentru paginile principale
    const pagesToUpdate = [
      '/',
      '/anunturi',
      '/taxes',
      '/cereri-online',
      '/api/announcements/latest',
      '/api/taxes/status'
    ];
    
    const cache = await caches.open(CACHE_NAME);
    
    for (const url of pagesToUpdate) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log(`[SW] Updated cache for: ${url}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to update cache for ${url}:`, error);
      }
    }
    
    // Notifică clientul că conținutul a fost actualizat
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CONTENT_UPDATED',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('[SW] Error updating app content:', error);
  }
}

async function checkFormStatus() {
  try {
    console.log('[SW] Checking form status updates...');
    
    const response = await fetch('/api/forms/status');
    if (response.ok) {
      const data = await response.json();
      
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/forms/status', response.clone());
      
      // Verifică dacă sunt actualizări de status
      const updatedForms = data.forms.filter(form => 
        form.statusChanged && form.userNotified === false
      );
      
      for (const form of updatedForms) {
        await self.registration.showNotification('Status cerere actualizat', {
          body: `Cererea "${form.title}" are statusul: ${form.status}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `form-status-${form.id}`,
          data: { url: `/cereri/${form.id}` }
        });
        
        // Marchează ca notificat
        await fetch(`/api/forms/${form.id}/mark-notified`, {
          method: 'POST'
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error checking form status:', error);
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================
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
    requireInteraction: data.requireInteraction || false,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.data?.url || '/',
      timestamp: new Date().toISOString()
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificare', options)
      .then(() => console.log('[SW] Notification shown'))
      .catch((error) => console.error('[SW] Error showing notification:', error))
  );
});

// ============================================
// NOTIFICATION CLICK & ACTION HANDLERS
// ============================================
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'pay') {
    // Acțiune pentru plata taxelor
    event.waitUntil(
      clients.openWindow('/taxes/pay')
    );
  } else if (event.action === 'later') {
    // Programează o reamintire
    event.waitUntil(
      scheduleReminder(event.notification.data)
    );
  } else {
    // Click pe notificare (fără acțiune specifică)
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
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PrimariaDigitalaDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingForms')) {
        db.createObjectStore('pendingForms', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingReports')) {
        db.createObjectStore('pendingReports', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingAnnouncements')) {
        db.createObjectStore('pendingAnnouncements', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
      }
    };
  });
}

async function getLastCheckTime(key) {
  try {
    const db = await openDB();
    const tx = db.transaction('syncMetadata', 'readonly');
    const store = tx.objectStore('syncMetadata');
    const data = await store.get(`lastCheck_${key}`);
    return data?.timestamp || new Date(0).toISOString();
  } catch (error) {
    console.error('[SW] Error getting last check time:', error);
    return new Date(0).toISOString();
  }
}

async function saveLastCheckTime(key) {
  try {
    const db = await openDB();
    const tx = db.transaction('syncMetadata', 'readwrite');
    const store = tx.objectStore('syncMetadata');
    await store.put({
      key: `lastCheck_${key}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SW] Error saving last check time:', error);
  }
}

async function scheduleReminder(data) {
  // Programează o notificare de reamintire pentru mai târziu
  console.log('[SW] Scheduling reminder for later');
  
  // Salvează în IndexedDB pentru a fi procesată mai târziu
  try {
    const db = await openDB();
    const tx = db.transaction('reminders', 'readwrite');
    const store = tx.objectStore('reminders');
    
    await store.add({
      data: data,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 ore
      created: new Date()
    });
    
    console.log('[SW] Reminder scheduled successfully');
  } catch (error) {
    console.error('[SW] Error scheduling reminder:', error);
  }
}

// ============================================
// MESSAGE EVENT - Pentru comunicare cu clientul
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // Handle sync requests from client
  if (event.data.type === 'SYNC_FORMS') {
    event.waitUntil(syncForms());
  }
  
  if (event.data.type === 'SYNC_REPORTS') {
    event.waitUntil(syncReports());
  }
  
  if (event.data.type === 'CHECK_UPDATES') {
    event.waitUntil(updateAppContent());
  }
  
  // Register periodic sync
  if (event.data.type === 'REGISTER_PERIODIC_SYNC') {
    event.waitUntil(registerPeriodicSync());
  }
});

// ============================================
// REGISTER PERIODIC SYNC
// ============================================
async function registerPeriodicSync() {
  try {
    const registration = await self.registration;
    
    // Check if periodic sync is supported
    if ('periodicSync' in registration) {
      // Register different periodic syncs
      await registration.periodicSync.register('check-announcements', {
        minInterval: 12 * 60 * 60 * 1000 // 12 ore
      });
      
      await registration.periodicSync.register('check-tax-deadlines', {
        minInterval: 24 * 60 * 60 * 1000 // 24 ore
      });
      
      await registration.periodicSync.register('update-content', {
        minInterval: 6 * 60 * 60 * 1000 // 6 ore
      });
      
      await registration.periodicSync.register('check-form-status', {
        minInterval: 3 * 60 * 60 * 1000 // 3 ore
      });
      
      console.log('[SW] Periodic sync registered successfully');
    } else {
      console.log('[SW] Periodic sync not supported');
    }
  } catch (error) {
    console.error('[SW] Error registering periodic sync:', error);
  }
}

console.log('[SW] Service Worker loaded completely', new Date().toISOString());