'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Așteaptă puțin pentru ca aplicația să se încarce complet
    const timer = setTimeout(() => {
      initializeNotifications();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const initializeNotifications = async () => {
    console.log('[NotificationProvider] Starting initialization...');
    
    // Verifică suportul pentru notificări
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window;
    
    setIsSupported(supported);
    
    if (!supported) {
      console.log('[NotificationProvider] Not supported on this device');
      return;
    }

    try {
      // Înregistrează service worker-ul
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[NotificationProvider] Service Worker registered');
        await navigator.serviceWorker.ready;
      }

      // Verifică statusul permisiunii
      const currentPermission = Notification.permission;
      console.log('[NotificationProvider] Current permission:', currentPermission);

      // Verifică dacă există deja o subscripție
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('[NotificationProvider] Found existing subscription');
        setIsSubscribed(true);
        return;
      }

      // Verifică dacă e iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const hasAskedBefore = localStorage.getItem('notification_permission_asked');
      
      // Pentru iOS PWA, resetează flag-urile la reinstalare
      if (isIOS && currentPermission === 'default' && hasAskedBefore) {
        console.log('[NotificationProvider] iOS PWA reinstalled, resetting flags...');
        localStorage.removeItem('notification_permission_asked');
        localStorage.removeItem('notification_permission_denied');
      }

      // Dacă permisiunea este 'default' și nu am întrebat niciodată
      if (currentPermission === 'default' && !localStorage.getItem('notification_permission_asked')) {
        console.log('[NotificationProvider] First time - will show dialog');
        
        // Pentru iOS, afișează dialog-ul care necesită interacțiune
        if (isIOS) {
          // Așteaptă 2 secunde înainte de a afișa dialogul
          await new Promise(resolve => setTimeout(resolve, 2000));
          setShowPermissionDialog(true);
        } else {
          // Pentru Android/Desktop, putem cere direct
          localStorage.setItem('notification_permission_asked', 'true');
          
          // Afișează toast
          toast({
            title: "Fii la curent cu noutățile! 🔔",
            description: "Activează notificările pentru evenimente importante",
            duration: 3000,
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Solicită permisiunea direct
          const permission = await Notification.requestPermission();
          console.log('[NotificationProvider] Permission result:', permission);
          
          if (permission === 'granted') {
            await subscribeToNotifications();
            toast({
              title: "Perfect! ✅",
              description: "Notificările sunt acum active",
              duration: 3000,
            });
          }
        }
      } else if (currentPermission === 'granted' && !existingSubscription) {
        // Avem permisiune dar nu subscripție
        console.log('[NotificationProvider] Has permission but no subscription');
        await subscribeToNotifications();
      }
    } catch (error) {
      console.error('[NotificationProvider] Initialization error:', error);
    }
  };

  const handlePermissionRequest = async () => {
    console.log('[NotificationProvider] User clicked to enable notifications');
    
    // Marchează că am întrebat
    localStorage.setItem('notification_permission_asked', 'true');
    
    try {
      // Solicită permisiunea (acum e ca rezultat al click-ului)
      const permission = await Notification.requestPermission();
      console.log('[NotificationProvider] Permission result:', permission);
      
      setShowPermissionDialog(false);
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast({
          title: "Perfect! ✅",
          description: "Notificările sunt acum active",
          duration: 3000,
        });
      } else if (permission === 'denied') {
        localStorage.setItem('notification_permission_denied', 'true');
        toast({
          title: "Notificări dezactivate",
          description: "Poți activa notificările mai târziu din setări",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[NotificationProvider] Error requesting permission:', error);
      setShowPermissionDialog(false);
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
      console.log('[NotificationProvider] Starting subscription...');
      
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      });

      console.log('[NotificationProvider] Push subscription created');

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
        console.log('[NotificationProvider] Successfully subscribed');
        
        // Salvează în localStorage
        localStorage.setItem('push_subscription', JSON.stringify(subscription.toJSON()));
        
        // Notificare de bun venit
        try {
          if ('showNotification' in registration) {
            await registration.showNotification('Notificări activate! 🎉', {
              body: 'Vei primi notificări despre evenimente importante.',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'welcome',
              requireInteraction: false
            });
          }
        } catch (notifError) {
          console.log('[NotificationProvider] Could not show welcome notification:', notifError);
        }
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('[NotificationProvider] Subscribe error:', error);
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
      console.error('[NotificationProvider] Error subscribing:', error);
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
      console.error('[NotificationProvider] Error unsubscribing:', error);
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
      
      {/* Dialog pentru iOS */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bell className="h-8 w-8 text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-white text-center">
              Activează notificările 🔔
            </DialogTitle>
            <DialogDescription className="text-center text-gray-300 space-y-3">
              <p>
                Primește notificări instant despre:
              </p>
              <ul className="text-sm space-y-2 text-left max-w-xs mx-auto">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Evenimente importante din comună
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Anunțuri și oportunități noi
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Alerte și situații urgente
                </li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPermissionDialog(false);
                localStorage.setItem('notification_permission_asked', 'true');
              }}
              className="flex-1"
            >
              Mai târziu
            </Button>
            <Button
              onClick={handlePermissionRequest}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              Activează
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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