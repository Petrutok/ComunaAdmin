'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Acest browser nu suportă notificări.');
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Înregistrează Service Worker pentru FCM
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered');
          
          // Obține FCM token
          const messaging = getMessaging();
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          if (token) {
            console.log('FCM Token obtained:', token);
            
            // Salvează în Firestore
            const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(db, 'fcm_tokens', deviceId), {
              token,
              createdAt: new Date(),
              platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web',
              userAgent: navigator.userAgent
            });
            
            // Listen pentru mesaje în foreground
            onMessage(messaging, (payload) => {
              console.log('Message received:', payload);
              if (payload.notification) {
                new Notification(payload.notification.title || 'Notificare nouă', {
                  body: payload.notification.body,
                  icon: '/icon-192x192.png'
                });
              }
            });
            
            // Notificare de test
            new Notification('Comuna - Notificări activate!', {
              body: 'Vei primi notificări despre anunțuri și evenimente noi.',
              icon: '/icon-192x192.png'
            });
          } else {
            throw new Error('Nu s-a putut obține token FCM');
          }
        }
      } else if (result === 'denied') {
        alert('Notificările au fost blocate. Pentru a le activa:\n\n1. Deschide Setări\n2. Găsește această aplicație\n3. Activează Notificările');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      alert('Eroare la activarea notificărilor. Verifică conexiunea la internet și încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonProps = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <Bell className="h-5 w-5 text-green-400" />,
          text: 'Notificări active',
          color: 'bg-green-900/20',
        };
      case 'denied':
        return {
          icon: <BellOff className="h-5 w-5 text-red-400" />,
          text: 'Notificări blocate',
          color: 'bg-red-900/20',
        };
      default:
        return {
          icon: <Bell className="h-5 w-5 text-gray-400" />,
          text: 'Activează notificări',
          color: 'bg-slate-800/50',
        };
    }
  };

  const { icon, text, color } = getButtonProps();

  return (
    <button
      onClick={requestPermission}
      disabled={permission !== 'default' || loading}
      className={`relative p-2 rounded-lg ${color} hover:bg-slate-700/50 transition-colors group`}
      title={text}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      
      {/* Indicator pentru status */}
      <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        permission === 'granted' ? 'bg-green-400' : 
        permission === 'denied' ? 'bg-red-400' : 
        'bg-gray-600'
      }`} />
    </button>
  );
}