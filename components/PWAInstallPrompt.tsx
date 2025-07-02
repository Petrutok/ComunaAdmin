'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Share } from 'lucide-react';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Don't show if already installed or previously dismissed
    if (standalone || localStorage.getItem('pwa-install-dismissed')) {
      return;
    }

    // For Android/Desktop - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - show prompt after a delay
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 bg-slate-800 border-slate-700 p-4 shadow-xl max-w-md mx-auto">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="bg-blue-500/20 rounded-lg p-3">
          <Download className="h-6 w-6 text-blue-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">
            Instalează aplicația
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            {isIOS 
              ? 'Pentru notificări și acces rapid, adaugă aplicația pe ecranul principal'
              : 'Instalează aplicația pentru notificări și acces offline'
            }
          </p>
          
          {isIOS ? (
            <div className="text-sm text-gray-400">
              <p className="flex items-center gap-2 mb-1">
                <Share className="h-4 w-4" />
                Apasă pe butonul Share
              </p>
              <p>2. Alege "Add to Home Screen"</p>
            </div>
          ) : (
            <Button 
              onClick={handleInstall}
              className="w-full bg-blue-500 hover:bg-blue-600"
              size="sm"
            >
              Instalează acum
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}