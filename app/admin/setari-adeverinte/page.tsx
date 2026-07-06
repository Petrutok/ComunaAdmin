"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Upload, CheckCircle } from 'lucide-react';

const SETTINGS_DOC = 'config/adeverinta_settings';
const SIGNATURE_PATH = 'config/semnatura-primar.png';

export default function SetariAdeverintePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [primarNume, setPrimarNume] = useState('');
  const [localitate, setLocalitate] = useState('PRIMĂRIA COMUNEI FILIPEȘTI');
  const [judet, setJudet] = useState('Județul Bacău');
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'config', 'adeverinta_settings'))
      .then((snap) => {
        const data = snap.data();
        if (data) {
          setPrimarNume(data.primarNume || '');
          setLocalitate(data.localitate || 'PRIMĂRIA COMUNEI FILIPEȘTI');
          setJudet(data.judet || 'Județul Bacău');
          setHasSignature(!!data.semnaturaPath);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let semnaturaPath: string | undefined;

      if (signatureFile) {
        if (signatureFile.type !== 'image/png') {
          toast({ title: 'Format greșit', description: 'Semnătura trebuie să fie imagine PNG (fundal transparent, ideal).', variant: 'destructive' });
          setSaving(false);
          return;
        }
        await uploadBytes(ref(storage, SIGNATURE_PATH), signatureFile, { contentType: 'image/png' });
        semnaturaPath = SIGNATURE_PATH;
      }

      const existing = (await getDoc(doc(db, 'config', 'adeverinta_settings'))).data() || {};
      await setDoc(doc(db, 'config', 'adeverinta_settings'), {
        ...existing,
        primarNume: primarNume.trim(),
        localitate: localitate.trim(),
        judet: judet.trim(),
        ...(semnaturaPath ? { semnaturaPath } : {}),
      });

      if (semnaturaPath) setHasSignature(true);
      setSignatureFile(null);
      toast({ title: 'Setări salvate', description: 'Adeverințele noi vor folosi aceste date.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Eroare', description: 'Nu s-au putut salva setările.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-600/40 rounded-xl">
          <Settings className="h-7 w-7 text-gray-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Setări adeverințe</h1>
          <p className="text-gray-400 text-sm">Antetul, semnatarul și semnătura folosite pe PDF-urile emise</p>
        </div>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Date de emitere</CardTitle>
          <CardDescription className="text-gray-400">
            Apar pe fiecare adeverință emisă digital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Antet instituție</Label>
              <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Județ</Label>
              <Input value={judet} onChange={(e) => setJudet(e.target.value)} required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Numele primarului (semnatar)</Label>
              <Input value={primarNume} onChange={(e) => setPrimarNume(e.target.value)} placeholder="ex: Ion Popescu" required className="bg-slate-700 border-slate-600 text-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">Semnătură + ștampilă (imagine PNG)</Label>
              {hasSignature && !signatureFile && (
                <p className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" /> Semnătura este încărcată. Poți încărca alta pentru a o înlocui.
                </p>
              )}
              <Input
                type="file"
                accept="image/png"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                className="bg-slate-700 border-slate-600 text-white file:text-gray-300"
              />
              <p className="text-xs text-gray-500">
                Scanează semnătura și ștampila pe fundal alb sau transparent, decupată strâns.
                Fără imagine, adeverințele se emit doar cu numele tipărit.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base">
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
              Salvează setările
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
