'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// console.log('🔴 NotificationProvider FILE LOADED');

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
    // IMPORTANT: Așteaptă mai mult pentru iOS și verifică dacă documentul e ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeNotifications, 2500); // Mărit la 2.5 secunde pentru iOS
      });
    } else {
      // Document deja încărcat
      setTimeout(initializeNotifications, 2500); // Mărit la 2.5 secunde pentru iOS
    }
  }, []);

  const detectPlatform = (): 'web' | 'ios' | 'android' => {
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'ios';
    }
    
    return 'web';
  };

  // Funcție nouă pentru a aștepta Service Worker să devină activ
  const waitForServiceWorker = async (timeout = 10000): Promise<ServiceWorkerRegistration | null> => {
    console.log('[NotificationProvider] Waiting for Service Worker...');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Verifică dacă există deja
        let registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
          console.log('[NotificationProvider] Registering new SW...');
          try {
            registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none'
            });
            console.log('[NotificationProvider] SW registered successfully');
          } catch (regError) {
            console.error('[NotificationProvider] Failed to register SW:', regError);
            return null;
          }
        }

        // Unregister old waiting SWs to avoid conflicts
        if (registration?.waiting) {
          console.log('[NotificationProvider] SW is waiting, unregistering old version...');
          // Don't send skipWaiting - instead just wait for it to become active
        }

        // Wait for installation to complete
        if (registration?.installing) {
          console.log('[NotificationProvider] SW is installing, waiting for activation...');
          await new Promise<void>(resolve => {
            const installer = registration?.installing;
            if (installer) {
              const onStateChange = function(this: ServiceWorker) {
                console.log('[NotificationProvider] SW state changed to:', this.state);
                if (this.state === 'activated') {
                  installer.removeEventListener('statechange', onStateChange);
                  resolve();
                }
              };
              installer.addEventListener('statechange', onStateChange);
            } else {
              resolve();
            }
            // Timeout after 5 seconds
            setTimeout(() => resolve(), 5000);
          });
        }

        // Get fresh registration
        registration = await navigator.serviceWorker.getRegistration();

        if (registration?.active) {
          console.log('[NotificationProvider] SW is active! State:', registration.active.state);
          try {
            await navigator.serviceWorker.ready;
            console.log('[NotificationProvider] navigator.serviceWorker.ready confirmed');
            return registration;
          } catch (readyError) {
            console.error('[NotificationProvider] Error waiting for ready:', readyError);
          }
        } else {
          console.log('[NotificationProvider] SW not active yet, retrying...');
          if (registration?.controller) {
            console.log('[NotificationProvider] But controller exists, might be okay');
            return registration;
          }
        }

        // Așteaptă puțin înainte de următoarea încercare
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error('[NotificationProvider] SW registration error:', error);
        // Don't return null, keep retrying
      }
    }

    console.error('[NotificationProvider] SW registration timeout after', timeout, 'ms');
    return null;
  };

  const initializeNotifications = async () => {
    console.log('[NotificationProvider] Starting initialization...');
    console.log('[NotificationProvider] User Agent:', navigator.userAgent);
    console.log('[NotificationProvider] Is iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));
    console.log('[NotificationProvider] PWA mode:', window.matchMedia('(display-mode: standalone)').matches);
    
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
      // IMPORTANT: Folosește funcția de wait pentru SW
      const registration = await waitForServiceWorker();
      
      if (!registration) {
        console.error('[NotificationProvider] Failed to register SW');
        toast({
          title: "⚠️ Eroare tehnică",
          description: "Nu s-a putut inițializa sistemul de notificări. Reîncarcă pagina.",
          variant: "destructive",
          duration: 6000,
        });
        return;
      }

      // Verifică statusul permisiunii
      const currentPermission = Notification.permission;
      console.log('[NotificationProvider] Current permission:', currentPermission);

      // Verifică dacă există deja o subscripție
      const existingSubscription = registration ? await registration.pushManager.getSubscription() : null;
      console.log('[NotificationProvider] Existing subscription:', !!existingSubscription);
      
      if (existingSubscription) {
        console.log('[NotificationProvider] Found existing subscription');
        setIsSubscribed(true);
        return;
      }

      // Verifică dacă e iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      let hasAskedBefore = localStorage.getItem('notification_permission_asked');
      
      console.log('[NotificationProvider] Decision tree:', {
        isIOS,
        isPWA,
        currentPermission,
        hasAskedBefore,
        shouldShowDialog: currentPermission === 'default' && !hasAskedBefore
      });

      // Pentru iOS PWA, resetează flag-urile dacă e reinstalat
      if (isIOS && isPWA && currentPermission === 'default' && hasAskedBefore) {
        console.log('[NotificationProvider] iOS PWA reinstalled, resetting flags...');
        localStorage.removeItem('notification_permission_asked');
        localStorage.removeItem('notification_permission_denied');
        hasAskedBefore = null;
      }

      // Logică pentru afișare dialog/request
      if (currentPermission === 'default' && !hasAskedBefore) {
        console.log('[NotificationProvider] First time - will show dialog');
        
        if (isIOS && isPWA) {
          // iOS în PWA mode - arată dialog custom
          console.log('[NotificationProvider] iOS PWA - showing custom dialog');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // IMPORTANT: Arată și toast-ul pentru iOS
          toast({
            title: "🔔 Activează notificările",
            description: "Permite notificările pentru a fi la curent cu evenimentele importante",
            duration: 6000,
            className: "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0",
          });
          
          setShowPermissionDialog(true);
          
        } else if (isIOS && !isPWA) {
          // iOS în Safari - nu poate folosi notificări
          console.log('[NotificationProvider] iOS Safari - notifications not supported');
          toast({
            title: "📱 Instalează aplicația",
            description: "Pentru notificări, adaugă aplicația pe ecranul principal: Share → Add to Home Screen",
            duration: 8000,
          });
        } else {
          // Android/Desktop - request direct
          console.log('[NotificationProvider] Non-iOS - requesting permission directly');
          localStorage.setItem('notification_permission_asked', 'true');
          
          // Toast informativ
          toast({
            title: "🔔 Permite notificările?",
            description: "Fii primul care află despre evenimente importante",
            duration: 4000,
            className: "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0",
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Solicită permisiunea
          const permission = await Notification.requestPermission();
          console.log('[NotificationProvider] Permission result:', permission);
          
          if (permission === 'granted') {
            await subscribeToNotifications();
            
            toast({
              title: "🎉 Excelent!",
              description: "Notificările sunt acum active!",
              duration: 5000,
              className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0",
            });
          } else if (permission === 'denied') {
            localStorage.setItem('notification_permission_denied', 'true');
            
            toast({
              title: "😔 Notificări dezactivate",
              description: "Poți activa notificările mai târziu din setări",
              variant: "destructive",
              duration: 8000,
            });
          }
        }
      } else if (currentPermission === 'granted' && !existingSubscription) {
        // Are permisiune dar nu subscripție
        console.log('[NotificationProvider] Has permission but no subscription - creating one');
        await subscribeToNotifications();
        
        toast({
          title: "🔔 Notificări reactivate",
          description: "Subscripția ta a fost restaurată",
          duration: 4000,
        });
      } else {
        console.log('[NotificationProvider] No action needed');
      }
      
    } catch (error) {
      console.error('[NotificationProvider] Initialization error:', error);
      toast({
        title: "⚠️ Eroare",
        description: "Nu s-au putut inițializa notificările. Încearcă din nou mai târziu.",
        variant: "destructive",
        duration: 5000,
      });
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
        
        // Toast succes modern
        toast({
          title: "🎉 Excelent!",
          description: (
            <div className="space-y-2">
              <p className="font-medium">Notificările sunt acum active!</p>
              <p className="text-xs opacity-90">Vei primi prima notificare în curând...</p>
            </div>
          ),
          duration: 5000,
          className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0",
        });
      } else if (permission === 'denied') {
        localStorage.setItem('notification_permission_denied', 'true');
        
        // Toast refuz modern
        toast({
          title: "😔 Notificări dezactivate",
          description: (
            <div className="space-y-2">
              <p>Nu vei primi notificări despre evenimente importante.</p>
              <p className="text-xs opacity-80">
                Pentru a le activa mai târziu: 
                <span className="block mt-1 font-mono text-xs">
                  Setări → Notificări → Comuna
                </span>
              </p>
            </div>
          ),
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('[NotificationProvider] Error requesting permission:', error);
      setShowPermissionDialog(false);
      
      toast({
        title: "⚠️ Eroare",
        description: "Nu am putut activa notificările. Te rugăm să încerci din nou.",
        variant: "destructive",
      });
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    try {
      if (!base64String || base64String.length === 0) {
        throw new Error('VAPID key is empty');
      }

      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      console.log('[NotificationProvider] Converting base64 VAPID key, length:', base64String.length);

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      console.log('[NotificationProvider] Uint8Array created, length:', outputArray.length);
      return outputArray;
    } catch (error) {
      console.error('[NotificationProvider] Error converting VAPID key:', error);
      throw error;
    }
  };

  const subscribeToNotifications = async () => {
    try {
      console.log('[NotificationProvider] Starting subscription...');

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log('[NotificationProvider] VAPID Key available:', !!vapidKey);

      if (!vapidKey) {
        throw new Error('VAPID public key is not configured');
      }

      const registration = await navigator.serviceWorker.ready;

      console.log('[NotificationProvider] Converting VAPID key...');
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      console.log('[NotificationProvider] VAPID key converted, length:', applicationServerKey.length);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[NotificationProvider] Push subscription created:', subscription);

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: detectPlatform(),
      };

      // IMPORTANT: Convert subscription to JSON before sending
      const subscriptionJSON = subscription.toJSON();
      console.log('[NotificationProvider] Subscription JSON:', subscriptionJSON);

      // Logged-in citizens get the subscription linked to their account
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          subscription: subscriptionJSON,  // <-- Send the JSON version
          deviceInfo: deviceInfo
        }),
      });

      const result = await response.json();
      console.log('[NotificationProvider] Server response:', result);

      if (response.ok) {
        setIsSubscribed(true);
        console.log('[NotificationProvider] Successfully subscribed');
        
        // Salvează în localStorage
        localStorage.setItem('push_subscription', JSON.stringify(subscriptionJSON));
        
        // Notificare de bun venit
        try {
          if ('showNotification' in registration) {
            await registration.showNotification('Notificări activate! 🎉', {
              body: 'Bine ai venit! Vei primi notificări despre evenimente importante din comună.',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'welcome',
              requireInteraction: false,
              data: {
                url: '/',
                type: 'welcome'
              }
            });
          }
        } catch (notifError) {
          console.log('[NotificationProvider] Could not show welcome notification:', notifError);
        }
      } else {
        console.error('[NotificationProvider] Server error:', result);
        throw new Error(result.error || 'Failed to save subscription');
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
      
      {/* Dialog pentru iOS - Modern Design */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/50 max-w-sm overflow-hidden p-0">
          {/* Header cu gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-0.5">
            <div className="bg-slate-800 rounded-t-lg p-4">
              <div className="relative">
                {/* Animated bell icon */}
                <div className="mx-auto mb-3 h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                  <Bell className="h-7 w-7 text-white relative z-10" />
                  <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping"></div>
                  <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full"></div>
                </div>
                
                <DialogTitle className="text-lg font-bold text-white text-center mb-1">
                  Activează notificările 🔔
                </DialogTitle>
                <DialogDescription className="text-center text-gray-300 text-sm">
                  Fii mereu la curent cu noutățile din comună
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-2">
            <Button
              onClick={handlePermissionRequest}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 text-sm shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Bell className="mr-2 h-4 w-4" />
              Activează notificările
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowPermissionDialog(false);
                localStorage.setItem('notification_permission_asked', 'true');
              }}
              className="w-full text-gray-400 hover:text-white hover:bg-slate-700/50 text-sm py-2"
            >
              Mai târziu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </NotificationContext.Provider>
  );
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