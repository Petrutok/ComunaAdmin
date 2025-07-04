'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugMobilePage() {
  const [logs, setLogs] = useState<string[]>([]);
  
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
    
    // Platform
    const ua = navigator.userAgent;
    log(`User Agent: ${ua}`);
    log(`Platform: ${navigator.platform}`);
    
    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const iosVersion = isIOS ? ua.match(/OS (\d+)_/)?.[1] : null;
    log(`iOS: ${isIOS} ${iosVersion ? `(version ${iosVersion})` : ''}`);
    
    // PWA Detection
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    log(`PWA Mode: ${isPWA}`);
    
    // Service Worker
    if ('serviceWorker' in navigator) {
      log('Service Worker: Supported');
      const reg = await navigator.serviceWorker.getRegistration();
      log(`SW Registration: ${reg ? 'YES' : 'NO'}`);
      if (reg) {
        log(`SW Scope: ${reg.scope}`);
        log(`SW Active: ${reg.active ? 'YES' : 'NO'}`);
      }
    } else {
      log('Service Worker: NOT supported');
    }
    
    // Push API
    if ('PushManager' in window) {
      log('Push API: Supported');
    } else {
      log('Push API: NOT supported');
    }
    
    // Notification API
    if ('Notification' in window) {
      log('Notification API: Supported');
      log(`Permission: ${Notification.permission}`);
    } else {
      log('Notification API: NOT supported');
    }
    
    // HTTPS
    log(`Protocol: ${location.protocol}`);
    log(`Secure Context: ${window.isSecureContext}`);
  };

  const testServiceWorker = async () => {
    log('=== SERVICE WORKER TEST ===');
    
    try {
      // Unregister old SW
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        log('Unregistered old SW');
      }
      
      // Register new SW
      log('Registering SW...');
      const reg = await navigator.serviceWorker.register('/sw-unified.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      log('SW registered successfully');
      log(`Installing: ${reg.installing ? 'YES' : 'NO'}`);
      log(`Waiting: ${reg.waiting ? 'YES' : 'NO'}`);
      log(`Active: ${reg.active ? 'YES' : 'NO'}`);
      
      // Wait for activation
      await navigator.serviceWorker.ready;
      log('SW is ready!');
      
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
        // Test local notification
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
      const reg = await navigator.serviceWorker.ready;
      log('SW ready, getting subscription...');
      
      // Check existing
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        log('Found existing subscription');
        log(`Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        await sub.unsubscribe();
        log('Unsubscribed from old subscription');
      }
      
      // Create new
      log('Creating new subscription...');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        log('ERROR: No VAPID key found!');
        return;
      }
      
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      
      log('Subscription successful!');
      log(`Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      
      // Save locally
      localStorage.setItem('debug_subscription', JSON.stringify(sub));
      log('Saved to localStorage');
      
    } catch (error: any) {
      log(`Subscription Error: ${error.message}`);
      log(`Error stack: ${error.stack}`);
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

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Mobile Debug</CardTitle>
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