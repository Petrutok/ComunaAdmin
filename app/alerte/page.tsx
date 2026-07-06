"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Siren, Loader2, CheckCircle } from 'lucide-react';
import { LocalAlert, ALERT_TYPE_CONFIG, isAlertLive } from '@/types/alerts';

export default function AlertePage() {
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(30))
        );
        setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LocalAlert)));
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const liveAlerts = alerts.filter(isAlertLive);
  const pastAlerts = alerts.filter((a) => !isAlertLive(a));

  const formatDate = (ts?: Timestamp) =>
    ts
      ? ts.toDate().toLocaleString('ro-RO', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-3xl mx-auto">
        <Link href="/" className="fixed top-4 left-4 z-50">
          <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Acasă</span>
          </div>
        </Link>

        <div className="text-center pt-20 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-red-500 rounded-xl mb-4">
            <Siren className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Alerte locale</h1>
          <p className="text-gray-400 mt-2">
            Întreruperi de utilități, drumuri blocate și alte anunțuri urgente
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {liveAlerts.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-10 text-center">
                  <CheckCircle className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
                  <p className="text-lg font-medium text-white">Nicio alertă activă</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Totul funcționează normal în comună.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {liveAlerts.map((alert) => {
                  const config = ALERT_TYPE_CONFIG[alert.type] || ALERT_TYPE_CONFIG.altele;
                  return (
                    <Card key={alert.id} className="border-red-500/40 bg-red-900/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor}`}>
                            {config.icon} {config.label}
                          </Badge>
                          <Badge className="bg-red-600 text-white animate-pulse">ACTIVĂ</Badge>
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-white">{alert.title}</h2>
                        <p className="mt-2 text-gray-200 whitespace-pre-line">{alert.message}</p>
                        <p className="mt-3 text-xs text-gray-400">
                          Publicată: {formatDate(alert.createdAt)}
                          {alert.expiresAt ? ` · valabilă până la ${formatDate(alert.expiresAt)}` : ''}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {pastAlerts.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Alerte încheiate
                </h2>
                <div className="space-y-2">
                  {pastAlerts.slice(0, 10).map((alert) => {
                    const config = ALERT_TYPE_CONFIG[alert.type] || ALERT_TYPE_CONFIG.altele;
                    return (
                      <Card key={alert.id} className="bg-slate-800/60 border-slate-700">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-300">
                                {config.icon} {alert.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{formatDate(alert.createdAt)}</p>
                            </div>
                            <Badge className="bg-slate-700 text-gray-300 shrink-0">Încheiată</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
