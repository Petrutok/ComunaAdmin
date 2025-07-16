'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AutoNotificationPrompt() {
  const [hasPrompted, setHasPrompted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verifică dacă am cerut deja permisiunea
    const prompted = localStorage.getItem('notification_prompted');
    if (prompted) {
      setHasPrompted(true);
      return;
    }

    // Așteaptă puțin pentru o experiență mai bună
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const requestNotificationPermission = async () => {
    // Verifică suportul
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[AutoNotification] Push notifications not supported');
      return;
    }

    try {
      // Verifică permisiunea curentă
      if (Notification.permission === 'granted') {
        // Deja avem permisiune, înregistrează direct
        await subscribeToNotifications();
        return;
      }

      if (Notification.permission === 'denied') {
        // Utilizatorul a refuzat anterior
        localStorage.setItem('notification_prompted', 'true');
        return;
      }

      // Cere permisiunea
      const permission = await Notification.requestPermission();
      localStorage.setItem('notification_prompted', 'true');
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast({
          title: "Notificări activate!",
          description: "Vei primi notificări despre evenimente importante din comună",
        });
      }
    } catch (error) {
      console.error('[AutoNotification] Error:', error);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      // Așteaptă să fie gata service worker-ul
      const registration = await navigator.serviceWorker.ready;
      
      // Verifică dacă există deja o subscripție
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Deja subscris
        return;
      }

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

      console.log('[AutoNotification] Successfully subscribed to push notifications');
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