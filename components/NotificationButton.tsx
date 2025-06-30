'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Verifică dacă avem deja un token salvat
      const savedToken = localStorage.getItem('fcm_token_saved');
      if (savedToken === 'true') {
        setTokenSaved(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Browser incompatibil",
        description: "Acest browser nu suportă notificări push.",
        variant: "destructive",
      });
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
          console.log('FCM Service Worker registered');
          
          // Obține FCM token
          const messaging = getMessaging();
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          
          const token = await getToken(messaging, {
            vapidKey: vapidKey || 'BM96R8cnKUeKqFaGKSJdKuNJ6mRkmyUmfCBH8kfVqK_Ht8Lx8wdKPzPTYpGxNwM8YL0RW1UoW_N1qFWJHBXDNEI',
            serviceWorkerRegistration: registration
          });

          if (token) {
            console.log('FCM Token:', token);
            
            // Salvează token în Firestore
            const deviceId = localStorage.getItem('device_id') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('device_id', deviceId);
            
            await setDoc(doc(db, 'fcm_tokens', deviceId), {
              token,
              createdAt: new Date(),
              lastUsed: new Date(),
              platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web',
              userAgent: navigator.userAgent,
              active: true
            });
            
            localStorage.setItem('fcm_token_saved', 'true');
            setTokenSaved(true);
            
            // Listen pentru mesaje în foreground
            onMessage(messaging, (payload) => {
              console.log('Mesaj primit:', payload);
              
              if (payload.notification) {
                // Afișează notificare custom sau toast
                toast({
                  title: payload.notification.title || 'Notificare nouă',
                  description: payload.notification.body,
                });
                
                // Sau notificare nativă
                if (document.visibilityState === 'visible') {
                  new Notification(payload.notification.title || 'Notificare nouă', {
                    body: payload.notification.body,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png'
                  });
                }
              }
            });
            
            // Notificare de succes
            toast({
              title: "Notificări activate!",
              description: "Vei primi notificări despre anunțuri și evenimente noi.",
            });
            
          } else {
            throw new Error('Nu s-a putut obține token FCM');
          }
        }
      } else if (result === 'denied') {
        toast({
          title: "Notificări blocate",
          description: "Pentru a activa notificările, accesează setările browserului.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Eroare la activarea notificărilor:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut activa notificările. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getButtonProps = () => {
    if (tokenSaved && permission === 'granted') {
      return {
        icon: <Bell className="h-5 w-5 text-green-400" />,
        text: 'Notificări active',
        color: 'bg-green-900/20',
      };
    } else if (permission === 'denied') {
      return {
        icon: <BellOff className="h-5 w-5 text-red-400" />,
        text: 'Notificări blocate',
        color: 'bg-red-900/20',
      };
    } else {
      return {
        icon: <Bell className="h-5 w-5 text-gray-400" />,
        text: 'Activează notificări',
        color: 'bg-slate-800/50',
      };
    }
  };

  const { icon, text, color } = getButtonProps();
  const isDisabled = (permission !== 'default' && tokenSaved) || loading;

  return (
    <button
      onClick={requestPermission}
      disabled={isDisabled}
      className={`relative p-2 rounded-lg ${color} hover:bg-slate-700/50 transition-colors group ${
        isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
      }`}
      title={text}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      
      {/* Indicator pentru status */}
      <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        tokenSaved && permission === 'granted' ? 'bg-green-400' : 
        permission === 'denied' ? 'bg-red-400' : 
        'bg-gray-600'
      }`} />
    </button>
  );
}