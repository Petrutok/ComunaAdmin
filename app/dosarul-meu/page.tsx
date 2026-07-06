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
} from 'lucide-react';

interface MyCerere {
  id: string;
  tipCerere: string;
  scopulCererii?: string;
  numarInregistrare?: string;
  status: string;
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

// Shared status rendering for both cereri and sesizari
// (cereri: noua/in_lucru/rezolvat/respins; issues: noua/in_lucru/rezolvata)
const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  noua: { label: 'În așteptare', className: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: Clock },
  in_lucru: { label: 'În lucru', className: 'bg-amber-500/20 text-amber-300 border-amber-400/30', icon: Hammer },
  rezolvat: { label: 'Rezolvată', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', icon: CheckCircle },
  rezolvata: { label: 'Rezolvată', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', icon: CheckCircle },
  respins: { label: 'Respinsă', className: 'bg-red-500/20 text-red-300 border-red-400/30', icon: XCircle },
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

export default function DosarulMeuPage() {
  const { user, loading: authLoading } = useCitizenAuth();
  const router = useRouter();
  const [cereri, setCereri] = useState<MyCerere[]>([]);
  const [issues, setIssues] = useState<MyIssue[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/cont');
      return;
    }

    const load = async () => {
      try {
        // No orderBy: avoids needing composite indexes; sorted client-side
        const [cereriSnap, issuesSnap] = await Promise.all([
          getDocs(query(collection(db, 'form_submissions'), where('citizenUid', '==', user.uid))),
          getDocs(query(collection(db, 'reported_issues'), where('citizenUid', '==', user.uid))),
        ]);

        const byDateDesc = (a: { createdAt?: Timestamp }, b: { createdAt?: Timestamp }) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);

        setCereri(
          cereriSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MyCerere)).sort(byDateDesc)
        );
        setIssues(
          issuesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MyIssue)).sort(byDateDesc)
        );
      } catch (error) {
        console.error('[DosarulMeu] Failed to load data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [user, authLoading, router]);

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
            <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
              <TabsTrigger value="cereri" className="data-[state=active]:bg-slate-700 text-base py-2.5">
                <FileText className="mr-2 h-4 w-4" />
                Cereri ({cereri.length})
              </TabsTrigger>
              <TabsTrigger value="sesizari" className="data-[state=active]:bg-slate-700 text-base py-2.5">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Sesizări ({issues.length})
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
          </Tabs>
        )}
      </div>
    </div>
  );
}
