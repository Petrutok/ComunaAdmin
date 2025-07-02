'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NotificationManager } from '@/lib/notification-manager';

export function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  const subscribe = async () => {
    setLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Save subscription to server
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        })
      });

      if (response.ok) {
        // Store subscription locally
        await NotificationManager.addSubscription(subscription);
        
        setIsSubscribed(true);
        toast({
          title: "Notificări activate!",
          description: "Vei primi notificări despre evenimente importante.",
        });
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut activa notificările.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/push-subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
        
        setIsSubscribed(false);
        toast({
          title: "Notificări dezactivate",
          description: "Nu vei mai primi notificări.",
        });
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut dezactiva notificările.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`relative p-2 rounded-lg transition-colors group ${
        isSubscribed 
          ? 'bg-green-900/20 hover:bg-green-800/30' 
          : 'bg-slate-800/50 hover:bg-slate-700/50'
      }`}
      title={isSubscribed ? 'Notificări active' : 'Activează notificări'}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-5 w-5 text-green-400" />
      ) : (
        <Bell className="h-5 w-5 text-gray-400" />
      )}
      
      <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        isSubscribed ? 'bg-green-400' : 'bg-gray-600'
      }`} />
    </button>
  );
}