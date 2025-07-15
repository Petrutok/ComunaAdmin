'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('[NotificationButton] Notifications not supported');
      setIsSupported(false);
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('[NotificationButton] Service Worker not supported');
      setIsSupported(false);
      return;
    }

    if (!('PushManager' in window)) {
      console.log('[NotificationButton] Push API not supported');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    // Check current permission
    setPermission(Notification.permission);
    
    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[NotificationButton] Error checking subscription:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "Nu sunt suportate",
        description: "Dispozitivul tău nu suportă notificări push",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        await unsubscribeFromNotifications();
      } else {
        // Subscribe
        await subscribeToNotifications();
      }
    } catch (error) {
      console.error('[NotificationButton] Toggle error:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut modifica setarea notificărilor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      // First check permission
      if (Notification.permission === 'denied') {
        toast({
          title: "Permisiune refuzată",
          description: "Te rugăm să activezi notificările din setările browserului",
          variant: "destructive"
        });
        return;
      }

      // Request permission if needed
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        setPermission(result);
        
        if (result !== 'granted') {
          toast({
            title: "Permisiune refuzată",
            description: "Nu putem trimite notificări fără permisiunea ta",
            variant: "destructive"
          });
          return;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      // If exists, unsubscribe first
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Create new subscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found');
      }

      // Convert VAPID key
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send to server
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

      setIsSubscribed(true);
      toast({
        title: "Notificări activate!",
        description: "Vei primi notificări despre evenimente importante",
      });

    } catch (error) {
      console.error('[NotificationButton] Subscribe error:', error);
      throw error;
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsSubscribed(false);
      toast({
        title: "Notificări dezactivate",
        description: "Nu vei mai primi notificări",
      });

    } catch (error) {
      console.error('[NotificationButton] Unsubscribe error:', error);
      throw error;
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

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleNotifications}
      disabled={isLoading}
      variant={isSubscribed ? "destructive" : "default"}
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Se procesează...
        </>
      ) : isSubscribed ? (
        <>
          <BellOff className="h-4 w-4 mr-2" />
          Dezactivează notificări
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Activează notificări
        </>
      )}
    </Button>
  );
}