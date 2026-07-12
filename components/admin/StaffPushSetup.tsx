'use client';

// Links the browser's push subscription to the signed-in STAFF account so
// assignment notifications (/api/notify-assignment) reach the right person.
//
// Two jobs:
// 1. Permission already granted: silently re-register the subscription
//    with the staff token once per account (subscriptions created before
//    login carry no uid and would never be targeted).
// 2. Permission not asked yet: show a small dismissible banner offering
//    to enable notifications.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/hooks/use-toast';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

async function registerSubscription(subscription: PushSubscription): Promise<boolean> {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return false;
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON(), action: 'subscribe' }),
  });
  return response.ok;
}

export function StaffPushSetup() {
  const { userId } = useAdminAuth();
  const { toast } = useToast();
  const [showBanner, setShowBanner] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const run = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        if (Notification.permission === 'granted') {
          // Re-link at most once per staff account on this device
          const linkedFor = localStorage.getItem('staff_push_linked');
          if (linkedFor === userId) return;
          const existing = await registration.pushManager.getSubscription();
          if (existing && (await registerSubscription(existing))) {
            localStorage.setItem('staff_push_linked', userId);
          }
          return;
        }

        if (
          Notification.permission === 'default' &&
          !localStorage.getItem('staff_push_dismissed')
        ) {
          setShowBanner(true);
        }
      } catch {
        // push setup is never allowed to break the admin panel
      }
    };
    run();
  }, [userId]);

  const enable = async () => {
    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShowBanner(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID key missing');
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));
      if (await registerSubscription(subscription)) {
        localStorage.setItem('staff_push_linked', userId || '');
        toast({
          title: 'Notificări activate',
          description: 'Vei primi o notificare când ți se repartizează un document.',
        });
      }
      setShowBanner(false);
    } catch (error) {
      console.error('[StaffPushSetup] Enable failed:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut activa notificările',
        variant: 'destructive',
      });
    } finally {
      setEnabling(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-indigo-200">
        <Bell className="h-5 w-5 text-indigo-300 shrink-0" />
        Activează notificările ca să afli imediat când ți se repartizează o cerere sau un email.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={enable} disabled={enabling} className="bg-indigo-600 hover:bg-indigo-700">
          Activează
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white"
          onClick={() => {
            localStorage.setItem('staff_push_dismissed', '1');
            setShowBanner(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
