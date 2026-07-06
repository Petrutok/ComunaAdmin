"use client";

import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { sendNotificationToAll } from '@/lib/notificationSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Siren, Loader2, BellRing, CheckCircle } from 'lucide-react';
import { LocalAlert, AlertType, ALERT_TYPE_CONFIG, isAlertLive } from '@/types/alerts';

export default function AdminAlertePage() {
  const { user } = useAdminAuth();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('altele');
  const [expiryHours, setExpiryHours] = useState<string>('24');
  const [sendPush, setSendPush] = useState(true);

  const loadAlerts = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(50))
      );
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LocalAlert)));
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);

    try {
      const hours = parseInt(expiryHours, 10);
      const alertData = {
        title: title.trim(),
        message: message.trim(),
        type,
        active: true,
        createdAt: Timestamp.now(),
        expiresAt:
          hours > 0
            ? Timestamp.fromDate(new Date(Date.now() + hours * 60 * 60 * 1000))
            : null,
        createdBy: user?.uid || 'necunoscut',
        createdByNume: user?.email || 'Admin',
      };

      await addDoc(collection(db, 'alerts'), alertData);

      // Broadcast push to all subscribers (best effort)
      let pushInfo = '';
      if (sendPush) {
        try {
          const result = await sendNotificationToAll(
            `🚨 ${ALERT_TYPE_CONFIG[type].icon} ${title.trim()}`,
            message.trim(),
            { url: '/alerte' }
          );
          pushInfo = ` Notificare trimisă la ${result?.success ?? 0} dispozitive.`;
        } catch (error) {
          console.error('Push broadcast failed:', error);
          pushInfo = ' Notificarea push a eșuat - alerta rămâne publicată.';
        }
      }

      toast({ title: 'Alertă publicată', description: `Alerta este vizibilă în aplicație.${pushInfo}` });
      setTitle('');
      setMessage('');
      setType('altele');
      setExpiryHours('24');
      loadAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({ title: 'Eroare', description: 'Nu s-a putut publica alerta.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { active: false });
      toast({ title: 'Alertă închisă' });
      loadAlerts();
    } catch (error) {
      console.error('Error deactivating alert:', error);
      toast({ title: 'Eroare', description: 'Nu s-a putut închide alerta.', variant: 'destructive' });
    }
  };

  const formatDate = (ts?: Timestamp) =>
    ts ? ts.toDate().toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-500/20 rounded-xl">
          <Siren className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Alerte urgente</h1>
          <p className="text-gray-400 text-sm">
            Întreruperi de utilități, drumuri blocate, avertizări - vizibile pe prima pagină și trimise push
          </p>
        </div>
      </div>

      {/* Create form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Publică o alertă</CardTitle>
          <CardDescription className="text-gray-400">
            Alerta apare imediat ca banner pe prima pagină și pe pagina de alerte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-200">Tip alertă</Label>
                <Select value={type} onValueChange={(v) => setType(v as AlertType)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {ALERT_TYPE_CONFIG[t].icon} {ALERT_TYPE_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Expiră automat după</Label>
                <Select value={expiryHours} onValueChange={setExpiryHours}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="6">6 ore</SelectItem>
                    <SelectItem value="12">12 ore</SelectItem>
                    <SelectItem value="24">24 ore</SelectItem>
                    <SelectItem value="48">2 zile</SelectItem>
                    <SelectItem value="168">7 zile</SelectItem>
                    <SelectItem value="0">Nu expiră (închid manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Titlu *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Întrerupere apă potabilă pe Str. Principală"
                maxLength={100}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Mesaj *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Detalii: zona afectată, intervalul estimat, recomandări pentru cetățeni"
                rows={3}
                maxLength={500}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={sendPush}
                onChange={(e) => setSendPush(e.target.checked)}
                className="h-4 w-4 accent-red-500"
              />
              Trimite și notificare push către toți abonații
            </label>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 py-6 text-base"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <BellRing className="mr-2 h-5 w-5" />
              )}
              Publică alerta
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alert list */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Istoric alerte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-center text-gray-400 py-6">Nicio alertă publicată încă.</p>
          ) : (
            alerts.map((alert) => {
              const config = ALERT_TYPE_CONFIG[alert.type] || ALERT_TYPE_CONFIG.altele;
              const live = isAlertLive(alert);
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-4 ${
                    live ? 'border-red-500/40 bg-red-900/10' : 'border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor}`}>
                          {config.icon} {config.label}
                        </Badge>
                        {live ? (
                          <Badge className="bg-red-600 text-white">ACTIVĂ</Badge>
                        ) : (
                          <Badge className="bg-slate-600 text-gray-200">închisă</Badge>
                        )}
                      </div>
                      <h3 className="mt-2 font-semibold text-white">{alert.title}</h3>
                      <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(alert.createdAt)} · {alert.createdByNume}
                        {alert.expiresAt ? ` · expiră ${formatDate(alert.expiresAt)}` : ''}
                      </p>
                    </div>
                    {live && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(alert.id)}
                        className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white shrink-0"
                      >
                        <CheckCircle className="mr-1.5 h-4 w-4" />
                        Închide alerta
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
