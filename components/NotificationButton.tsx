'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Verifică permisiunea curentă
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Acest browser nu suportă notificări.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Test notificare
        new Notification('Comuna - Notificări activate!', {
          body: 'Vei primi notificări despre anunțuri și evenimente noi.',
          icon: '/icon-192x192.png',
        });
      } else if (result === 'denied') {
        alert('Notificările au fost blocate. Pentru a le activa:\n\n1. Deschide Setări\n2. Găsește această aplicație\n3. Activează Notificările');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      alert('Eroare la activarea notificărilor.');
    }
  };

  const getButtonProps = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <Bell className="h-5 w-5 text-green-400" />,
          text: 'Notificări active',
          color: 'bg-green-900/20',
        };
      case 'denied':
        return {
          icon: <BellOff className="h-5 w-5 text-red-400" />,
          text: 'Notificări blocate',
          color: 'bg-red-900/20',
        };
      default:
        return {
          icon: <Bell className="h-5 w-5 text-gray-400" />,
          text: 'Activează notificări',
          color: 'bg-slate-800/50',
        };
    }
  };

  const { icon, text, color } = getButtonProps();

  return (
    <button
      onClick={requestPermission}
      disabled={permission !== 'default'}
      className={`relative p-2 rounded-lg ${color} hover:bg-slate-700/50 transition-colors group`}
      title={text}
    >
      {icon}
      
      {/* Indicator pentru status */}
      <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        permission === 'granted' ? 'bg-green-400' : 
        permission === 'denied' ? 'bg-red-400' : 
        'bg-gray-600'
      }`} />
    </button>
  );
}