'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has subscription
    const sub = localStorage.getItem('push_subscription');
    setHasSubscription(!!sub);
  }, []);

  const sendTestNotification = async () => {
    const subscriptionStr = localStorage.getItem('push_subscription');
    if (!subscriptionStr) {
      toast({
        title: "Eroare",
        description: "Nu ai activat notificările. Activează-le mai întâi!",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      const subscription = JSON.parse(subscriptionStr);
      
      // Send to your own device
      const response = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Test Notificare',
          message: message || 'Aceasta este o notificare de test',
          url: url || '/',
          subscriptionsList: [subscription]
        }),
      });

      const result = await response.json();

      if (result.success && result.sent > 0) {
        toast({
          title: "Notificare trimisă!",
          description: "Verifică dispozitivul tău pentru notificare.",
        });
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-a putut trimite notificarea.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Send error:', error);
      toast({
        title: "Eroare",
        description: "Eroare la trimiterea notificării.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">Test Notificări</h1>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Trimite Notificare Test
          </CardTitle>
          <CardDescription className="text-gray-400">
            Testează notificările pe dispozitivul tău
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); sendTestNotification(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-200">
                Titlu notificare
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Test Notificare"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-gray-200">
                Mesaj
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Aceasta este o notificare de test"
                rows={3}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={sending || !hasSubscription}
            >
              {sending ? (
                "Se trimite..."
              ) : !hasSubscription ? (
                "Activează notificările mai întâi"
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Trimite Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!hasSubscription && (
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
          <p className="text-sm text-orange-300">
            <strong>Atenție:</strong> Nu ai activat notificările pe acest dispozitiv. 
            Folosește butonul de notificări din aplicație pentru a le activa.
          </p>
        </div>
      )}
    </div>
  );
}