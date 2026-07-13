'use client';

// Admin publishing page for Monitorul Oficial Local (OUG 57/2019,
// art. 197-200). Staff upload the signed PDF of each act (hotărâre,
// dispoziție, buget...) into one of the six legal sections; the public
// reads them at /monitorul-oficial.

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
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { MOL_CATEGORII, MolCategorie, MolDocument } from '@/types/mol';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2, Upload, EyeOff, Eye, FileText, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 100;

export default function AdminMonitorulOficialPage() {
  const { user: adminUser } = useAdminAuth();
  const { toast } = useToast();
  const [documente, setDocumente] = useState<MolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Publish form
  const [titlu, setTitlu] = useState('');
  const [categorie, setCategorie] = useState<MolCategorie>('hotarari');
  const [numar, setNumar] = useState('');
  const [dataAct, setDataAct] = useState('');
  const [fisier, setFisier] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'mol_documente'), orderBy('publicatLa', 'desc'), limit(PAGE_SIZE))
      );
      setDocumente(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MolDocument));
    } catch (error) {
      console.error('Error loading MOL documents:', error);
      toast({ title: 'Eroare', description: 'Nu s-au putut încărca documentele', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titlu.trim() || !fisier) {
      toast({
        title: 'Date lipsă',
        description: 'Titlul și fișierul PDF sunt obligatorii',
        variant: 'destructive',
      });
      return;
    }
    if (fisier.type !== 'application/pdf') {
      toast({ title: 'Format greșit', description: 'Documentul trebuie să fie PDF', variant: 'destructive' });
      return;
    }
    if (fisier.size > 20 * 1024 * 1024) {
      toast({ title: 'Fișier prea mare', description: 'Maximum 20MB', variant: 'destructive' });
      return;
    }

    setPublishing(true);
    try {
      const an = dataAct ? new Date(dataAct).getFullYear() : new Date().getFullYear();
      const docRef = await addDoc(collection(db, 'mol_documente'), {
        titlu: titlu.trim(),
        categorie,
        numar: numar.trim() || null,
        dataAct: dataAct || null,
        an,
        fisier: { name: '', storagePath: '', size: fisier.size },
        activ: true,
        publicatLa: Timestamp.now(),
        publicatDe: adminUser?.uid || null,
        publicatDeNume: adminUser?.displayName || adminUser?.email || 'Staff',
      });

      const safeName = fisier.name.replace(/[^\w.\-()\s]/g, '_');
      const storagePath = `mol/${docRef.id}/${safeName}`;
      await uploadBytes(ref(storage, storagePath), fisier, { contentType: 'application/pdf' });
      await updateDoc(docRef, { fisier: { name: safeName, storagePath, size: fisier.size } });

      toast({ title: 'Document publicat', description: 'Apare acum în Monitorul Oficial Local.' });
      setTitlu('');
      setNumar('');
      setDataAct('');
      setFisier(null);
      load();
    } catch (error) {
      console.error('Error publishing MOL document:', error);
      toast({ title: 'Eroare', description: 'Publicarea a eșuat', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const toggleActiv = async (documentMol: MolDocument) => {
    try {
      await updateDoc(doc(db, 'mol_documente', documentMol.id), { activ: !documentMol.activ });
      toast({
        title: documentMol.activ ? 'Document retras' : 'Document republicat',
        description: documentMol.activ
          ? 'Nu mai apare în secțiunea publică.'
          : 'Apare din nou în secțiunea publică.',
      });
      load();
    } catch {
      toast({ title: 'Eroare', description: 'Operațiunea a eșuat', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="bg-amber-500/15 rounded-lg p-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            Monitorul Oficial Local
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Publicarea actelor administrative, conform art. 197–200 din Codul administrativ
          </p>
        </div>
        <a href="/monitorul-oficial" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white">
            <ExternalLink className="h-4 w-4 mr-2" />
            Vezi pagina publică
          </Button>
        </a>
      </div>

      {/* Publish form */}
      <Card className="bg-slate-800/60 border-slate-700/60">
        <CardHeader>
          <CardTitle className="text-white text-base">Publică un document</CardTitle>
          <CardDescription className="text-gray-400">
            Încarcă PDF-ul semnat al actului. Documentul devine public imediat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePublish} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-200">Secțiunea *</Label>
                <Select value={categorie} onValueChange={(v) => setCategorie(v as MolCategorie)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    {(Object.keys(MOL_CATEGORII) as MolCategorie[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {MOL_CATEGORII[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Titlul actului *</Label>
                <Input
                  value={titlu}
                  onChange={(e) => setTitlu(e.target.value)}
                  placeholder="ex: HCL privind aprobarea bugetului local pe anul 2026"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Numărul actului</Label>
                <Input
                  value={numar}
                  onChange={(e) => setNumar(e.target.value)}
                  placeholder="ex: 12"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Data actului</Label>
                <Input
                  type="date"
                  value={dataAct}
                  onChange={(e) => setDataAct(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Fișier PDF (semnat) *</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFisier(e.target.files?.[0] || null)}
                className="bg-slate-700 border-slate-600 text-white file:text-gray-300"
              />
            </div>
            <Button type="submit" disabled={publishing} className="bg-amber-600 hover:bg-amber-700">
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Publică în Monitorul Oficial Local
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Published documents */}
      <Card className="bg-slate-800/60 border-slate-700/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            Documente publicate {documente.length > 0 && `(${documente.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : documente.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">
              Niciun document publicat încă. Primul pas: încarcă statutul comunei și hotărârile recente.
            </p>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {documente.map((documentMol) => (
                <div key={documentMol.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <p className={`text-sm font-medium truncate ${documentMol.activ ? 'text-white' : 'text-gray-500 line-through'}`}>
                        {documentMol.numar ? `Nr. ${documentMol.numar} — ` : ''}
                        {documentMol.titlu}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {MOL_CATEGORII[documentMol.categorie]?.label} · {documentMol.an}
                      {documentMol.dataAct ? ` · act din ${documentMol.dataAct}` : ''}
                      {documentMol.publicatDeNume ? ` · publicat de ${documentMol.publicatDeNume}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!documentMol.activ && (
                      <Badge variant="outline" className="bg-gray-500/15 text-gray-400 border-gray-500/30 text-xs">
                        Retras
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActiv(documentMol)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-slate-700"
                      title={documentMol.activ ? 'Retrage din pagina publică' : 'Republică'}
                    >
                      {documentMol.activ ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
