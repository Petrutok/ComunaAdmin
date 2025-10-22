'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugNotificationsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [vapidKey, setVapidKey] = useState<string>('');

  useEffect(() => {
    addLog('Page loaded');
    checkVapidKey();
    checkServiceWorker();
    checkNotificationSupport();
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(`[DEBUG] ${message}`);
  };

  const checkVapidKey = () => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    addLog(`VAPID Key exists: ${!!key}`);
    if (key) {
      addLog(`VAPID Key length: ${key.length}`);
      addLog(`VAPID Key first 20 chars: ${key.substring(0, 20)}...`);
      setVapidKey(key);
    } else {
      addLog('ERROR: VAPID_PUBLIC_KEY not set!');
    }
  };

  const checkServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        addLog('ERROR: Service Workers not supported');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        addLog(`✓ Service Worker registered (state: ${registration.active?.state || 'unknown'})`);
      } else {
        addLog('Service Worker not yet registered');
      }
    } catch (error) {
      addLog(`ERROR checking SW: ${error}`);
    }
  };

  const checkNotificationSupport = () => {
    const hasNotification = 'Notification' in window;
    const hasPushManager = 'PushManager' in window;
    const hasSW = 'serviceWorker' in navigator;

    addLog(`Notification API: ${hasNotification ? '✓' : '✗'}`);
    addLog(`PushManager: ${hasPushManager ? '✓' : '✗'}`);
    addLog(`Service Worker: ${hasSW ? '✓' : '✗'}`);
  };

  const testVapidConversion = () => {
    try {
      addLog('Testing VAPID key conversion...');

      if (!vapidKey) {
        addLog('ERROR: VAPID key not loaded');
        return;
      }

      // Test base64url to Uint8Array conversion
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
      const base64 = (vapidKey + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      addLog(`Padding added: ${padding.length} chars`);
      addLog(`Base64 length: ${base64.length}`);

      const rawData = window.atob(base64);
      addLog(`Decoded raw data length: ${rawData.length}`);

      const uint8Array = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        uint8Array[i] = rawData.charCodeAt(i);
      }

      addLog(`✓ Uint8Array created: length ${uint8Array.length}`);
    } catch (error) {
      addLog(`ERROR in VAPID conversion: ${error}`);
    }
  };

  const testSubscribe = async () => {
    try {
      addLog('Testing push subscription...');

      if (!('Notification' in window)) {
        addLog('ERROR: Notifications not supported');
        return;
      }

      const permission = Notification.permission;
      addLog(`Current notification permission: ${permission}`);

      if (permission !== 'granted') {
        addLog('Requesting notification permission...');
        const result = await Notification.requestPermission();
        addLog(`Permission result: ${result}`);

        if (result !== 'granted') {
          addLog('User denied permission');
          return;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      addLog('Service Worker ready');

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        addLog('ERROR: VAPID key not available');
        return;
      }

      // Convert VAPID key
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
      const base64 = (vapidKey + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      addLog(`Subscribing to push with VAPID key (${applicationServerKey.length} bytes)...`);

      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        addLog(`✓ Subscription successful!`);
        addLog(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`);

        // Try to save subscription
        addLog('Saving subscription to server...');
        const response = await fetch('/api/push/subscribe/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: 'web'
            }
          }),
        });

        addLog(`Server response: ${response.status} ${response.statusText}`);
        const result = await response.json();
        addLog(`Server result: ${JSON.stringify(result)}`);
      } catch (subscriptionError) {
        addLog(`ERROR in pushManager.subscribe: ${subscriptionError}`);
      }
    } catch (error) {
      addLog(`ERROR in testSubscribe: ${error}`);
    }
  };

  const testApiEndpoint = async () => {
    try {
      addLog('Testing /api/push-send/ endpoint...');

      const response = await fetch('/api/push-send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionsList: [],
          title: 'Test',
          message: 'Test message',
          url: '/',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        }),
      });

      addLog(`API Response: ${response.status} ${response.statusText}`);
      const result = await response.json();
      addLog(`API Result: ${JSON.stringify(result)}`);
    } catch (error) {
      addLog(`ERROR testing API: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notification System Debug</h1>
          <p className="text-gray-400">Run these tests to identify notification issues</p>
        </div>

        {/* Control Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Tools</CardTitle>
            <CardDescription>Click buttons to run diagnostic tests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={checkVapidKey}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Check VAPID Key
            </Button>
            <Button
              onClick={testVapidConversion}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Test VAPID Conversion
            </Button>
            <Button
              onClick={testSubscribe}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Test Push Subscribe
            </Button>
            <Button
              onClick={testApiEndpoint}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Test API Endpoint
            </Button>
            <Button
              onClick={() => setLogs([])}
              variant="outline"
              className="w-full text-gray-300"
            >
              Clear Logs
            </Button>
          </CardContent>
        </Card>

        {/* Logs Display */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Logs</CardTitle>
            <CardDescription>{logs.length} entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm text-gray-300 space-y-1">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click a test button above.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.includes('✓') ? 'text-green-400' : log.includes('ERROR') ? 'text-red-400' : ''}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Environment Info</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm text-gray-300 space-y-2">
            <div>User Agent: {navigator.userAgent}</div>
            <div>Platform: {navigator.platform}</div>
            <div>VAPID Key Set: {!!vapidKey ? '✓ Yes' : '✗ No'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
