'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, AlertCircle } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = () => {
    // Check multiple possible subscription locations
    const pushSub = localStorage.getItem('push_subscription');
    const debugSub = localStorage.getItem('debug_subscription');
    
    console.log('[Admin] Checking subscriptions...');
    console.log('[Admin] push_subscription exists:', !!pushSub);
    console.log('[Admin] debug_subscription exists:', !!debugSub);
    
    if (pushSub || debugSub) {
      setHasSubscription(true);
      const subToCheck = pushSub || debugSub;
      try {
        const parsed = JSON.parse(subToCheck!);
        setDebugInfo(`Found subscription: ${pushSub ? 'push_subscription' : 'debug_subscription'}\nEndpoint: ${parsed.endpoint?.substring(0, 50)}...`);
      } catch (e) {
        setDebugInfo(`Found subscription but failed to parse: ${e}`);
      }
    } else {
      setDebugInfo('No subscription found in localStorage');
    }
  };

  const sendTestNotification = async () => {
    setSending(true);
    
    try {
      const payload = {
        title: title || 'Test Notificare Admin',
        body: message || 'Aceasta este o notificare de test din panoul admin',
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

      console.log('[Admin] Response status:', response.status);
      const result = await response.json();
      console.log('[Admin] Send result:', result);

      if (result.success) {
        toast({
          title: "Notificare trimisă!",
          description: `Trimisă la ${result.sent} dispozitive. ${result.failed} eșuate.`,
        });
        
        // Clear form
        setTitle('');
        setMessage('');
        setUrl('');
      } else {
        console.error('[Admin] Send failed:', result);
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite notificarea.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Admin] Send error:', error);
      toast({
        title: "Eroare",
        description: `Eroare la trimiterea notificării: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }; // <-- Aici lipsea paranteza de închidere

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Trimite Notificare Push
          </CardTitle>
          <CardDescription>
            Trimite notificări push către utilizatorii care au permis notificări
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSubscription && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Nu există subscripții active</p>
                <p className="mt-1">Asigură-te că ai permis notificările în browser înainte de a trimite.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titlu notificare</Label>
            <Input
              id="title"
              placeholder="Ex: Ofertă specială"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mesaj</Label>
            <Textarea
              id="message"
              placeholder="Ex: Reducere 20% la toate produsele!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL destinație (opțional)</Label>
            <Input
              id="url"
              placeholder="Ex: /oferte"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {debugInfo && (
            <div className="bg-gray-100 rounded p-3 text-xs font-mono whitespace-pre-wrap">
              {debugInfo}
            </div>
          )}

          <Button 
            onClick={sendTestNotification} 
            disabled={sending || (!title && !message)}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Se trimite...' : 'Trimite Notificare'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}