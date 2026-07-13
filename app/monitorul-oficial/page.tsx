'use client';

// Monitorul Oficial Local - the public register of local administrative
// acts, mandated by art. 197-200 + Anexa 1 din OUG 57/2019 (Codul
// administrativ). Anyone can read and download the published documents.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { MOL_CATEGORII, MolCategorie, MolDocument } from '@/types/mol';
import { TENANT } from '@/lib/tenant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, Download, Home, FileText } from 'lucide-react';

export default function MonitorulOficialPage() {
  const [documente, setDocumente] = useState<MolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [anSelectat, setAnSelectat] = useState<number | 'toate'>('toate');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Single equality filter: no composite index needed; sorting is
        // done client-side (volumes are small - hundreds of acts/year)
        const snap = await getDocs(
          query(collection(db, 'mol_documente'), where('activ', '==', true))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MolDocument);
        data.sort((a, b) => (b.publicatLa?.toMillis?.() || 0) - (a.publicatLa?.toMillis?.() || 0));
        setDocumente(data);
      } catch (error) {
        console.error('Error loading MOL:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ani = useMemo(
    () => Array.from(new Set(documente.map((d) => d.an))).sort((a, b) => b - a),
    [documente]
  );

  const filtrate = useMemo(
    () => (anSelectat === 'toate' ? documente : documente.filter((d) => d.an === anSelectat)),
    [documente, anSelectat]
  );

  const handleDownload = async (documentMol: MolDocument) => {
    if (!documentMol.fisier?.storagePath) return;
    setDownloading(documentMol.id);
    try {
      const url = await getDownloadURL(ref(storage, documentMol.fisier.storagePath));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading MOL document:', error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-5 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white">
              <Home className="h-4 w-4 mr-2" />
              Acasă
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/15 rounded-xl p-3 border border-amber-500/20">
              <BookOpen className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Monitorul Oficial Local</h1>
              <p className="text-gray-400 text-sm mt-1">
                {TENANT.numeComuna} — actele administrative publicate conform art. 197–200 din
                Codul administrativ (OUG 57/2019)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Year filter */}
        {ani.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAnSelectat('toate')}
              className={`h-8 shrink-0 text-xs ${
                anSelectat === 'toate'
                  ? 'bg-amber-600 text-white border-amber-500 hover:bg-amber-600 hover:text-white'
                  : 'bg-slate-800/60 border-slate-600 text-gray-300 hover:bg-slate-700'
              }`}
            >
              Toți anii
            </Button>
            {ani.map((an) => (
              <Button
                key={an}
                size="sm"
                variant="outline"
                onClick={() => setAnSelectat(an)}
                className={`h-8 shrink-0 text-xs ${
                  anSelectat === an
                    ? 'bg-amber-600 text-white border-amber-500 hover:bg-amber-600 hover:text-white'
                    : 'bg-slate-800/60 border-slate-600 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {an}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          /* The six legal sections, in the order from Anexa 1 */
          (Object.keys(MOL_CATEGORII) as MolCategorie[]).map((categorie) => {
            const docsSectiune = filtrate.filter((d) => d.categorie === categorie);
            return (
              <Card key={categorie} className="bg-slate-800/60 border-slate-700/60">
                <CardContent className="p-5">
                  <h2 className="text-white font-semibold">{MOL_CATEGORII[categorie].label}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3">
                    {MOL_CATEGORII[categorie].descriere}
                  </p>
                  {docsSectiune.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">
                      Niciun document publicat{anSelectat !== 'toate' ? ` în ${anSelectat}` : ''}.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-700/60">
                      {docsSectiune.map((documentMol) => (
                        <div
                          key={documentMol.id}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1 flex items-start gap-2">
                            <FileText className="h-4 w-4 text-amber-400/70 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-200">
                                {documentMol.numar ? `Nr. ${documentMol.numar} — ` : ''}
                                {documentMol.titlu}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {documentMol.dataAct
                                  ? `din ${new Date(documentMol.dataAct).toLocaleDateString('ro-RO')}`
                                  : documentMol.an}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(documentMol)}
                            disabled={downloading === documentMol.id}
                            className="shrink-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/15 h-8"
                          >
                            {downloading === documentMol.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        <p className="text-xs text-gray-600 text-center pt-2">
          Documentele sunt publicate în format PDF de {TENANT.numePrimarie}. Pentru informații
          suplimentare: {TENANT.email} · {TENANT.telefon}
        </p>
      </main>
    </div>
  );
}
