'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugMobilePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`[Debug] ${message}`);
  };

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    log('=== ENVIRONMENT CHECK ===');

    const ua = navigator.userAgent;
    log(`User Agent: ${ua}`);
    log(`Platform: ${navigator.platform}`);

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const iosVersion = isIOS ? ua.match(/OS (\d+)_/)?.[1] : null;
    log(`iOS: ${isIOS} ${iosVersion ? `(version ${iosVersion})` : ''}`);

    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    log(`PWA Mode: ${isPWA}`);

    if ('serviceWorker' in navigator) {
      log('Service Worker: Supported');
      const reg = await navigator.serviceWorker.getRegistration();
      log(`SW Registration: ${reg ? 'YES' : 'NO'}`);
      if (reg) {
        log(`SW Scope: ${reg.scope}`);
        log(`SW Active: ${reg.active ? 'YES' : 'NO'}`);
        swRegistrationRef.current = reg;
      }
    } else {
      log('Service Worker: NOT supported');
    }

    if ('PushManager' in window) {
      log('Push API: Supported');
    } else {
      log('Push API: NOT supported');
    }

    if ('Notification' in window) {
      log('Notification API: Supported');
      log(`Permission: ${Notification.permission}`);
    } else {
      log('Notification API: NOT supported');
    }

    log(`Protocol: ${location.protocol}`);
    log(`Secure Context: ${window.isSecureContext}`);
  };

  const testServiceWorker = async () => {
    log('=== SERVICE WORKER TEST ===');

    try {
      // Unregister all existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        log('Unregistered old SW');
      }

      log('Registering SW...');
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      log('SW registered successfully');
      log(`Installing: ${reg.installing ? 'YES' : 'NO'}`);
      log(`Waiting: ${reg.waiting ? 'YES' : 'NO'}`);
      log(`Active: ${reg.active ? 'YES' : 'NO'}`);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      log('SW is ready!');
      
      // Store the registration
      swRegistrationRef.current = reg;
      
      // Wait a bit more for iOS
      await new Promise(resolve => setTimeout(resolve, 1000));
      log('SW fully initialized');
      
    } catch (error: any) {
      log(`SW Error: ${error.message}`);
    }
  };

  const testPermission = async () => {
    log('=== PERMISSION TEST ===');

    try {
      log('Requesting permission...');
      const result = await Notification.requestPermission();
      log(`Permission result: ${result}`);

      if (result === 'granted') {
        new Notification('Test Local', {
          body: 'This is a local notification',
          icon: '/icon-192x192.png'
        });
        log('Local notification sent');
      }
    } catch (error: any) {
      log(`Permission Error: ${error.message}`);
    }
  };

  const testSubscription = async () => {
    log('=== SUBSCRIPTION TEST ===');

    try {
      // Check if we have a SW registration
      let reg = swRegistrationRef.current || await navigator.serviceWorker.getRegistration();
      
      if (!reg) {
        log('No SW registration found, registering...');
        await testServiceWorker();
        reg = swRegistrationRef.current || undefined;
      }

      if (!reg) {
        throw new Error('Failed to get SW registration');
      }

      log('Using SW registration...');
      
      // Wait for SW to be ready
      await navigator.serviceWorker.ready;
      log('SW ready, checking for existing subscription...');

      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        log('Found existing subscription');
        log(`Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        await sub.unsubscribe();
        log('Unsubscribed from old subscription');
      }

      log('Creating new subscription...');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        log('ERROR: No VAPID key found!');
        return;
      }

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      log('VAPID key converted');

      // Subscribe with explicit options
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      log('Subscription successful!');
      log(`Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      log(`Keys: ${JSON.stringify({
        p256dh: sub.getKey('p256dh') ? 'present' : 'missing',
        auth: sub.getKey('auth') ? 'present' : 'missing'
      })}`);

      // Save subscription
      localStorage.setItem('debug_subscription', JSON.stringify(sub.toJSON()));
      log('Saved to localStorage');
      
    } catch (error: any) {
      log(`Subscription Error: ${error.message}`);
      log(`Error name: ${error.name}`);
      log(`Error stack: ${error.stack}`);
      
      // iOS specific debugging
      if (error.message.includes('service worker')) {
        log('iOS SW issue detected - trying workaround...');
        
        // Try to get the registration again
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) {
          log('SW is active, retrying subscription...');
          // Retry after a delay
          setTimeout(() => testSubscription(), 2000);
        }
      }
    }
  };

  const testPushNotification = async () => {
    log('=== PUSH TEST ===');

    try {
      const subStr = localStorage.getItem('debug_subscription');
      if (!subStr) {
        log('ERROR: No subscription in localStorage');
        return;
      }

      const sub = JSON.parse(subStr);
      log('Sending push notification...');

      const response = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Push',
          message: `Test at ${new Date().toLocaleTimeString()}`,
          url: '/',
          subscriptionsList: [sub]
        })
      });

      const result = await response.json();
      log(`Response: ${JSON.stringify(result)}`);

      if (result.success) {
        log('Push sent successfully! Check for notification...');
      } else {
        log(`Push failed: ${result.error}`);
      }
    } catch (error: any) {
      log(`Push Error: ${error.message}`);
    }
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

  const clearLogs = () => {
    setLogs([]);
  };

  const testIOSWorkaround = async () => {
    log('=== iOS WORKAROUND TEST ===');
    
    try {
      // Step 1: Ensure SW is registered and active
      log('Step 1: Checking SW...');
      let reg = await navigator.serviceWorker.getRegistration();
      
      if (!reg) {
        log('No registration, creating new one...');
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      
      // Step 2: Wait for activation
      log('Step 2: Waiting for activation...');
      await navigator.serviceWorker.ready;
      
      // Step 3: Force update
      log('Step 3: Forcing update...');
      await reg.update();
      
      // Step 4: Wait a bit
      log('Step 4: Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 5: Try subscription
      log('Step 5: Attempting subscription...');
      await testSubscription();
      
    } catch (error: any) {
      log(`Workaround failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Mobile Debug - iOS Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={checkEnvironment} size="sm">
              Check Environment
            </Button>
            <Button onClick={testServiceWorker} size="sm">
              Test Service Worker
            </Button>
            <Button onClick={testPermission} size="sm">
              Test Permission
            </Button>
            <Button onClick={testSubscription} size="sm">
              Test Subscription
            </Button>
            <Button onClick={testPushNotification} size="sm">
              Test Push
            </Button>
            <Button onClick={testIOSWorkaround} size="sm" variant="secondary">
              iOS Workaround
            </Button>
            <Button onClick={clearLogs} variant="destructive" size="sm">
              Clear Logs
            </Button>
          </div>
          <div className="bg-slate-900 rounded p-3 h-96 overflow-y-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
              {logs.length === 0 ? 'No logs yet...' : logs.join('\n')}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}