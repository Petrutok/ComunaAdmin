"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Settings, Loader2, Upload, CheckCircle, PenLine } from 'lucide-react';
import { TENANT } from '@/lib/tenant';
import type { User } from '@/types/departments';

const SETTINGS_DOC = 'config/adeverinta_settings';
const SIGNATURE_PATH = 'config/semnatura-primar.png';
const SECRETAR_SIGNATURE_PATH = 'config/semnatura-secretar.png';

// Sentinel for "no designated user" in the Select (Radix rejects value="")
const NONE = '__none__';

export default function SetariAdeverintePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [primarNume, setPrimarNume] = useState('');
  const [localitate, setLocalitate] = useState(TENANT.antetOficial);
  const [judet, setJudet] = useState(TENANT.judet);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // Secretar general: name + signature for the "SECRETAR GENERAL" block
  const [secretarNume, setSecretarNume] = useState('');
  const [hasSecretarSignature, setHasSecretarSignature] = useState(false);
  const [secretarSignatureFile, setSecretarSignatureFile] = useState<File | null>(null);

  // Designated signer accounts: who may "Avizez" / "Semnez" in the
  // avizare flow and who receives the push when a document awaits them
  const [users, setUsers] = useState<User[]>([]);
  const [secretarUserId, setSecretarUserId] = useState<string>(NONE);
  const [primarUserId, setPrimarUserId] = useState<string>(NONE);

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'config', 'adeverinta_settings')),
      getDocs(query(collection(db, COLLECTIONS.USERS), orderBy('fullName', 'asc'))),
    ])
      .then(([snap, usersSnap]) => {
        const data = snap.data();
        if (data) {
          setPrimarNume(data.primarNume || '');
          setLocalitate(data.localitate || TENANT.antetOficial);
          setJudet(data.judet || TENANT.judet);
          setHasSignature(!!data.semnaturaPath);
          setSecretarNume(data.secretarNume || '');
          setHasSecretarSignature(!!data.secretarSemnaturaPath);
          setSecretarUserId(data.secretarUserId || NONE);
          setPrimarUserId(data.primarUserId || NONE);
        }
        setUsers(
          usersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as User)
            .filter((u) => u.active)
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const validatePng = (file: File, label: string): boolean => {
    if (file.type !== 'image/png') {
      toast({
        title: 'Format greșit',
        description: `${label} trebuie să fie imagine PNG (fundal transparent, ideal).`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let semnaturaPath: string | undefined;
      let secretarSemnaturaPath: string | undefined;

      if (signatureFile) {
        if (!validatePng(signatureFile, 'Semnătura primarului')) {
          setSaving(false);
          return;
        }
        await uploadBytes(ref(storage, SIGNATURE_PATH), signatureFile, { contentType: 'image/png' });
        semnaturaPath = SIGNATURE_PATH;
      }

      if (secretarSignatureFile) {
        if (!validatePng(secretarSignatureFile, 'Semnătura secretarului')) {
          setSaving(false);
          return;
        }
        await uploadBytes(ref(storage, SECRETAR_SIGNATURE_PATH), secretarSignatureFile, {
          contentType: 'image/png',
        });
        secretarSemnaturaPath = SECRETAR_SIGNATURE_PATH;
      }

      const existing = (await getDoc(doc(db, 'config', 'adeverinta_settings'))).data() || {};
      await setDoc(doc(db, 'config', 'adeverinta_settings'), {
        ...existing,
        primarNume: primarNume.trim(),
        localitate: localitate.trim(),
        judet: judet.trim(),
        secretarNume: secretarNume.trim(),
        secretarUserId: secretarUserId === NONE ? null : secretarUserId,
        primarUserId: primarUserId === NONE ? null : primarUserId,
        ...(semnaturaPath ? { semnaturaPath } : {}),
        ...(secretarSemnaturaPath ? { secretarSemnaturaPath } : {}),
      });

      if (semnaturaPath) setHasSignature(true);
      if (secretarSemnaturaPath) setHasSecretarSignature(true);
      setSignatureFile(null);
      setSecretarSignatureFile(null);
      toast({ title: 'Setări salvate', description: 'Documentele noi vor folosi aceste date.' });
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

  const userSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600 text-white">
        <SelectItem value={NONE}>— Nedesemnat —</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName} ({u.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-600/40 rounded-xl">
          <Settings className="h-7 w-7 text-gray-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Setări documente emise</h1>
          <p className="text-gray-400 text-sm">Antetul, semnatarii și semnăturile folosite pe PDF-urile emise</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Antet instituție</CardTitle>
            <CardDescription className="text-gray-400">
              Apare pe fiecare document emis digital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Antet instituție</Label>
              <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Județ</Label>
              <Input value={judet} onChange={(e) => setJudet(e.target.value)} required className="bg-slate-700 border-slate-600 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PenLine className="h-5 w-5 text-blue-400" />
              Primar
            </CardTitle>
            <CardDescription className="text-gray-400">
              Semnează final documentele. Contul desemnat primește notificare când un document îi așteaptă semnătura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Numele primarului</Label>
              <Input value={primarNume} onChange={(e) => setPrimarNume(e.target.value)} placeholder="ex: Ion Popescu" required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Contul primarului (pentru avizare în aplicație)</Label>
              {userSelect(primarUserId, setPrimarUserId, 'Selectează contul primarului')}
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
                Fără imagine, documentele se emit doar cu numele tipărit.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PenLine className="h-5 w-5 text-purple-400" />
              Secretar general
            </CardTitle>
            <CardDescription className="text-gray-400">
              Avizează documentele înainte de semnătura primarului. Lasă numele gol dacă documentele se emit fără aviz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-200">Numele secretarului general</Label>
              <Input value={secretarNume} onChange={(e) => setSecretarNume(e.target.value)} placeholder="ex: Maria Ionescu" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Contul secretarului (pentru avizare în aplicație)</Label>
              {userSelect(secretarUserId, setSecretarUserId, 'Selectează contul secretarului')}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Semnătura secretarului (imagine PNG)</Label>
              {hasSecretarSignature && !secretarSignatureFile && (
                <p className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" /> Semnătura este încărcată. Poți încărca alta pentru a o înlocui.
                </p>
              )}
              <Input
                type="file"
                accept="image/png"
                onChange={(e) => setSecretarSignatureFile(e.target.files?.[0] || null)}
                className="bg-slate-700 border-slate-600 text-white file:text-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base">
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
          Salvează setările
        </Button>
      </form>
    </div>
  );
}
