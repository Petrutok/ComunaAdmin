'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifică statusul notificărilor când componenta se încarcă
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      try {
        const permission = await window.OneSignal.getNotificationPermission();
        setIsSubscribed(permission === 'granted');
      } catch (error) {
        console.error('Error checking notification status:', error);
      }
    }
    setLoading(false);
  };

  const handleNotificationToggle = async () => {
    if (typeof window === 'undefined' || !window.OneSignal) {
      alert('Notificările nu sunt disponibile în acest browser.');
      return;
    }

    setLoading(true);

    try {
      if (!isSubscribed) {
        // Activează notificări
        const permission = await window.OneSignal.showSlidedownPrompt();
        if (permission) {
          setIsSubscribed(true);
          alert('Notificările au fost activate! Vei primi notificări despre anunțuri și evenimente noi.');
        }
      } else {
        // Dezactivează notificări
        window.OneSignal.setSubscription(false);
        setIsSubscribed(false);
        alert('Notificările au fost dezactivate.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      
      // Mesaj specific pentru iOS
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert('Pentru a activa notificările pe iOS:\n\n1. Deschide Setări\n2. Mergi la Notificări\n3. Găsește această aplicație\n4. Activează "Allow Notifications"');
      } else {
        alert('Nu s-au putut activa notificările. Verifică setările browserului.');
      }
    }
    
    setLoading(false);
  };

  return (
    <button
      onClick={handleNotificationToggle}
      disabled={loading}
      className="relative p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
      title={isSubscribed ? 'Dezactivează notificări' : 'Activează notificări'}
    >
      {isSubscribed ? (
        <Bell className="h-5 w-5 text-green-400" />
      ) : (
        <BellOff className="h-5 w-5 text-gray-400 group-hover:text-white" />
      )}
      
      {/* Indicator pentru status */}
      {!loading && (
        <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
          isSubscribed ? 'bg-green-400' : 'bg-gray-600'
        }`} />
      )}
    </button>
  );
}