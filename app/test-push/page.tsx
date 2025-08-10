'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TestPush() {
  const [logs, setLogs] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    // Check VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    addLog(`VAPID Key exists: ${!!vapidKey}`);
    if (vapidKey) {
      addLog(`VAPID Key length: ${vapidKey.length}`);
      addLog(`VAPID Key preview: ${vapidKey.substring(0, 30)}...`);
    }
  }, []);

  const testManualSubscribe = async () => {
    try {
      addLog('Starting manual subscribe test...');
      
      // 1. Check permission
      const permission = await Notification.requestPermission();
      addLog(`Permission: ${permission}`);
      
      if (permission !== 'granted') {
        addLog('Permission denied!');
        return;
      }

      // 2. Get service worker
      const registration = await navigator.serviceWorker.ready;
      addLog('Service worker ready');

      // 3. Subscribe
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      
      function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      
      addLog('Subscription created!');
      setSubscription(sub.toJSON());
      
      // 4. Send to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          deviceInfo: { platform: 'test-page' }
        })
      });
      
      const result = await response.json();
      addLog(`Server response: ${JSON.stringify(result)}`);
      
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Push Notifications Test</h1>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Environment:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs">
              VAPID Key: {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'EXISTS' : 'MISSING'}
            </pre>
          </div>

          <Button onClick={testManualSubscribe}>
            Test Manual Subscribe
          </Button>

          {subscription && (
            <div>
              <h3 className="font-semibold">Subscription:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(subscription, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h3 className="font-semibold">Logs:</h3>
            <div className="bg-gray-100 p-2 rounded text-xs max-h-96 overflow-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}