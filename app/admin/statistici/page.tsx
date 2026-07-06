"use client";

// Decision dashboard for the mayor: everything the app collects,
// aggregated into actionable numbers. Client-side aggregation is fine at
// commune scale (hundreds of documents, not millions).

import { useEffect, useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, Download, AlertTriangle, FileText, Bell, CalendarClock, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Stats {
  issues: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionDays: number | null;
    byType: { name: string; count: number }[];
  };
  cereri: {
    total: number;
    open: number;
    resolved: number;
    adeverinteEmise: number;
    byStatus: { name: string; value: number }[];
    topTipuri: { name: string; count: number }[];
  };
  registru: {
    lunaAceasta: number;
    intrari: number;
    iesiri: number;
    depasite: number;
  };
  comunicare: {
    abonatiPush: number;
    conturiCetateni: number;
    programariViitoare: number;
  };
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  infrastructura: 'Infrastructură',
  iluminat: 'Iluminat',
  gunoi: 'Salubritate',
  vandalism: 'Vandalism',
  general: 'General',
  altele: 'Altele',
};

const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export default function StatisticiPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [issuesSnap, cereriSnap, registruSnap, pushSnap, citizensSnap, apptSnap] =
          await Promise.all([
            getDocs(collection(db, 'reported_issues')),
            getDocs(collection(db, 'form_submissions')),
            getDocs(collection(db, 'registru_general')),
            getDocs(collection(db, 'push_subscriptions')),
            getDocs(collection(db, 'citizens')),
            getDocs(collection(db, 'appointments')),
          ]);

        // --- Sesizari
        const issues = issuesSnap.docs.map((d) => d.data());
        const resolvedIssues = issues.filter((i) => i.status === 'rezolvata');
        const resolutionTimes = resolvedIssues
          .filter((i) => i.resolvedAt && i.createdAt)
          .map((i) => {
            const resolved = i.resolvedAt instanceof Timestamp ? i.resolvedAt.toMillis() : new Date(i.resolvedAt.seconds * 1000).getTime();
            const created = i.createdAt instanceof Timestamp ? i.createdAt.toMillis() : new Date(i.createdAt.seconds * 1000).getTime();
            return (resolved - created) / (1000 * 60 * 60 * 24);
          })
          .filter((days) => days >= 0);

        const typeCounts: Record<string, number> = {};
        issues.forEach((i) => {
          const t = ISSUE_TYPE_LABELS[i.type] || i.type || 'Altele';
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });

        // --- Cereri
        const cereri = cereriSnap.docs.map((d) => d.data());
        const cereriStatusCounts: Record<string, number> = {};
        const tipCounts: Record<string, number> = {};
        cereri.forEach((c) => {
          const statusLabel =
            c.status === 'noua' ? 'În așteptare' :
            c.status === 'in_lucru' ? 'În lucru' :
            c.status === 'rezolvat' ? 'Rezolvate' : 'Respinse';
          cereriStatusCounts[statusLabel] = (cereriStatusCounts[statusLabel] || 0) + 1;
          tipCounts[c.tipCerere] = (tipCounts[c.tipCerere] || 0) + 1;
        });

        // --- Registru
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const registru = registruSnap.docs.map((d) => d.data());
        const registruLuna = registru.filter(
          (r) => r.createdAt?.toMillis?.() >= monthStart
        );
        const depasite = registru.filter(
          (r) =>
            r.status !== 'finalizat' &&
            r.termen?.toMillis &&
            r.termen.toMillis() < Date.now()
        ).length;

        // --- Programari viitoare
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcoming = apptSnap.docs.filter(
          (d) => d.data().status === 'confirmata' && d.data().date >= todayStr
        ).length;

        setStats({
          issues: {
            total: issues.length,
            open: issues.filter((i) => i.status !== 'rezolvata').length,
            resolved: resolvedIssues.length,
            avgResolutionDays: resolutionTimes.length
              ? Math.round((resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) * 10) / 10
              : null,
            byType: Object.entries(typeCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count),
          },
          cereri: {
            total: cereri.length,
            open: cereri.filter((c) => c.status === 'noua' || c.status === 'in_lucru').length,
            resolved: cereri.filter((c) => c.status === 'rezolvat').length,
            adeverinteEmise: cereri.filter((c) => c.adeverinta?.downloadURL).length,
            byStatus: Object.entries(cereriStatusCounts).map(([name, value]) => ({ name, value })),
            topTipuri: Object.entries(tipCounts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5),
          },
          registru: {
            lunaAceasta: registruLuna.length,
            intrari: registru.filter((r) => (r.directie || 'intrare') === 'intrare').length,
            iesiri: registru.filter((r) => r.directie === 'iesire').length,
            depasite,
          },
          comunicare: {
            abonatiPush: pushSnap.size,
            conturiCetateni: citizensSnap.size,
            programariViitoare: upcoming,
          },
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const downloadReport = async () => {
    if (!stats) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const strip = (s: string) =>
      s.replace(/[ăâ]/g, 'a').replace(/î/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
       .replace(/[ĂÂ]/g, 'A').replace(/Î/g, 'I').replace(/[ȘŞ]/g, 'S').replace(/[ȚŢ]/g, 'T');
    let y = 20;
    const line = (text: string, size = 11, bold = false) => {
      pdf.setFontSize(size);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.text(strip(text), 20, y);
      y += size * 0.6;
    };

    line('RAPORT DE ACTIVITATE - PRIMARIA DIGITALA', 15, true);
    line(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }), 10);
    y += 6;
    line('SESIZARI', 13, true);
    line(`Total: ${stats.issues.total} | Deschise: ${stats.issues.open} | Rezolvate: ${stats.issues.resolved}`);
    if (stats.issues.avgResolutionDays !== null) {
      line(`Timp mediu de rezolvare: ${stats.issues.avgResolutionDays} zile`);
    }
    stats.issues.byType.forEach((t) => line(`  - ${t.name}: ${t.count}`));
    y += 5;
    line('CERERI SI ADEVERINTE', 13, true);
    line(`Total cereri: ${stats.cereri.total} | In lucru: ${stats.cereri.open} | Rezolvate: ${stats.cereri.resolved}`);
    line(`Adeverinte emise digital: ${stats.cereri.adeverinteEmise}`);
    stats.cereri.topTipuri.forEach((t) => line(`  - ${t.name}: ${t.count}`));
    y += 5;
    line('REGISTRU GENERAL', 13, true);
    line(`Documente luna aceasta: ${stats.registru.lunaAceasta} | Intrari: ${stats.registru.intrari} | Iesiri: ${stats.registru.iesiri}`);
    line(`Termene legale depasite: ${stats.registru.depasite}`);
    y += 5;
    line('COMUNICARE CU CETATENII', 13, true);
    line(`Conturi de cetateni: ${stats.comunicare.conturiCetateni} | Abonati notificari: ${stats.comunicare.abonatiPush}`);
    line(`Programari viitoare: ${stats.comunicare.programariViitoare}`);

    pdf.save(`raport-activitate-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!stats) {
    return <p className="text-center text-gray-400 py-16">Nu s-au putut încărca statisticile.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-500/20 rounded-xl">
            <BarChart3 className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Statistici</h1>
            <p className="text-gray-400 text-sm">Imaginea de ansamblu a activității din aplicație</p>
          </div>
        </div>
        <Button onClick={downloadReport} className="bg-violet-600 hover:bg-violet-700">
          <Download className="mr-2 h-4 w-4" /> Raport PDF
        </Button>
      </div>

      {/* Alert cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={`border ${stats.registru.depasite > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className={`h-8 w-8 ${stats.registru.depasite > 0 ? 'text-red-400' : 'text-gray-500'}`} />
              <div>
                <p className="text-3xl font-bold text-white">{stats.registru.depasite}</p>
                <p className="text-sm text-gray-400">Termene depășite</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats.issues.open}</p>
                <p className="text-sm text-gray-400">Sesizări deschise</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats.cereri.open}</p>
                <p className="text-sm text-gray-400">Cereri în lucru</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-3xl font-bold text-white">{stats.comunicare.programariViitoare}</p>
                <p className="text-sm text-gray-400">Programări viitoare</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Sesizări pe categorii</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.issues.byType.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nicio sesizare încă.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.issues.byType}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" name="Sesizări" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {stats.issues.avgResolutionDays !== null && (
              <p className="text-sm text-gray-400 text-center mt-2">
                Timp mediu de rezolvare: <span className="text-white font-semibold">{stats.issues.avgResolutionDays} zile</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Cereri pe status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.cereri.byStatus.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nicio cerere încă.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.cereri.byStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.cereri.byStatus.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail rows */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Cele mai cerute servicii</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.cereri.topTipuri.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2.5">
                <span className="text-gray-200 text-sm truncate">{t.name}</span>
                <span className="text-white font-bold">{t.count}</span>
              </div>
            ))}
            <p className="text-xs text-gray-500 pt-1">
              Adeverințe emise digital: <span className="text-emerald-400 font-semibold">{stats.cereri.adeverinteEmise}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" /> Comunicare cu cetățenii
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2.5">
              <span className="text-gray-200 text-sm">Conturi de cetățeni</span>
              <span className="text-white font-bold">{stats.comunicare.conturiCetateni}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2.5">
              <span className="text-gray-200 text-sm">Abonați la notificări push</span>
              <span className="text-white font-bold">{stats.comunicare.abonatiPush}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2.5">
              <span className="text-gray-200 text-sm">Documente în registru luna aceasta</span>
              <span className="text-white font-bold">{stats.registru.lunaAceasta}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2.5">
              <span className="text-gray-200 text-sm">Intrări / ieșiri în registru (total)</span>
              <span className="text-white font-bold">{stats.registru.intrari} / {stats.registru.iesiri}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
