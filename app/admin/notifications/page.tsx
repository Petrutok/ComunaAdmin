'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Users, Clock, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { addDoc, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [activeTokens, setActiveTokens] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentNotifications();
    loadActiveTokensCount();
  }, []);

  const loadRecentNotifications = async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        orderBy('sentAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadActiveTokensCount = async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.FCM_TOKENS),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      setActiveTokens(snapshot.size);
    } catch (error) {
      console.error('Error counting tokens:', error);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Eroare",
        description: "Completează titlul și mesajul",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/send-fcm-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          url: url.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Notificare trimisă!",
          description: `Trimisă cu succes la ${result.successCount} din ${result.totalTokens} dispozitive.`,
        });

        // Resetează formularul
        setTitle('');
        setMessage('');
        setUrl('');
        
        // Reîncarcă datele
        loadRecentNotifications();
        loadActiveTokensCount();
      } else {
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite notificarea",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Eroare de rețea",
        description: "Nu s-a putut conecta la server. Verifică conexiunea.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: any) => {
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Trimite Notificare</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Smartphone className="h-4 w-4" />
          <span>{activeTokens} dispozitive active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificare Nouă
            </CardTitle>
            <CardDescription className="text-gray-400">
              Trimite o notificare către toate dispozitivele cu notificări active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">
                  Titlu notificare *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Anunț important"
                  className="bg-slate-900 border-slate-600 text-white"
                  required
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-gray-200">
                  Mesaj *
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Scrie mesajul notificării..."
                  rows={4}
                  className="bg-slate-900 border-slate-600 text-white"
                  required
                  maxLength={200}
                />
                <p className="text-xs text-gray-400">
                  {message.length}/200 caractere
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url" className="text-gray-200">
                  Link (opțional)
                </Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Ex: /anunturi sau https://..."
                  className="bg-slate-900 border-slate-600 text-white"
                />
                <p className="text-xs text-gray-400">
                  Unde va fi redirecționat utilizatorul când apasă pe notificare
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={sending || activeTokens === 0}
              >
                {sending ? (
                  <>Se trimite...</>
                ) : activeTokens === 0 ? (
                  <>Nu există dispozitive active</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Trimite Notificare
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Informații despre notificări */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informații Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-blue-500/20 rounded">
                  <Bell className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-200">Firebase Cloud Messaging</p>
                  <p className="text-gray-400 text-xs">
                    Notificări native pentru web și mobile
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-green-500/20 rounded">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-200">Suport iOS</p>
                  <p className="text-gray-400 text-xs">
                    Funcționează pe toate platformele
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-orange-500/20 rounded">
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-200">Folosește cu măsură</p>
                  <p className="text-gray-400 text-xs">
                    Nu trimite prea multe notificări
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-purple-500/20 rounded">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-200">{activeTokens} dispozitive</p>
                  <p className="text-gray-400 text-xs">
                    Cu notificări active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Istoric notificări */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Ultimele Notificări
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Nu au fost trimise notificări încă.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notif) => (
                    <div key={notif.id} className="border-b border-slate-700 pb-3 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm">
                              {notif.title}
                            </p>
                            {notif.status === 'sent' ? (
                              <CheckCircle className="h-3 w-3 text-green-400" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-orange-400" />
                            )}
                          </div>
                          <p className="text-gray-400 text-xs mt-1">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {notif.successCount !== undefined && (
                              <p className="text-gray-500 text-xs">
                              </p>
                            )}
                            {notif.failureCount !== undefined && notif.failureCount > 0 && (
                              <p className="text-red-400 text-xs">
                                {notif.failureCount} eșuate
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatDate(notif.sentAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}