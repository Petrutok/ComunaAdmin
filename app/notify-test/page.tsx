'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function NotifyTest() {
  const [status, setStatus] = useState('Loading...');
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`]);
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
      addLog('=== Starting permission request ===');
      setStatus('Step 1: Checking SW...');
      
      // Step 1: Register SW with better error handling
      if ('serviceWorker' in navigator) {
        addLog('ServiceWorker API available');
        
        try {
          // Check existing registration
          let reg = await navigator.serviceWorker.getRegistration();
          addLog(`Existing registration: ${!!reg}`);
          
          if (!reg) {
            addLog('Registering new SW...');
            setStatus('Step 2: Registering SW...');
            
            reg = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            
            addLog(`SW registered, state: ${reg.active?.state || 'installing'}`);
            
            // Wait for activation - Fixed: Check if reg exists before accessing properties
            if (reg?.installing) {
              addLog('SW is installing...');
              const installer = reg.installing;
              await new Promise((resolve) => {
                installer.addEventListener('statechange', function() {
                  if (this.state === 'activated') {
                    addLog('SW activated!');
                    resolve(true);
                  }
                });
              });
            }
          }
          
          addLog('Waiting for SW to be ready...');
          setStatus('Step 3: SW activating...');
          await navigator.serviceWorker.ready;
          addLog('SW is ready!');
          
        } catch (swError: any) {
          addLog(`SW Error: ${swError.message}`);
          setStatus(`SW Error: ${swError.message}`);
          return;
        }
      } else {
        addLog('ServiceWorker NOT supported!');
        setStatus('Error: No SW support');
        return;
      }
      
      // Step 2: Request notification permission
      addLog('Requesting notification permission...');
      setStatus('Step 4: Requesting permission...');
      
      const permission = await Notification.requestPermission();
      addLog(`Permission result: ${permission}`);
      setStatus(`Permission: ${permission}`);
      
      if (permission !== 'granted') {
        addLog('Permission not granted, stopping');
        return;
      }
      
      // Step 3: Create push subscription
      addLog('Creating push subscription...');
      setStatus('Step 5: Creating subscription...');
      
      const reg = await navigator.serviceWorker.ready;
      
      // Check if push is supported
      if (!reg.pushManager) {
        addLog('Push manager not available!');
        setStatus('Error: No push support');
        return;
      }
      
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
      
      try {
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
        
        addLog('Subscription created successfully!');
        addLog(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        
        // Step 4: Save to server
        setStatus('Step 6: Saving to server...');
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            deviceInfo: { platform: 'ios-test-pwa' }
          })
        });
        
        const result = await response.json();
        addLog(`Server response: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Step 5: Show test notification
        setStatus('Step 7: Showing notification...');
        await reg.showNotification('Success! 🎉', {
          body: 'Notificările funcționează pe iOS!',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        });
        
        addLog('Test notification sent!');
        setStatus('✅ All working! Check for notification!');
        
      } catch (pushError: any) {
        addLog(`Push subscription error: ${pushError.message}`);
        setStatus(`Push error: ${pushError.message}`);
      }
      
    } catch (error: any) {
      addLog(`GLOBAL ERROR: ${error.message}`);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Manual SW check
  const checkSW = async () => {
    addLog('=== Manual SW Check ===');
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    addLog(`Found ${registrations.length} registrations`);
    
    registrations.forEach((reg, i) => {
      addLog(`Reg ${i}: ${reg.scope}`);
      addLog(`- Active: ${reg.active?.state || 'none'}`);
      addLog(`- Waiting: ${reg.waiting?.state || 'none'}`);
      addLog(`- Installing: ${reg.installing?.state || 'none'}`);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-slate-800 rounded-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            iOS PWA Notification Test
          </h1>
          
          <div className="mb-4 p-3 bg-slate-700 rounded text-white font-mono text-sm">
            {status}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={requestPermission}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              🔔 Enable Notifications
            </button>
            
            <button
              onClick={checkSW}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              🔍 Check Service Worker
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-2">Debug Logs:</h2>
          <div className="text-xs text-gray-400 font-mono space-y-1 max-h-96 overflow-auto bg-black p-3 rounded">
            {logs.map((log, i) => (
              <div key={i} className={
                log.includes('ERROR') ? 'text-red-400' : 
                log.includes('SUCCESS') ? 'text-green-400' :
                log.includes('===') ? 'text-yellow-400 font-bold' :
                ''
              }>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}