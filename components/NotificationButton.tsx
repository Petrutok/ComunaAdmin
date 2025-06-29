'use client';

import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export function NotificationButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-gray-300 hover:text-white"
      onClick={() => alert('Notificările vor fi disponibile în curând!')}
    >
      <Bell className="h-4 w-4" />
    </Button>
  );
}
