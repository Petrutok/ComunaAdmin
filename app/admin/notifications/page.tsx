'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Users, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Count active subscriptions
    const subsQuery = query(
      collection(db, 'push_subscriptions'),
      where('active', '==', true)
    );
    const subsSnapshot = await getDocs(subsQuery);
    setActiveSubscriptions(subsSnapshot.size);

    // Load recent notifications
    const notifsQuery = query(
      collection(db, 'notifications'),
      orderBy('sentAt', 'desc'),
      limit(5)
    );
    const notifsSnapshot = await getDocs(notifsQuery);
    const notifs = notifsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setRecentNotifications(notifs);
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
      const response = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          description: `Trimisă cu succes la ${result.sent} dispozitive.`,
        });

        // Reset form
        setTitle('');
        setMessage('');
        setUrl('');
        
        // Reload data
        loadData();
      } else {
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite notificarea",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Eroare de rețea",
        description: "Nu s-a putut conecta la server.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Trimite Notificare</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Smartphone className="h-4 w-4" />
          <span>{activeSubscriptions} dispozitive active</span>
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
              Trimite o notificare către toate dispozitivele active
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
                  placeholder="Ex: /anunturi"
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={sending || activeSubscriptions === 0}
              >
                {sending ? (
                  "Se trimite..."
                ) : activeSubscriptions === 0 ? (
                  "Nu există dispozitive active"
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
                  <p className="text-gray-200">Web Push API</p>
                  <p className="text-gray-400 text-xs">
                    Notificări native fără dependențe externe
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-green-500/20 rounded">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-200">Compatibilitate</p>
                  <p className="text-gray-400 text-xs">
                    iOS, Android, Desktop
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                          <p className="text-white font-medium text-sm">
                            {notif.title}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {notif.message}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {notif.successCount || notif.sent || 0} trimise
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(notif.sentAt?.seconds * 1000 || notif.sentAt).toLocaleDateString('ro-RO')}
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