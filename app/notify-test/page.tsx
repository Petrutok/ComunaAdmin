'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function NotifyTest() {
  const [status, setStatus] = useState('Loading...');
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    addLog('Page loaded');
    addLog(`User Agent: ${navigator.userAgent}`);
    addLog(`Is iOS: ${/iPhone|iPad|iPod/.test(navigator.userAgent)}`);
    addLog(`PWA mode: ${window.matchMedia('(display-mode: standalone)').matches}`);
    addLog(`Permission: ${typeof Notification !== 'undefined' ? Notification.permission : 'Not supported'}`);
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        addLog(`SW registered: ${!!reg}`);
      });
    }
  }, []);

  const requestPermission = async () => {
    try {
      addLog('Requesting permission...');
      setStatus('Requesting...');
      
      // Register SW first if needed
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        addLog('SW ready');
      }
      
      const permission = await Notification.requestPermission();
      addLog(`Permission result: ${permission}`);
      setStatus(`Permission: ${permission}`);
      
      if (permission === 'granted') {
        // Try to subscribe
        const reg = await navigator.serviceWorker.ready;
        
        const vapidKey = 'BHGilkUM5GybHxg1c9HCzMZGHstJnmpHkhbdlcHwvpxrNTbcve-JPbX15gxIsypTjZPpMY4B5hrEqZ9JuBAuAf0';
        
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
        
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
        
        addLog('Subscription created!');
        
        // Save to server
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            deviceInfo: { platform: 'ios-test' }
          })
        });
        
        const result = await response.json();
        addLog(`Server response: ${JSON.stringify(result)}`);
        
        // Show test notification
        await reg.showNotification('Success! 🎉', {
          body: 'Notificările funcționează!',
          icon: '/icon-192x192.png'
        });
        
        setStatus('✅ All working!');
      }
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-800 rounded-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            iOS Notification Test
          </h1>
          
          <div className="mb-4 p-3 bg-slate-700 rounded text-white">
            {status}
          </div>
          
          <button
            onClick={requestPermission}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Enable Notifications
          </button>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-2">Debug Logs:</h2>
          <div className="text-xs text-gray-400 font-mono space-y-1 max-h-96 overflow-auto">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('ERROR') ? 'text-red-400' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}