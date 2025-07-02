'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/NotificationProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function NotificationButton() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = useNotifications();

  if (!isSupported) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={isSubscribed ? unsubscribe : subscribe}
            className={`relative ${
              isSubscribed 
                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/50' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            } backdrop-blur-sm border`}
            size="lg"
          >
            {isSubscribed ? (
              <>
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              </>
            ) : (
              <BellOff className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSubscribed ? 'Notificări active' : 'Activează notificările'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}