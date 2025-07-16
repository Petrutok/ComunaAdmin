'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AutoNotificationPrompt() {
  const [hasChecked, setHasChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verifică doar o dată per sesiune
    if (hasChecked) return;
    setHasChecked(true);

    // Verifică dacă sunt suportate notificările
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[AutoNotification] Push notifications not supported');
      return;
    }

    // Verifică permisiunea curentă
    const currentPermission = Notification.permission;
    console.log('[AutoNotification] Current permission:', currentPermission);

    // Dacă permisiunea nu a fost cerută niciodată, cere-o după 3 secunde
    if (currentPermission === 'default') {
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Dacă avem deja permisiune dar nu suntem subscrisi, subscrie automat
    if (currentPermission === 'granted') {
      checkAndSubscribe();
    }
  }, [hasChecked]);

  const checkAndSubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (!existingSubscription) {
        console.log('[AutoNotification] No subscription found, creating one...');
        await subscribeToNotifications();
      } else {
        console.log('[AutoNotification] Already subscribed');
      }
    } catch (error) {
      console.error('[AutoNotification] Error checking subscription:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      console.log('[AutoNotification] Requesting permission...');
      
      // Afișează un toast informativ înainte de a cere permisiunea
      toast({
        title: "Activează notificările",
        description: "Primește notificări despre evenimente importante din comună",
        duration: 5000,
      });

      // Așteaptă puțin pentru ca utilizatorul să citească toast-ul
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cere permisiunea
      const permission = await Notification.requestPermission();
      console.log('[AutoNotification] Permission result:', permission);
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast({
          title: "Notificări activate! ✅",
          description: "Vei primi notificări despre evenimente importante",
        });
      } else if (permission === 'denied') {
        console.log('[AutoNotification] Permission denied by user');
      }
    } catch (error) {
      console.error('[AutoNotification] Error requesting permission:', error);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      console.log('[AutoNotification] Starting subscription process...');
      
      // Așteaptă să fie gata service worker-ul
      const registration = await navigator.serviceWorker.ready;
      console.log('[AutoNotification] Service worker ready');
      
      // Verifică dacă există deja o subscripție
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[AutoNotification] Already has subscription, updating server...');
      } else {
        // Creează subscripție nouă
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('[AutoNotification] VAPID public key not found');
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        console.log('[AutoNotification] Created new subscription');
      }

      // Trimite la server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            platform: detectPlatform(),
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      const result = await response.json();
      console.log('[AutoNotification] Successfully subscribed:', result);
      
      // Trimite o notificare de test locală
      if ('showNotification' in registration) {
        registration.showNotification('Notificări activate! 🎉', {
          body: 'Vei primi notificări despre evenimente importante din comună',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'welcome-notification'
        });
      }
    } catch (error) {
      console.error('[AutoNotification] Subscribe error:', error);
    }
  };

  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'web';
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Acest component nu randează nimic vizibil
  return null;
}