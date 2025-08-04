'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationContextType {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isSubscribed: false,
  isSupported: false,
  subscribe: async () => {},
  unsubscribe: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    // Verifică suportul pentru notificări
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window;
    
    setIsSupported(supported);
    
    if (!supported) {
      console.log('[Notifications] Not supported on this device');
      return;
    }

    try {
      // Înregistrează service worker-ul
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Notifications] Service Worker registered:', registration.scope);
      }

      // Verifică dacă există deja o subscripție
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('[Notifications] Found existing subscription');
        setIsSubscribed(true);
        return;
      }

      // Verifică statusul permisiunii
      const currentPermission = Notification.permission;
      console.log('[Notifications] Current permission:', currentPermission);

      // Verifică dacă am întrebat deja (folosind localStorage)
      const hasAskedBefore = localStorage.getItem('notification_permission_asked');
      
      // Dacă permisiunea este 'default' și nu am întrebat niciodată
      if (currentPermission === 'default' && !hasAskedBefore) {
        console.log('[Notifications] First time user - will request permission');
        
        // Marchează că am întrebat
        localStorage.setItem('notification_permission_asked', 'true');
        
        // Așteaptă 2 secunde pentru ca utilizatorul să se acomodeze cu aplicația
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Afișează un toast informativ
        toast({
          title: "Fii la curent cu noutățile! 🔔",
          description: "Activează notificările pentru a primi informații importante din comună",
          duration: 4000,
        });
        
        // Așteaptă puțin pentru ca utilizatorul să citească toast-ul
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Solicită permisiunea folosind dialogul nativ
        const permission = await Notification.requestPermission();
        console.log('[Notifications] Permission result:', permission);
        
        if (permission === 'granted') {
          // Dacă a acceptat, subscrie automat
          await subscribeToNotifications();
          
          // Afișează confirmarea
          toast({
            title: "Excelent! ✅",
            description: "Notificările au fost activate cu succes",
            duration: 3000,
          });
        } else if (permission === 'denied') {
          // Salvează că utilizatorul a refuzat
          localStorage.setItem('notification_permission_denied', 'true');
          console.log('[Notifications] User denied permission');
        }
      } else if (currentPermission === 'granted' && !existingSubscription) {
        // Dacă avem permisiune dar nu suntem subscrisi, subscrie automat
        console.log('[Notifications] Has permission but no subscription, subscribing...');
        await subscribeToNotifications();
      }
      
      setHasInitialized(true);
    } catch (error) {
      console.error('[Notifications] Initialization error:', error);
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

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      });

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: detectPlatform(),
      };

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          deviceInfo
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log('[Notifications] Successfully subscribed');
        
        // Salvează în localStorage pentru acces rapid
        localStorage.setItem('push_subscription', JSON.stringify(subscription.toJSON()));
        
        // Trimite o notificare de bun venit (opțional)
        if ('showNotification' in registration) {
          registration.showNotification('Bine ai venit! 👋', {
            body: 'Notificările sunt acum active. Vei primi informații importante despre comună.',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'welcome'
          });
        }
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('[Notifications] Subscribe error:', error);
      throw error;
    }
  };

  const subscribe = async () => {
    try {
      // Check iOS specific requirements
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
      
      if (isIOS && !isStandalone) {
        toast({
          title: "Instalează aplicația mai întâi",
          description: "Pe iOS, notificările funcționează doar în aplicația instalată. Apasă Share → Add to Home Screen",
          variant: "destructive",
          duration: 6000
        });
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu s-au putut activa notificările",
          variant: "destructive"
        });
        return;
      }

      await subscribeToNotifications();
      
      toast({
        title: "Succes!",
        description: "Notificările au fost activate",
      });
    } catch (error) {
      console.error('[Notifications] Error subscribing:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut activa notificările",
        variant: "destructive"
      });
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          }),
        });
        
        setIsSubscribed(false);
        
        // Șterge din localStorage
        localStorage.removeItem('push_subscription');
        
        toast({
          title: "Notificări dezactivate",
          description: "Nu vei mai primi notificări",
        });
      }
    } catch (error) {
      console.error('[Notifications] Error unsubscribing:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut dezactiva notificările",
        variant: "destructive"
      });
    }
  };

  return (
    <NotificationContext.Provider value={{ isSubscribed, isSupported, subscribe, unsubscribe }}>
      {children}
    </NotificationContext.Provider>
  );
}

function detectPlatform(): 'web' | 'ios' | 'android' {
  const userAgent = navigator.userAgent || navigator.vendor;
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  
  return 'web';
}

export function NotificationButton() {
  const { isSubscribed, isSupported, subscribe, unsubscribe } = useNotifications();
  
  if (!isSupported) {
    return null;
  }

  return (
    <Button
      onClick={isSubscribed ? unsubscribe : subscribe}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Bell className={`h-4 w-4 ${isSubscribed ? 'text-green-500' : ''}`} />
      {isSubscribed ? 'Notificări active' : 'Activează notificări'}
    </Button>
  );
}