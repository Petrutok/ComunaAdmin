'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function NotificationPermissionManager() {
  const [hasAskedPermission, setHasAskedPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkAndRequestPermission();
  }, []);

  const checkAndRequestPermission = async () => {
    try {
      // Check if we're in a browser that supports notifications
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
      }

      // Check if we're in a PWA or mobile app context
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true;
      
      // Check if permission has been asked before
      const permissionAsked = localStorage.getItem('notification_permission_asked');
      
      if (permissionAsked) {
        setHasAskedPermission(true);
        return;
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'default') {
        // This is the first time - request permission
        console.log('Requesting notification permission for the first time...');
        
        // Mark that we've asked for permission
        localStorage.setItem('notification_permission_asked', 'true');
        setHasAskedPermission(true);

        // Request permission using native dialog
        const permission = await Notification.requestPermission();
        
        console.log('Permission result:', permission);
        
        if (permission === 'granted') {
          // Permission granted - initialize push notifications
          await initializePushNotifications();
        } else if (permission === 'denied') {
          // Permission denied - store this in localStorage
          localStorage.setItem('notification_permission_denied', 'true');
        }
      } else {
        // Permission has already been set (granted or denied)
        setHasAskedPermission(true);
        
        if (currentPermission === 'granted') {
          // Check if we need to initialize push notifications
          const hasSubscription = localStorage.getItem('push_subscription');
          if (!hasSubscription) {
            await initializePushNotifications();
          }
        }
      }
    } catch (error) {
      console.error('Error checking/requesting permission:', error);
    }
  };

  const initializePushNotifications = async () => {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');

      // Check if push manager is available
      if (!registration.pushManager) {
        console.log('Push manager not available');
        return;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidKey) {
          console.error('VAPID key not found');
          return;
        }

        // Convert VAPID key
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('New subscription created:', subscription);
      }

      // Save subscription to server
      await saveSubscriptionToServer(subscription);
      
      // Save to localStorage for quick access
      localStorage.setItem('push_subscription', JSON.stringify(subscription.toJSON()));
      
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: getDevicePlatform(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      const result = await response.json();
      console.log('Subscription saved:', result);
      
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  };

  const getDevicePlatform = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'web';
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Don't render anything - this component just handles the logic
  return null;
}