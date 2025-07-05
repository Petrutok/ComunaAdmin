'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Send, 
  Users, 
  AlertCircle, 
  CheckCircle,
  Clock,
  BarChart,
  Megaphone,
  Calendar,
  MapPin
} from 'lucide-react';
import { sendNotificationToAll, sendNotificationToGroup } from '@/lib/notificationSystem';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminNotificationPanel() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'urgent' | 'event' | 'info' | 'general'>('general');
  const [targetAudience, setTargetAudience] = useState<'all' | 'group'>('all');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeToday: 0,
    lastNotification: null as any
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total subscriptions
      const subsSnapshot = await getDocs(
        query(collection(db, 'push_subscriptions'), where('active', '==', true))
      );
      
      // Get subscriptions active today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySnapshot = await getDocs(
        query(
          collection(db, 'push_subscriptions'),
          where('updatedAt', '>=', today)
        )
      );
      
      // Get last notification
      const notifSnapshot = await getDocs(
        query(
          collection(db, 'notification_history'),
          orderBy('sentAt', 'desc'),
          limit(1)
        )
      );
      
      setStats({
        totalSubscriptions: subsSnapshot.size,
        activeToday: todaySnapshot.size,
        lastNotification: notifSnapshot.docs[0]?.data() || null
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!title || !message) {
      toast({
        title: "Eroare",
        description: "Titlul și mesajul sunt obligatorii",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    
    try {
      const options = {
        url,
        category,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      };
      
      let result;
      if (targetAudience === 'all') {
        result = await sendNotificationToAll(title, message, options);
      } else {
        // Pentru demo, trimitem la toți. În producție ai putea filtra
        result = await sendNotificationToAll(title, message, options);
      }
      
      toast({
        title: "Notificare trimisă!",
        description: `Trimis cu succes la ${result.success} utilizatori. ${result.failed} eșuate.`,
      });
      
      // Clear form
      setTitle('');
      setMessage('');
      setUrl('');
      setCategory('general');
      
      // Reload stats
      loadStats();
      
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite notificarea",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'info': return <Megaphone className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'urgent': return 'destructive';
      case 'event': return 'default';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Trimite Notificare către Cetățeni
        </h1>
        <p className="text-gray-400">
          Notifică toți cetățenii despre evenimente importante, urgențe sau informări
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Abonați</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-white">
                {stats.totalSubscriptions}
              </span>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Activi Azi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-white">
                {stats.activeToday}
              </span>
              <BarChart className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Ultima Notificare</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">
                {stats.lastNotification?.sentAt?.toDate?.()?.toLocaleDateString('ro-RO') || 'Niciuna'}
              </span>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Compune Notificare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-gray-200">Categorie</Label>
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    General
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Urgență
                  </div>
                </SelectItem>
                <SelectItem value="event">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Eveniment
                  </div>
                </SelectItem>
                <SelectItem value="info">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-green-500" />
                    Informare
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label className="text-gray-200">Destinatari</Label>
            <Select value={targetAudience} onValueChange={(v: any) => setTargetAudience(v)}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Toți cetățenii ({stats.totalSubscriptions})
                  </div>
                </SelectItem>
                <SelectItem value="group" disabled>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Grup specific (în dezvoltare)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-200">
              Titlu notificare *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Întrerupere apă în zona centrală"
              className="bg-slate-900 border-slate-600 text-white"
              maxLength={50}
            />
            <p className="text-xs text-gray-400">{title.length}/50 caractere</p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-gray-200">
              Mesaj *
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Mâine, 15 martie, între orele 09:00-14:00 se va întrerupe furnizarea apei..."
              rows={4}
              className="bg-slate-900 border-slate-600 text-white"
              maxLength={200}
            />
            <p className="text-xs text-gray-400">{message.length}/200 caractere</p>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-gray-200">
              Link (opțional)
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Ex: /anunturi/123"
              className="bg-slate-900 border-slate-600 text-white"
            />
            <p className="text-xs text-gray-400">
              Unde va fi redirecționat utilizatorul când apasă pe notificare
            </p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="border border-slate-600 rounded-lg p-4 bg-slate-900">
              <p className="text-xs text-gray-400 mb-2">Preview notificare:</p>
              <div className="flex items-start gap-3">
                <div className="bg-slate-700 p-2 rounded">
                  {getCategoryIcon(category)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {title || 'Titlu notificare'}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    {message || 'Mesajul notificării...'}
                  </p>
                  <Badge variant={getCategoryColor(category)} className="mt-2">
                    {category}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex items-center justify-between">
            <Alert className="flex-1 mr-4 bg-blue-900/20 border-blue-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Notificarea va fi trimisă instant la {stats.totalSubscriptions} utilizatori
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleSendNotification}
              disabled={sending || !title || !message}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
            >
              {sending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Se trimite...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Trimite Notificare
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {stats.lastNotification && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Ultima notificare trimisă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{stats.lastNotification.title}</p>
                <p className="text-sm text-gray-400">{stats.lastNotification.message}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {stats.lastNotification.success} trimise
                </Badge>
                <p className="text-xs text-gray-400">
                  {stats.lastNotification.sentAt?.toDate?.()?.toLocaleString('ro-RO')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}