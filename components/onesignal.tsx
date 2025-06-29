'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    OneSignal: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    // Încarcă OneSignal SDK
    window.OneSignal = window.OneSignal || [];
    
    // Inițializează OneSignal
    window.OneSignal.push(function() {
      window.OneSignal.init({
        appId: "e8eac05e-f36d-453c-a3ff-f5532c618786", // Înlocuiește cu App ID-ul tău
        safari_web_id: "web.onesignal.auto.e8eac05e-f36d-453c-a3ff-f5532c618786", // Pentru Safari, îl primești de la OneSignal
        allowLocalhostAsSecureOrigin: true,
        welcomeNotification: {
          title: "Comuna Digital",
          message: "Vei primi notificări despre evenimente importante!"
        }
      });
    });

    return () => {
      // Cleanup dacă e necesar
    };
  }, []);

  return null;
}