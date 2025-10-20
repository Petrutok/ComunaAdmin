'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Trash2,
  Calendar,
  AlertTriangle,
  Info,
  Users,
  Zap,
  Package,
  Clock
} from 'lucide-react';

interface NotificationPreset {
  id: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  category: string;
}

const notificationPresets: NotificationPreset[] = [
  {
    id: 'colectare-deseuri',
    title: 'Colectare deșeuri',
    body: 'Mâine este ziua de colectare a deșeurilor menajere în cartierul dumneavoastră. Vă rugăm să scoateți gunoiul până la ora 7:00.',
    icon: <Trash2 className="h-4 w-4" />,
    category: 'Servicii publice'
  },
  {
    id: 'intrerupere-apa',
    title: 'Întrerupere apă',
    body: 'Mâine între orele 09:00-14:00 se va întrerupe furnizarea apei potabile pentru lucrări de mentenanță în zona [specificați zona].',
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'Urgențe'
  },
  {
    id: 'eveniment-cultural',
    title: 'Eveniment cultural',
    body: 'Vă invităm sâmbătă, ora 18:00, la Casa de Cultură pentru spectacolul [nume eveniment]. Intrarea este liberă!',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Evenimente'
  },
  {
    id: 'sedinta-consiliu',
    title: 'Ședință Consiliu Local',
    body: 'Joi, ora 14:00, va avea loc ședința ordinară a Consiliului Local. Ordinea de zi este disponibilă pe site-ul primăriei.',
    icon: <Users className="h-4 w-4" />,
    category: 'Administrație'
  },
  {
    id: 'taxa-impozit',
    title: 'Termen plată impozite',
    body: 'Vă reamintim că termenul pentru plata impozitelor locale este 31 martie. Beneficiați de 10% reducere pentru plata integrală.',
    icon: <Info className="h-4 w-4" />,
    category: 'Taxe și impozite'
  },
  {
    id: 'lucrari-strada',
    title: 'Lucrări modernizare',
    body: 'Începând de luni se vor demara lucrări de modernizare pe strada [nume stradă]. Vă rugăm să folosiți rute alternative.',
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'Infrastructură'
  },
  {
    id: 'intrerupere-curent',
    title: 'Întrerupere curent electric',
    body: 'Marți, între orele 10:00-15:00, se va întrerupe furnizarea energiei electrice în zona [specificați zona] pentru lucrări programate.',
    icon: <Zap className="h-4 w-4" />,
    category: 'Urgențe'
  },
  {
    id: 'distributie-ajutoare',
    title: 'Distribuție pachete sociale',
    body: 'Începând de mâine se vor distribui pachetele cu ajutoare sociale la sediul primăriei, între orele 09:00-16:00.',
    icon: <Package className="h-4 w-4" />,
    category: 'Social'
  }
];

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationHistory, setNotificationHistory] = useState<Array<{
    id: string;
    title: string;
    body: string;
    sentAt: Date;
    status: 'sent' | 'failed';
  }>>([]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectPreset = (preset: NotificationPreset) => {
    setTitle(preset.title);
    setBody(preset.body);
    setSelectedPreset(preset.id);
  };

  const handleSendNotification = async () => {
    if (!title || !body) {
      setErrorMessage('Completați toate câmpurile!');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: title,
        body: body,
        url: url || '/',
        tag: 'admin-notification'
      };
      
      console.log('[Admin] Sending push notification:', payload);
      
      // Send via Web Push API
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[Admin] Send result:', result);

      if (result.success) {
        // Adaugă în istoric
        const newNotification = {
          id: Date.now().toString(),
          title,
          body,
          sentAt: new Date(),
          status: 'sent' as const
        };
        setNotificationHistory(prev => [newNotification, ...prev].slice(0, 10));
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setTitle('');
        setBody('');
        setUrl('');
        setSelectedPreset(null);
      } else {
        setErrorMessage(result.error || 'Nu s-a putut trimite notificarea');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setErrorMessage('Eroare la trimiterea notificării');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setSending(false);
    }
  };

  const groupedPresets = notificationPresets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, NotificationPreset[]>);

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-indigo-500/30 rounded-xl p-3 border border-indigo-500/20">
              <Bell className="h-8 w-8 text-indigo-500" />
            </div>
            Notificări
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            Trimite notificări către cetățenii abonați
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {currentTime.toLocaleDateString('ro-RO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-2xl font-mono text-white">
              {currentTime.toLocaleTimeString('ro-RO')}
            </div>
          </div>
        </div>
      </div>

      {/* Notificări Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <CheckCircle className="h-5 w-5" />
          Notificare trimisă cu succes!
        </div>
      )}
      
      {showError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <AlertCircle className="h-5 w-5" />
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formular trimitere */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="h-5 w-5" />
              Trimite Notificare
            </CardTitle>
            <CardDescription className="text-gray-400">
              Completează detaliile notificării sau alege un preset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Titlu notificare
              </label>
              <Input
                placeholder="Ex: Întrerupere apă"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Mesaj
              </label>
              <Textarea
                placeholder="Descrieți detaliile notificării..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                URL destinație (opțional)
              </label>
              <Input
                placeholder="Ex: /anunturi"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={sending || !title || !body}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Se trimite...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Trimite Notificare
                </>
              )}
            </Button>

            {/* Info box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  Notificarea va fi trimisă către toți utilizatorii care au activat notificările push.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preset-uri */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Șabloane Predefinite
            </CardTitle>
            <CardDescription className="text-gray-400">
              Alege un șablon pentru a completa automat câmpurile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(groupedPresets).map(([category, presets]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">{category}</h3>
                  <div className="space-y-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedPreset === preset.id
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${
                            selectedPreset === preset.id ? 'text-blue-400' : 'text-gray-400'
                          }`}>
                            {preset.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white text-sm">{preset.title}</h4>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {preset.body}
                            </p>
                          </div>
                          {selectedPreset === preset.id && (
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Istoric notificări */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Istoric Notificări
          </CardTitle>
          <CardDescription className="text-gray-400">
            Ultimele notificări trimise
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nu există notificări trimise recent</p>
              <p className="text-sm mt-1">Notificările trimise vor apărea aici</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {notificationHistory.map((notification) => (
                <div key={notification.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white">{notification.title}</h4>
                    <div className="flex items-center gap-2">
                      {notification.status === 'sent' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-xs text-gray-400">
                        {notification.sentAt.toLocaleTimeString('ro-RO')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">{notification.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}