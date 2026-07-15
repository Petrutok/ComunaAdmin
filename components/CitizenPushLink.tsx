'use client';

// Links the browser's push subscription to the signed-in CITIZEN account so
// targeted notifications (status changes, sent server-side via lib/notify-status)
// reach their devices.
//
// The common flow is: visitor accepts notifications on first visit (before
// having an account), so the subscription is stored WITHOUT citizenUid.
// Once they sign in, this component silently re-registers the subscription
// with their ID token, at most once per account per device. Staff have the
// same mechanism in components/admin/StaffPushSetup.tsx.

import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';

export function CitizenPushLink() {
  const { user } = useCitizenAuth();

  useEffect(() => {
    if (!user) return;
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    // At most once per account on this device
    if (localStorage.getItem('citizen_push_linked') === user.uid) return;

    const run = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const idToken = await auth.currentUser?.getIdToken().catch(() => null);
        if (!idToken) return;

        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ subscription: subscription.toJSON(), action: 'subscribe' }),
        });

        if (response.ok) {
          localStorage.setItem('citizen_push_linked', user.uid);
        }
      } catch {
        // linking is best-effort and must never break the page
      }
    };
    run();
  }, [user]);

  return null;
}
