'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationContextType {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  permission: 'default',
  isSupported: false,
  isSubscribed: false,
  subscribe: async () => {},
  unsubscribe: async () => {}
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;

      if (isIOS && !isStandalone) {
        console.log('iOS detected - PWA installation required for notifications');
        // Nu afișăm toast aici - lasă PWAInstallPrompt să se ocupe
      }

      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[NotificationProvider] Registering service worker...');
      
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[NotificationProvider] Service Worker registered:', reg);
      setRegistration(reg);
      
      await navigator.serviceWorker.ready;
      console.log('[NotificationProvider] Service Worker is ready');

      const subscription = await reg.pushManager.getSubscription();
      console.log('[NotificationProvider] Existing subscription:', !!subscription);
      setIsSubscribed(!!subscription);
      
      navigator.serviceWorker.addEventListener('message', event => {
        console.log('[NotificationProvider] Message from SW:', event.data);
      });
      
      reg.addEventListener('updatefound', () => {
        console.log('[NotificationProvider] Service Worker update found');
      });
      
    } catch (error) {
      console.error('[NotificationProvider] Service Worker registration failed:', error);
    }
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

  const subscribe = async () => {
    console.log('[NotificationProvider] Starting subscription process...');
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    console.log('[NotificationProvider] Platform check - iOS:', isIOS, 'PWA:', isStandalone);
    
    if (isIOS && !isStandalone) {
      toast({
        title: "Instalează aplicația mai întâi",
        description: "Pe iOS, notificările funcționează doar în aplicația instalată. Apasă Share → Add to Home Screen",
        variant: "destructive",
        duration: 6000
      });
      return;
    }

    if (!registration) {
      console.error('[NotificationProvider] No service worker registration');
      toast({
        title: "Eroare",
        description: "Service Worker nu este înregistrat",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('[NotificationProvider] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[NotificationProvider] Permission result:', permission);
      setPermission(permission);

      if (permission !== 'granted') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu poți primi notificări fără permisiune",
          variant: "destructive"
        });
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('[NotificationProvider] VAPID public key not found');
        throw new Error('VAPID public key not found');
      }

      console.log('[NotificationProvider] Subscribing to push manager...');
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[NotificationProvider] Subscription successful:', subscription);
      console.log('[NotificationProvider] Endpoint:', subscription.endpoint);

      console.log('[NotificationProvider] Sending subscription to server...');
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent),
            isPWA: window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true
          }
        }),
      });

      if (!response.ok) {
        console.error('[NotificationProvider] Server response not OK:', response.status);
        throw new Error('Failed to save subscription');
      }

      console.log('[NotificationProvider] Subscription saved to server');
      setIsSubscribed(true);
      localStorage.setItem('push_subscription', JSON.stringify(subscription));

      toast({
        title: "Succes!",
        description: "Notificările au fost activate",
      });

      // Test notification after 2 seconds
      setTimeout(() => {
        console.log('[NotificationProvider] Sending test notification...');
        fetch('/api/push-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Notificare',
            message: 'Notificările funcționează corect!',
            url: '/',
            subscriptionsList: [subscription]
          })
        }).then(res => {
          console.log('[NotificationProvider] Test notification response:', res.status);
        }).catch(err => {
          console.error('[NotificationProvider] Test notification error:', err);
        });
      }, 2000);

    } catch (error) {
      console.error('[NotificationProvider] Error subscribing:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut activa notificările. Vezi consola pentru detalii.",
        variant: "destructive"
      });
    }
  };

  const unsubscribe = async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        await fetch('/api/push-subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          }),
        });

        localStorage.removeItem('push_subscription');
        setIsSubscribed(false);

        toast({
          title: "Notificări dezactivate",
          description: "Nu vei mai primi notificări",
        });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut dezactiva notificările",
        variant: "destructive"
      });
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        permission, 
        isSupported, 
        isSubscribed, 
        subscribe, 
        unsubscribe 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}