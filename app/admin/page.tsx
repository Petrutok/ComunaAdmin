'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  Bell,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Mail,
  Loader2,
  RefreshCw,
  CalendarClock,
  CalendarX,
  Siren,
  BarChart3,
  BookOpen,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { db, COLLECTIONS } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { RegistraturaEmail } from '@/types/registratura';
import { SERVICE_CONFIG, AppointmentService } from '@/types/appointments';

interface ActivityItem {
  id: string;
  kind: 'cerere' | 'problema';
  title: string;
  numarInregistrare?: string;
  author: string;
  status: string;
  createdAt: Date;
  href: string;
}

interface OverdueEntry {
  id: string;
  numarInregistrare: string;
  continut: string;
  emitent: string;
  termen: Date;
}

interface TodayAppointment {
  id: string;
  time: string;
  nume: string;
  service: string;
}

interface DashboardStats {
  cereriNoi: number;
  cereriInLucru: number;
  problemeDeschise: number;
  termeneDepasite: number;
  programariAzi: number;
}

// Statuses on cereri/probleme rendered in the activity feed
const ACTIVITY_STATUS: Record<string, { label: string; className: string }> = {
  noua: { label: 'Nou', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  in_lucru: { label: 'În lucru', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  necesita_completare: { label: 'Necesită completare', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  prelungit: { label: 'Prelungit', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  redirectionat: { label: 'Redirecționată', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  rezolvat: { label: 'Rezolvat', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rezolvata: { label: 'Rezolvată', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  respins: { label: 'Respins', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  clasat: { label: 'Clasată', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
};

const tipuriCereri: Record<string, string> = {
  'cerere-generala': 'Cerere generală',
  'autorizatie-construire': 'Autorizație construire',
  'certificat-urbanism': 'Certificat urbanism',
  'lemne-foc': 'Cerere lemne foc',
  'indemnizatie-copil': 'Indemnizație copil',
  'consiliere': 'Consiliere socială',
  'alocatie-copii': 'Alocație copii',
  'adeverinta-rol': 'Adeverință rol',
  'apia-pf': 'APIA persoană fizică',
  'apia-pj': 'APIA persoană juridică',
  'certificat-fiscal-pf': 'Certificat fiscal PF',
  'certificat-fiscal-pj': 'Certificat fiscal PJ',
  'radiere-auto': 'Radiere auto',
  'act-identitate': 'Act identitate',
  'certificat-nastere': 'Certificat naștere',
};

function getTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'acum câteva secunde';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `acum ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  const days = Math.floor(hours / 24);
  return `acum ${days} ${days === 1 ? 'zi' : 'zile'}`;
}

// Local YYYY-MM-DD (appointments store local date parts, never UTC)
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminDashboard() {
  const { isAdmin, isEmployee, userId } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [overdue, setOverdue] = useState<OverdueEntry[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAssignedEmails, setMyAssignedEmails] = useState<RegistraturaEmail[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    // Every block is best-effort: one failing collection must not blank the page
    const safeCount = async (q: ReturnType<typeof query>) => {
      try {
        return (await getCountFromServer(q)).data().count;
      } catch {
        return 0;
      }
    };

    const cereriCol = collection(db, 'form_submissions');
    const issuesCol = collection(db, 'reported_issues');

    const [cereriNoi, cereriInLucru, problemeNoi, problemeInLucru] = await Promise.all([
      safeCount(query(cereriCol, where('status', '==', 'noua'))),
      safeCount(query(cereriCol, where('status', '==', 'in_lucru'))),
      safeCount(query(issuesCol, where('status', '==', 'noua'))),
      safeCount(query(issuesCol, where('status', '==', 'in_lucru'))),
    ]);

    // Overdue registry deadlines (OG 27/2002) - range on a single field,
    // finalized entries filtered client-side to avoid a composite index
    let overdueEntries: OverdueEntry[] = [];
    try {
      const snap = await getDocs(
        query(
          collection(db, 'registru_general'),
          where('termen', '<', Timestamp.now()),
          orderBy('termen', 'asc'),
          limit(50)
        )
      );
      overdueEntries = snap.docs
        .filter((d) => d.data().status !== 'finalizat')
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            numarInregistrare: data.numarInregistrare || '—',
            continut: data.continut || '',
            emitent: data.emitent || '',
            termen: data.termen?.toDate?.() || new Date(),
          };
        });
    } catch (error) {
      console.error('Error loading overdue registry entries:', error);
    }

    // Today's confirmed appointments
    let appointments: TodayAppointment[] = [];
    try {
      const snap = await getDocs(
        query(collection(db, 'appointments'), where('date', '==', todayLocalISO()))
      );
      appointments = snap.docs
        .filter((d) => d.data().status === 'confirmata')
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            time: data.time || '',
            nume: data.nume || '',
            service: SERVICE_CONFIG[data.service as AppointmentService]?.label || data.service || '',
          };
        })
        .sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error loading today appointments:', error);
    }

    // Recent activity: latest cereri + probleme, merged, real statuses
    const items: ActivityItem[] = [];
    try {
      const snap = await getDocs(query(cereriCol, orderBy('createdAt', 'desc'), limit(6)));
      snap.docs.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          kind: 'cerere',
          title: tipuriCereri[data.tipCerere] || data.tipCerere || 'Cerere',
          numarInregistrare: data.numarInregistrare,
          author: data.numeComplet || 'Cetățean',
          status: data.status || 'noua',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          href: '/admin/cereri',
        });
      });
    } catch (error) {
      console.error('Error loading recent cereri:', error);
    }
    try {
      const snap = await getDocs(query(issuesCol, orderBy('createdAt', 'desc'), limit(6)));
      snap.docs.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          kind: 'problema',
          title: data.title || 'Problemă raportată',
          author: data.reporterName || 'Cetățean',
          status: data.status || 'noua',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          href: '/admin/issues',
        });
      });
    } catch (error) {
      console.error('Error loading recent issues:', error);
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setStats({
      cereriNoi,
      cereriInLucru,
      problemeDeschise: problemeNoi + problemeInLucru,
      termeneDepasite: overdueEntries.length,
      programariAzi: appointments.length,
    });
    setOverdue(overdueEntries.slice(0, 5));
    setTodayAppointments(appointments.slice(0, 5));
    setActivity(items.slice(0, 8));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isEmployee) {
      loadDashboard();
    }
  }, [isEmployee, loadDashboard]);

  // Employee view: their assigned registratura documents
  useEffect(() => {
    if (isEmployee && userId) {
      loadMyAssignedEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, userId]);

  const loadMyAssignedEmails = async () => {
    if (!userId) return;
    try {
      const emailsQuery = query(
        collection(db, COLLECTIONS.REGISTRATURA_EMAILS),
        where('assignedToUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(emailsQuery);
      setMyAssignedEmails(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as RegistraturaEmail[]
      );
    } catch (error) {
      console.error('Error loading assigned emails:', error);
    }
  };

  const todayLabel = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ---------- Employee dashboard ----------
  if (isEmployee) {
    const myNewEmails = myAssignedEmails.filter((e) => e.status === 'nou');
    const myInProgressEmails = myAssignedEmails.filter((e) => e.status === 'in_lucru');
    const myResolvedEmails = myAssignedEmails.filter((e) => e.status === 'rezolvat');

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Lucrările mele</h1>
            <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: myNewEmails.length, label: 'Noi', icon: Mail, iconClass: 'bg-blue-500/15 text-blue-400' },
            { value: myInProgressEmails.length, label: 'În lucru', icon: Clock, iconClass: 'bg-amber-500/15 text-amber-400' },
            { value: myResolvedEmails.length, label: 'Rezolvate', icon: CheckCircle, iconClass: 'bg-emerald-500/15 text-emerald-400' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-800/60 border-slate-700/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${stat.iconClass}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/60 border-slate-700/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base">Documente atribuite mie</CardTitle>
                <CardDescription className="text-gray-400">
                  Toate documentele pe care trebuie să le procesez
                </CardDescription>
              </div>
              <Link href="/admin/registratura">
                <Button variant="outline" size="sm" className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white">
                  Registratură
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {myAssignedEmails.length === 0 ? (
              <div className="text-center py-10">
                <Inbox className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Nu ai documente atribuite</p>
                <p className="text-gray-500 text-sm mt-1">Documentele tale vor apărea aici</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/60">
                {myAssignedEmails.map((email) => (
                  <Link key={email.id} href="/admin/registratura" className="block">
                    <div className="flex items-center justify-between gap-4 py-3 px-2 -mx-2 rounded-md hover:bg-slate-700/40 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">
                            {email.subject || 'Fără subiect'}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${
                              email.status === 'nou'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : email.status === 'in_lucru'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : email.status === 'rezolvat'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                            }`}
                          >
                            {email.status === 'nou'
                              ? 'Nou'
                              : email.status === 'in_lucru'
                              ? 'În lucru'
                              : email.status === 'rezolvat'
                              ? 'Rezolvat'
                              : 'Respins'}
                          </Badge>
                          {email.priority === 'urgent' && (
                            <Badge variant="outline" className="text-xs shrink-0 bg-rose-500/15 text-rose-300 border-rose-500/30">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {email.numarInregistrare} · {email.from}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Admin dashboard ----------
  const kpis = stats
    ? [
        {
          value: stats.cereriNoi,
          label: 'Cereri noi',
          sub: 'așteaptă preluare',
          icon: FileText,
          iconClass: 'bg-blue-500/15 text-blue-400',
          href: '/admin/cereri',
          alert: false,
        },
        {
          value: stats.cereriInLucru,
          label: 'Cereri în lucru',
          sub: 'în procesare',
          icon: Clock,
          iconClass: 'bg-amber-500/15 text-amber-400',
          href: '/admin/cereri',
          alert: false,
        },
        {
          value: stats.problemeDeschise,
          label: 'Probleme deschise',
          sub: 'sesizări nerezolvate',
          icon: AlertTriangle,
          iconClass: 'bg-orange-500/15 text-orange-400',
          href: '/admin/issues',
          alert: false,
        },
        {
          value: stats.termeneDepasite,
          label: 'Termene depășite',
          sub: 'OG 27/2002',
          icon: CalendarX,
          iconClass: 'bg-rose-500/15 text-rose-400',
          href: '/admin/registru',
          alert: stats.termeneDepasite > 0,
        },
        {
          value: stats.programariAzi,
          label: 'Programări azi',
          sub: 'la ghișee',
          icon: CalendarClock,
          iconClass: 'bg-emerald-500/15 text-emerald-400',
          href: '/admin/programari',
          alert: false,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Control Center</h1>
          <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <Button
          onClick={loadDashboard}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Reîncarcă
        </Button>
      </div>

      {/* Deadline alert */}
      {!loading && stats && stats.termeneDepasite > 0 && (
        <Link href="/admin/registru" className="block">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-rose-500/15 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-200">
                <span className="font-semibold">{stats.termeneDepasite}</span>{' '}
                {stats.termeneDepasite === 1
                  ? 'document are termenul legal de răspuns depășit'
                  : 'documente au termenul legal de răspuns depășit'}{' '}
                (OG 27/2002)
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-rose-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-slate-800/60 border-slate-700/60">
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded bg-slate-700/40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="block group">
              <Card
                className={`h-full transition-colors ${
                  kpi.alert
                    ? 'bg-rose-500/10 border-rose-500/40 hover:border-rose-400/60'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-500/80'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`rounded-lg p-2 ${kpi.iconClass}`}>
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${kpi.alert ? 'text-rose-300' : 'text-white'}`}>
                    {kpi.value}
                  </p>
                  <p className="text-sm font-medium text-gray-300 leading-tight">{kpi.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{kpi.sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Main grid: activity + attention panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="bg-slate-800/60 border-slate-700/60 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-400" />
                  Activitate recentă
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Ultimele cereri și sesizări primite
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="h-10 w-10 text-emerald-500/50 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Nicio activitate recentă</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/60">
                {activity.map((item) => {
                  const status = ACTIVITY_STATUS[item.status] || {
                    label: item.status,
                    className: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
                  };
                  return (
                    <Link key={`${item.kind}-${item.id}`} href={item.href} className="block">
                      <div className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-slate-700/40 transition-colors cursor-pointer">
                        <div
                          className={`rounded-md p-1.5 shrink-0 ${
                            item.kind === 'cerere'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-orange-500/15 text-orange-400'
                          }`}
                        >
                          {item.kind === 'cerere' ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {item.numarInregistrare && (
                              <span className="font-mono text-xs text-emerald-400 shrink-0">
                                {item.numarInregistrare}
                              </span>
                            )}
                            <p className="text-sm font-medium text-white truncate">{item.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {item.author} · {getTimeAgo(item.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${status.className}`}>
                          {status.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention panel */}
        <div className="space-y-6">
          <Card className="bg-slate-800/60 border-slate-700/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <CalendarX className="h-4 w-4 text-rose-400" />
                  Termene depășite
                </CardTitle>
                <Link href="/admin/registru" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Registru →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-16 animate-pulse rounded bg-slate-700/40" />
              ) : overdue.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  Niciun termen depășit. Toate documentele sunt în termen. ✓
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overdue.map((entry) => (
                    <Link key={entry.id} href="/admin/registru" className="block">
                      <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 hover:bg-rose-500/10 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-rose-300">{entry.numarInregistrare}</span>
                          <span className="text-xs text-rose-400/80 shrink-0">
                            {entry.termen.toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {entry.continut || entry.emitent}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-emerald-400" />
                  Programări astăzi
                </CardTitle>
                <Link href="/admin/programari" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Toate →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-16 animate-pulse rounded bg-slate-700/40" />
              ) : todayAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">Nicio programare pentru astăzi.</p>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 shrink-0">
                        {appt.time}
                      </span>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{appt.nume}</p>
                        <p className="text-xs text-gray-500 truncate">{appt.service}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/admin/send-notification', label: 'Trimite notificare', sub: 'Push către cetățeni', icon: Bell, iconClass: 'bg-amber-500/15 text-amber-400' },
          { href: '/admin/alerte', label: 'Publică alertă', sub: 'Situații urgente', icon: Siren, iconClass: 'bg-rose-500/15 text-rose-400' },
          { href: '/admin/registru', label: 'Registru general', sub: 'Evidența documentelor', icon: BookOpen, iconClass: 'bg-purple-500/15 text-purple-400' },
          { href: '/admin/statistici', label: 'Statistici', sub: 'Rapoarte și indicatori', icon: BarChart3, iconClass: 'bg-blue-500/15 text-blue-400' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="block group">
            <Card className="bg-slate-800/60 border-slate-700/60 hover:border-slate-500/80 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 shrink-0 ${action.iconClass}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{action.label}</p>
                  <p className="text-xs text-gray-500 truncate">{action.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors ml-auto shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
