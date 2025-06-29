'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'

declare global {
  interface Window {
    OneSignal: any;
  }
}

export default function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifică statusul notificărilor
    if (window.OneSignal) {
      window.OneSignal.push(async function() {
        const permission = await window.OneSignal.Notifications.permission;
        setIsSubscribed(permission);
        setLoading(false);
      });
    }
  }, []);

  const handleClick = () => {
    if (window.OneSignal) {
      window.OneSignal.push(function() {
        window.OneSignal.Slidedown.promptPush();
      });
    }
  };

  if (loading) return null;

  return (
    <Button
      onClick={handleClick}
      variant={isSubscribed ? "outline" : "default"}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Notificări Active
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Activează Notificări
        </>
      )}
    </Button>
  );
}