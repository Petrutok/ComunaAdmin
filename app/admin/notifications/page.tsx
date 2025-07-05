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
    
    if (pushSub || debugSub) {
      setHasSubscription(true);
      setDebugInfo(`Found subscription: ${pushSub ? 'push_subscription' : 'debug_subscription'}`);
    } else {
      setDebugInfo('No subscription found in localStorage');
    }
  };

  const sendTestNotification = async () => {
    // Try to get subscription from multiple sources
    let subscriptionStr = localStorage.getItem('push_subscription') || 
                         localStorage.getItem('debug_subscription');
    
    if (!subscriptionStr) {
      toast({
        title: "Eroare",
        description: "Nu ai activat notificările. Folosește butonul de notificări din aplicație sau /debug-mobile",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      const subscription = JSON.parse(subscriptionStr);
      console.log('Using subscription:', subscription);
      
      // Send notification
      const response = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Test Notificare Admin',
          message: message || 'Aceasta este o notificare de test din panoul admin',
          url: url || '/',
          subscriptionsList: [subscription]
        }),
      });

      const result = await response.json();
      console.log('Send result:', result);

      if (result.success && result.sent > 0) {
        toast({
          title: "Notificare trimisă!",
          description: "Verifică dispozitivul tău pentru notificare.",
        });
        
        // Clear form
        setTitle('');
        setMessage('');
        setUrl('');
      } else {
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite notificarea.",
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

  const copyDebugSubscription = () => {
    // This helps to sync subscription from debug page
    const debugSub = localStorage.getItem('debug_subscription');
    if (debugSub) {
      localStorage.setItem('push_subscription', debugSub);
      checkSubscription();
      toast({
        title: "Succes",
        description: "Subscription copiat din debug page",
      });
    } else {
      toast({
        title: "Eroare",
        description: "Nu există subscription în debug page",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendTestNotification();
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-200">
                Titlu notificare
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Test Notificare Admin"
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

            <div className="space-y-2">
              <Label htmlFor="url" className="text-gray-200">
                URL (opțional)
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            <Button
              onClick={sendTestNotification}
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
          </div>

          {/* Debug info */}
          <div className="mt-4 p-3 bg-slate-900 rounded text-xs text-gray-400">
            <p className="font-mono">{debugInfo}</p>
          </div>
        </CardContent>
      </Card>

      {!hasSubscription && (
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-orange-300 font-medium mb-2">
                Nu ai activat notificările pe acest dispozitiv
              </p>
              <p className="text-sm text-gray-400 mb-3">
                Pentru a activa notificările:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1 mb-3">
                <li>Mergi la <a href="/debug-mobile" className="text-blue-400 underline">/debug-mobile</a></li>
                <li>Apasă "iOS Workaround" (pentru iOS) sau "Test Subscription"</li>
                <li>Revino aici după ce vezi "Subscription successful!"</li>
              </ol>
              <Button
                onClick={copyDebugSubscription}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                Copiază subscription din debug
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Pentru debugging avansat:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/debug-mobile', '_blank')}
            >
              Deschide Debug Mobile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}