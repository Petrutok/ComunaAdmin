"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  FolderOpen,
  FileText,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Hammer,
  CalendarClock,
  FilePlus,
  CornerUpRight,
  Archive,
  Upload,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_CONFIG, AppointmentService } from '@/types/appointments';
import { Input } from '@/components/ui/input';
import {
  MAX_ATTACHMENT_FILES,
  MAX_TOTAL_FILE_BYTES,
  processSelectedFiles,
  totalSize,
  fileToBase64,
} from '@/lib/utils/client-files';

interface MyCerere {
  id: string;
  tipCerere: string;
  scopulCererii?: string;
  numarInregistrare?: string;
  adeverinta?: {
    numarIesire: string;
    downloadURL: string;
  };
  raspuns?: {
    numarIesire: string;
    downloadURL: string;
  };
  status: string;
  observatii?: string;
  redirectionatCatre?: string;
  createdAt?: Timestamp;
}

interface MyIssue {
  id: string;
  title: string;
  type?: string;
  location?: string;
  reportId?: string;
  status: string;
  createdAt?: Timestamp;
}

interface MyAppointment {
  id: string;
  service: AppointmentService;
  date: string;
  time: string;
  status: string;
  motiv?: string;
  createdAt?: Timestamp;
}

// Shared status rendering for both cereri and sesizari
// (cereri: noua/in_lucru/rezolvat/respins; issues: noua/in_lucru/rezolvata)
const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  noua: { label: 'În așteptare', className: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: Clock },
  in_lucru: { label: 'În lucru', className: 'bg-amber-500/20 text-amber-300 border-amber-400/30', icon: Hammer },
  necesita_completare: { label: 'Necesită completare', className: 'bg-orange-500/20 text-orange-300 border-orange-400/30', icon: FilePlus },
  prelungit: { label: 'Termen prelungit', className: 'bg-purple-500/20 text-purple-300 border-purple-400/30', icon: CalendarClock },
  redirectionat: { label: 'Redirecționată', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30', icon: CornerUpRight },
  rezolvat: { label: 'Rezolvată', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', icon: CheckCircle },
  rezolvata: { label: 'Rezolvată', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', icon: CheckCircle },
  respins: { label: 'Respinsă', className: 'bg-red-500/20 text-red-300 border-red-400/30', icon: XCircle },
  clasat: { label: 'Clasată', className: 'bg-gray-500/20 text-gray-300 border-gray-400/30', icon: Archive },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] || STATUS_BADGE['noua'];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-medium ${config.className}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}

function formatDate(ts?: Timestamp): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

// Upload box shown on a cerere marked "necesita_completare": the citizen
// sends the missing documents and the cerere goes back to processing
// (the legal deadline restarts server-side).
function CompletareUpload({ cerereId, onDone }: { cerereId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > MAX_ATTACHMENT_FILES) {
      toast({
        title: 'Prea multe fișiere',
        description: `Poți încărca maxim ${MAX_ATTACHMENT_FILES} fișiere`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    const processed = await processSelectedFiles(selected);
    if (totalSize(processed) > MAX_TOTAL_FILE_BYTES) {
      toast({
        title: 'Fișiere prea mari',
        description: 'Fișierele depășesc limita totală de 3MB. Încearcă fișiere mai mici sau mai puține.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    setFiles(processed);
  };

  const handleSend = async () => {
    if (files.length === 0) return;
    setSending(true);
    try {
      const fisiere = [];
      for (const f of files) {
        fisiere.push({ name: f.name, type: f.type, size: f.size, content: await fileToBase64(f) });
      }
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/completeaza-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ cerereId, fisiere }),
      });
      const result = await response.json().catch(() => ({ success: false }));
      if (!result.success) {
        throw new Error(result.error || 'Trimiterea documentelor a eșuat');
      }
      toast({
        title: 'Documente trimise',
        description: 'Cererea a revenit în lucru la primărie.',
      });
      setFiles([]);
      onDone();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Nu s-au putut trimite documentele',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleSelect}
        className="bg-slate-900 border-slate-600 text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
      />
      <p className="text-xs text-gray-400">
        Maxim {MAX_ATTACHMENT_FILES} fișiere, în total maxim 3MB (pozele mari sunt comprimate automat).
      </p>
      {files.length > 0 && (
        <ul className="text-sm text-gray-300 space-y-1">
          {files.map((f, i) => (
            <li key={i}>
              📎 {f.name} <span className="text-gray-500">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
            </li>
          ))}
        </ul>
      )}
      <Button
        onClick={handleSend}
        disabled={sending || files.length === 0}
        className="w-full bg-orange-600 hover:bg-orange-700"
      >
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Trimite documentele
      </Button>
    </div>
  );
}

export default function DosarulMeuPage() {
  const { user, loading: authLoading } = useCitizenAuth();
  const router = useRouter();
  const [cereri, setCereri] = useState<MyCerere[]>([]);
  const [issues, setIssues] = useState<MyIssue[]>([]);
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/cont');
      return;
    }

    const load = async () => {
      try {
        // No orderBy: avoids needing composite indexes; sorted client-side
        const [cereriSnap, issuesSnap, appointmentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'form_submissions'), where('citizenUid', '==', user.uid))),
          getDocs(query(collection(db, 'reported_issues'), where('citizenUid', '==', user.uid))),
          getDocs(query(collection(db, 'appointments'), where('citizenUid', '==', user.uid))),
        ]);

        const byDateDesc = (a: { createdAt?: Timestamp }, b: { createdAt?: Timestamp }) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);

        setCereri(
          cereriSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MyCerere)).sort(byDateDesc)
        );
        setIssues(
          issuesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MyIssue)).sort(byDateDesc)
        );
        setAppointments(
          appointmentsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as MyAppointment))
            .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        );
      } catch (error) {
        console.error('[DosarulMeu] Failed to load data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [user, authLoading, router, reloadKey]);

  if (authLoading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

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
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-xl mb-4">
            <FolderOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Dosarul meu</h1>
          <p className="text-gray-400 mt-2">
            Cererile și sesizările tale, cu stadiul lor la primărie
          </p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs defaultValue="cereri">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-slate-800 border border-slate-700 p-1">
              <TabsTrigger
                value="cereri"
                className="rounded-md py-2.5 text-sm sm:text-base text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Cereri ({cereri.length})
              </TabsTrigger>
              <TabsTrigger
                value="sesizari"
                className="rounded-md py-2.5 text-sm sm:text-base text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Sesizări ({issues.length})
              </TabsTrigger>
              <TabsTrigger
                value="programari"
                className="rounded-md py-2.5 text-sm sm:text-base text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                <CalendarClock className="mr-1.5 h-4 w-4" />
                Programări ({appointments.filter((a) => a.status === 'confirmata').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cereri" className="mt-4 space-y-3">
              {cereri.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-10 text-center space-y-4">
                    <p className="text-gray-400">
                      Nu ai nicio cerere trimisă de pe acest cont.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Cererile trimise cât ești conectat apar automat aici.
                    </p>
                    <Button onClick={() => router.push('/cereri-online')} className="bg-blue-600 hover:bg-blue-700">
                      Trimite o cerere
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                cereri.map((cerere) => (
                  <Card key={cerere.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          {cerere.numarInregistrare && (
                            <p className="font-mono text-sm text-green-400 mb-1">
                              {cerere.numarInregistrare}
                            </p>
                          )}
                          <h3 className="font-semibold text-white break-words">
                            {cerere.tipCerere}
                          </h3>
                          {cerere.scopulCererii && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{cerere.scopulCererii}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{formatDate(cerere.createdAt)}</p>
                        </div>
                        <StatusBadge status={cerere.status} />
                      </div>
                      {cerere.adeverinta?.downloadURL && (
                        <a
                          href={cerere.adeverinta.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 block"
                        >
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 text-base">
                            📄 Descarcă adeverința ({cerere.adeverinta.numarIesire})
                          </Button>
                        </a>
                      )}
                      {cerere.raspuns?.downloadURL && (
                        <a
                          href={cerere.raspuns.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 block"
                        >
                          <Button className="w-full bg-sky-600 hover:bg-sky-700 py-5 text-base">
                            📄 Descarcă răspunsul oficial ({cerere.raspuns.numarIesire})
                          </Button>
                        </a>
                      )}
                      {cerere.status === 'necesita_completare' && (
                        <div className="mt-4 rounded-md border border-orange-400/30 bg-orange-500/10 p-3 space-y-2">
                          <p className="text-orange-300 text-sm font-semibold">
                            Primăria are nevoie de documente suplimentare pentru această cerere:
                          </p>
                          {cerere.observatii && (
                            <p className="text-orange-200/90 text-sm whitespace-pre-wrap">{cerere.observatii}</p>
                          )}
                          <CompletareUpload cerereId={cerere.id} onDone={() => setReloadKey((k) => k + 1)} />
                        </div>
                      )}
                      {cerere.status === 'redirectionat' && cerere.redirectionatCatre && (
                        <p className="mt-3 text-sm text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 rounded-md p-3">
                          Cererea nu este de competența primăriei și a fost transmisă către:{' '}
                          <span className="font-semibold">{cerere.redirectionatCatre}</span>. Veți primi răspunsul de la această instituție.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sesizari" className="mt-4 space-y-3">
              {issues.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-10 text-center space-y-4">
                    <p className="text-gray-400">
                      Nu ai nicio sesizare trimisă de pe acest cont.
                    </p>
                    <Button onClick={() => router.push('/report-issue')} className="bg-red-600 hover:bg-red-700">
                      Raportează o problemă
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                issues.map((issue) => (
                  <Card key={issue.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          {issue.reportId && (
                            <p className="font-mono text-sm text-green-400 mb-1">{issue.reportId}</p>
                          )}
                          <h3 className="font-semibold text-white break-words">{issue.title}</h3>
                          {issue.location && (
                            <p className="text-sm text-gray-400 mt-1">{issue.location}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{formatDate(issue.createdAt)}</p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="programari" className="mt-4 space-y-3">
              {appointments.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-10 text-center space-y-4">
                    <p className="text-gray-400">Nu ai nicio programare.</p>
                    <Button onClick={() => router.push('/programari')} className="bg-cyan-600 hover:bg-cyan-700">
                      Fă o programare
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                appointments.map((appt) => {
                  const config = SERVICE_CONFIG[appt.service];
                  const isPast = appt.date < new Date().toISOString().slice(0, 10);
                  const isActive = appt.status === 'confirmata' && !isPast;
                  return (
                    <Card key={appt.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white">
                              {config?.icon} {config?.label || appt.service}
                            </h3>
                            <p className="text-lg text-cyan-300 font-medium mt-1">
                              {new Date(`${appt.date}T00:00:00`).toLocaleDateString('ro-RO', {
                                weekday: 'long', day: 'numeric', month: 'long',
                              })}
                              , ora {appt.time}
                            </p>
                            {appt.motiv && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{appt.motiv}</p>
                            )}
                          </div>
                          {isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={cancellingId === appt.id}
                              onClick={async () => {
                                setCancellingId(appt.id);
                                try {
                                  const idToken = await auth.currentUser?.getIdToken();
                                  const response = await fetch('/api/programari', {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                                    },
                                    body: JSON.stringify({ id: appt.id, action: 'cancel' }),
                                  });
                                  const result = await response.json();
                                  if (!result.success) throw new Error(result.error);
                                  setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
                                  toast({ title: 'Programare anulată' });
                                } catch {
                                  toast({ title: 'Eroare', description: 'Anularea a eșuat.', variant: 'destructive' });
                                } finally {
                                  setCancellingId(null);
                                }
                              }}
                              className="border-red-500/40 text-red-300 hover:bg-red-900/20 shrink-0"
                            >
                              {cancellingId === appt.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Anulează'
                              )}
                            </Button>
                          ) : (
                            <StatusBadge status={isPast ? 'rezolvata' : appt.status} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
