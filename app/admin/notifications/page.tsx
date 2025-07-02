'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send } from 'lucide-react';
import { NotificationManager } from '@/lib/notification-manager';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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
      const result = await NotificationManager.sendToAll(
        title.trim(),
        message.trim(),
        url.trim() || '/'
      );

      if (result.success) {
        toast({
          title: "Notificare trimisă!",
          description: result.sent > 0 
            ? `Trimisă cu succes la ${result.sent} dispozitive.`
            : "Nu există dispozitive active momentan.",
        });

        // Reset form
        setTitle('');
        setMessage('');
        setUrl('');
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">Trimite Notificare</h1>

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
                placeholder="Ex: /anunturi"
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-xs text-gray-400">
                Unde va fi redirecționat utilizatorul când apasă pe notificare
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={sending}
            >
              {sending ? (
                "Se trimite..."
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

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Notă:</strong> Pentru a primi notificări, utilizatorii trebuie să le activeze 
          mai întâi folosind butonul de notificări din aplicație.
        </p>
      </div>
    </div>
  );
}