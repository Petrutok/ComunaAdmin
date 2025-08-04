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
          
          // Afișează toast informativ modern
          toast({
            title: "🔔 Permite notificările?",
            description: "Fii primul care află despre evenimente și informații importante din comună",
            duration: 4000,
            className: "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0",
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Solicită permisiunea direct
          const permission = await Notification.requestPermission();
          console.log('[NotificationProvider] Permission result:', permission);
          
          if (permission === 'granted') {
            await subscribeToNotifications();
            
            // Toast succes modern
            toast({
              title: "🎉 Excelent!",
              description: (
                <div className="space-y-2">
                  <p className="font-medium">Notificările sunt acum active!</p>
                  <p className="text-xs text-gray-400">Vei primi prima notificare în curând...</p>
                </div>
              ),
              duration: 5000,
              className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0",
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
                    Pentru a le activa mai târziu, accesează setările browserului.
                  </p>
                </div>
              ),
              variant: "destructive",
              duration: 8000,
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
        
        // Toast succes modern
        toast({
          title: "🎉 Excelent!",
          description: (
            <div className="space-y-2">
              <p className="font-medium">Notificările sunt acum active!</p>
              <p className="text-xs text-gray-400">Vei primi prima notificare în curând...</p>
            </div>
          ),
          duration: 5000,
          className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0",
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
        
        // Notificare de bun venit spectaculoasă
        try {
          if ('showNotification' in registration) {
            // Prima notificare - de bun venit
            await registration.showNotification('🎉 Bine ai venit în Comuna digitală!', {
              body: 'Notificările sunt acum active. Vei fi primul care află despre evenimente importante!',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'welcome',
              requireInteraction: false,
              data: {
                url: '/',
                type: 'welcome'
              }
            });
            
            // A doua notificare după 3 secunde - exemplu
            setTimeout(() => {
              registration.showNotification('📱 Exemplu de notificare', {
                body: 'Așa vei primi informații despre evenimente, anunțuri noi și alerte importante.',
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'example',
                requireInteraction: false
              });
            }, 3000);
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
      
      {/* Dialog pentru iOS - Modern Design */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/50 max-w-md overflow-hidden p-0">
          {/* Header cu gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1">
            <div className="bg-slate-800 rounded-t-lg p-6 pb-4">
              <div className="relative">
                {/* Animated bell icon */}
                <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                  <Bell className="h-10 w-10 text-white relative z-10 animate-bounce" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></div>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
                </div>
                
                <DialogTitle className="text-2xl font-bold text-white text-center mb-2">
                  Nu rata nicio informație importantă!
                </DialogTitle>
                <DialogDescription className="text-center text-gray-300">
                  Activează notificările pentru a fi mereu la curent
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {[
                { icon: '📢', title: 'Evenimente și anunțuri', desc: 'Află primul despre activitățile din comună' },
                { icon: '💼', title: 'Locuri de muncă', desc: 'Oportunități noi de angajare în zona ta' },
                { icon: '🚨', title: 'Urgențe și alerte', desc: 'Informații critice în timp real' },
                { icon: '♻️', title: 'Colectare deșeuri', desc: 'Reminder-uri pentru zilele de colectare' }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50 backdrop-blur-sm hover:bg-slate-700/70 transition-all duration-200"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>
              <span>Notificări importante, fără spam</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 space-y-3">
            <Button
              onClick={handlePermissionRequest}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Bell className="mr-2 h-5 w-5" />
              Activează notificările
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowPermissionDialog(false);
                localStorage.setItem('notification_permission_asked', 'true');
              }}
              className="w-full text-gray-400 hover:text-white hover:bg-slate-700/50"
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