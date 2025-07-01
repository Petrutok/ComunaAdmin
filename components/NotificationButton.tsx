'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const { toast } = useToast();

  // Generate a stable device fingerprint
  const getDeviceFingerprint = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenResolution = `${screen.width}x${screen.height}`;
    const language = navigator.language;
    
    // Create a simple hash
    const str = `${userAgent}-${platform}-${screenResolution}-${language}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `device_${Math.abs(hash)}_${Date.now().toString(36)}`;
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Check if we have a saved token
      const savedToken = localStorage.getItem('fcm_token');
      if (savedToken) {
        setTokenSaved(true);
        console.log('FCM Token exists in localStorage');
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
        // Register Service Worker for FCM
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('FCM Service Worker registered');
          
          // Get FCM token
          const messaging = getMessaging();
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BM96R8cnKUeKqFaGKSJdKuNJ6mRkmyUmfCBH8kfVqK_Ht8Lx8wdKPzPTYpGxNwM8YL0RW1UoW_N1qFWJHBXDNEI';
          
          const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
          });

          if (token) {
            console.log('FCM Token obtained:', token);
            
            // Save token in localStorage
            localStorage.setItem('fcm_token', token);
            localStorage.setItem('fcm_token_date', new Date().toISOString());
            setTokenSaved(true);
            
            // Clean up old tokens and save new one
            try {
              // Get device fingerprint
              const deviceFingerprint = getDeviceFingerprint();
              const storedDeviceId = localStorage.getItem('device_id');
              const deviceId = storedDeviceId || deviceFingerprint;
              
              if (!storedDeviceId) {
                localStorage.setItem('device_id', deviceId);
              }
              
              // Deactivate ALL other tokens for this user agent pattern
              const userAgentPattern = navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Chrome';
              const oldTokensQuery = query(
                collection(db, 'fcm_tokens'),
                where('active', '==', true)
              );
              
              const oldTokensSnapshot = await getDocs(oldTokensQuery);
              const deactivatePromises: Promise<any>[] = [];
              
              for (const docSnapshot of oldTokensSnapshot.docs) {
                const data = docSnapshot.data();
                // Deactivate if it's the same token OR same device type
                if (data.token === token || 
                    (data.userAgent && data.userAgent.includes(userAgentPattern))) {
                  deactivatePromises.push(
                    updateDoc(docSnapshot.ref, { 
                      active: false, 
                      deactivatedAt: new Date(),
                      reason: 'new_token_registered'
                    })
                  );
                }
              }
              
              await Promise.all(deactivatePromises);
              console.log(`Deactivated ${deactivatePromises.length} old tokens`);
              
              // Save the new token
              await setDoc(doc(db, 'fcm_tokens', deviceId), {
                token,
                createdAt: new Date(),
                lastUsed: new Date(),
                platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web',
                userAgent: navigator.userAgent,
                deviceFingerprint: deviceFingerprint,
                active: true
              });
              
              console.log('New token saved to Firestore with ID:', deviceId);
              
            } catch (error) {
              console.error('Error managing tokens in Firestore:', error);
            }
            
            // Listen for foreground messages
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground:', payload);
              
              if (payload.notification) {
                // Show only toast, no native notification
                // The service worker handles the native notification
                toast({
                  title: payload.notification.title || 'Notificare nouă',
                  description: payload.notification.body,
                });
              }
            });
            
            // Success notification
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
      console.error('Error activating notifications:', error);
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
      
      {/* Status indicator */}
      <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        tokenSaved && permission === 'granted' ? 'bg-green-400' : 
        permission === 'denied' ? 'bg-red-400' : 
        'bg-gray-600'
      }`} />
    </button>
  );
}