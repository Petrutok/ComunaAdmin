'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/components/NotificationProvider';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function AutoNotificationSetup() {
  const { isSupported, isSubscribed, subscribe } = useNotifications();
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked || !isSupported || isSubscribed) return;
    
    const checkAndPrompt = async () => {
      setHasChecked(true);
      
      // Verifică dacă am întrebat deja vreodată
      const hasAskedBefore = localStorage.getItem('notifications_asked');
      if (hasAskedBefore === 'true') {
        console.log('[AutoNotification] Already asked before');
        return;
      }

      // Verifică permisiunea curentă
      if (Notification.permission === 'granted') {
        // Avem permisiune dar nu suntem subscrisi, subscrie automat
        console.log('[AutoNotification] Permission granted, subscribing...');
        await subscribe();
        return;
      }

      if (Notification.permission === 'denied') {
        // Utilizatorul a refuzat anterior
        localStorage.setItem('notifications_asked', 'true');
        return;
      }

      // Verifică dacă e PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');

      console.log('[AutoNotification] Is PWA:', isPWA);

      // Pentru PWA, așteaptă puțin apoi arată dialogul
      if (isPWA) {
        setTimeout(() => {
          setShowDialog(true);
        }, 2000);
      } else {
        // Pentru browser normal, așteaptă mai mult
        setTimeout(() => {
          setShowDialog(true);
        }, 5000);
      }
    };

    // Așteaptă ca Service Worker să fie ready
    navigator.serviceWorker.ready.then(() => {
      checkAndPrompt();
    });
  }, [isSupported, isSubscribed, hasChecked, subscribe]);

  const handleAccept = async () => {
    setShowDialog(false);
    localStorage.setItem('notifications_asked', 'true');
    
    // Apelează funcția de subscribe din context
    await subscribe();
  };

  const handleDecline = () => {
    setShowDialog(false);
    localStorage.setItem('notifications_asked', 'true');
  };

  if (!isSupported || !showDialog) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
        <button
          onClick={handleDecline}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
            <Bell className="h-8 w-8 text-blue-400" />
          </div>
          
          <DialogTitle className="text-center text-xl text-white">
            Primește notificări importante
          </DialogTitle>
          
          <DialogDescription className="text-center text-gray-300 space-y-3">
            <p>
              Fii la curent cu:
            </p>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Anunțuri importante din comună</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Întreruperi de utilități</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Evenimente și știri locale</span>
              </li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="flex-1"
          >
            Nu acum
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            Activează
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}