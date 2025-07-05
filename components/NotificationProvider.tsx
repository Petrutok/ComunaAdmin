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
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[NotificationProvider] Registering service worker...');
      
      // Unregister old service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.scope !== new URL('/', window.location.href).href) {
          await reg.unregister();
          console.log('[NotificationProvider] Unregistered old SW:', reg.scope);
        }
      }
      
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[NotificationProvider] Service Worker registered:', reg);
      setRegistration(reg);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[NotificationProvider] Service Worker is ready');

      // Check for existing subscription
      const subscription = await reg.pushManager.getSubscription();
      console.log('[NotificationProvider] Existing subscription:', !!subscription);
      setIsSubscribed(!!subscription);
      
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

    try {
      // Request notification permission
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

      // Get or create service worker registration
      let reg = registration;
      if (!reg) {
        console.log('[NotificationProvider] No registration found, creating new one...');
        await registerServiceWorker();
        reg = registration;
        
        // Wait for the new registration to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the registration again
        const newReg = await navigator.serviceWorker.getRegistration();
        reg = newReg || null;
      }

      if (!reg) {
        throw new Error('Could not get service worker registration');
      }

      // Ensure service worker is ready
      await navigator.serviceWorker.ready;
      console.log('[NotificationProvider] Service worker ready');

      // iOS specific: wait a bit more
      if (isIOS) {
        console.log('[NotificationProvider] iOS detected, waiting extra time...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check for existing subscription
      let subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        console.log('[NotificationProvider] Found existing subscription, unsubscribing...');
        await subscription.unsubscribe();
      }

      // Get VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found');
      }

      console.log('[NotificationProvider] Subscribing to push manager...');
      
      // Subscribe with proper options
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[NotificationProvider] Subscription successful:', subscription);

      // Save subscription to server
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            isIOS: isIOS,
            isPWA: isStandalone
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('[NotificationProvider] Subscription saved to server');
      setIsSubscribed(true);
      
      // Save to localStorage as backup
      localStorage.setItem('push_subscription', JSON.stringify(subscription.toJSON()));

      toast({
        title: "Succes!",
        description: "Notificările au fost activate",
      });

      // Test notification after 2 seconds
      if (!isIOS) {
        setTimeout(() => {
          console.log('[NotificationProvider] Sending test notification...');
          fetch('/api/push-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Test Notificare',
              message: 'Notificările funcționează corect!',
              url: '/',
              subscriptionsList: [subscription.toJSON()]
            })
          });
        }, 2000);
      }

    } catch (error: any) {
      console.error('[NotificationProvider] Subscription error:', error);
      
      // iOS specific error handling
      if (isIOS && error.message.includes('service worker')) {
        toast({
          title: "Eroare iOS",
          description: "Reîncearcă după câteva secunde. Service Worker-ul se inițializează.",
          variant: "destructive"
        });
        
        // Retry after delay on iOS
        setTimeout(() => {
          console.log('[NotificationProvider] Retrying subscription for iOS...');
          subscribe();
        }, 3000);
      } else {
        toast({
          title: "Eroare",
          description: `Nu s-au putut activa notificările: ${error.message}`,
          variant: "destructive"
        });
      }
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