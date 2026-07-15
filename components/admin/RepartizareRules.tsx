'use client';

// Manager for the auto-repartizare rules (config/reguli_repartizare).
// Each rule routes incoming online cereri of a given type to a
// department + optional responsabil. Rules are evaluated in order by
// lib/repartizare.ts, server-side, at submission time; the first match
// wins. Kept as a self-contained component so the Departamente page
// stays readable.

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Department, User } from '@/types/departments';
import { RegulaRepartizare, REGULI_REPARTIZARE_DOC } from '@/lib/repartizare';
import { REQUEST_CONFIGS } from '@/lib/request-configs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Route, ArrowRight } from 'lucide-react';

// Sentinel for "any responsabil" in the Select (Radix rejects value="")
const NONE = '__none__';

interface Props {
  departments: Department[];
  users: User[];
}

const TIP_CERERE_OPTIONS = Object.entries(REQUEST_CONFIGS)
  .map(([value, cfg]) => ({ value, label: (cfg as { title: string }).title }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ro'));

export function RepartizareRules({ departments, users }: Props) {
  const { toast } = useToast();
  const [reguli, setReguli] = useState<RegulaRepartizare[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Draft for the "add rule" row
  const [tipCerere, setTipCerere] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [userId, setUserId] = useState<string>(NONE);

  useEffect(() => {
    getDoc(doc(db, 'config', 'reguli_repartizare'))
      .then((snap) => setReguli((snap.data()?.reguli || []) as RegulaRepartizare[]))
      .catch((error) => console.error('Error loading rules:', error))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: RegulaRepartizare[]) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'reguli_repartizare'), { reguli: next }, { merge: true });
      setReguli(next);
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({ title: 'Eroare', description: 'Regulile nu s-au putut salva', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!tipCerere || !departmentId) {
      toast({
        title: 'Date lipsă',
        description: 'Alege tipul cererii și departamentul.',
        variant: 'destructive',
      });
      return;
    }
    const dept = departments.find((d) => d.id === departmentId);
    const user = userId !== NONE ? users.find((u) => u.id === userId) : null;
    const noua: RegulaRepartizare = {
      match: { tipCerere },
      assign: {
        departmentId,
        departmentName: dept?.name || null,
        userId: user?.id || null,
        userName: user?.fullName || null,
      },
      activa: true,
    };
    persist([...reguli, noua]);
    setTipCerere('');
    setDepartmentId('');
    setUserId(NONE);
  };

  const removeRule = (index: number) => persist(reguli.filter((_, i) => i !== index));

  const tipLabel = (t?: string) =>
    (t && (REQUEST_CONFIGS[t] as { title?: string })?.title) || t || 'Orice cerere';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Route className="h-5 w-5 text-cyan-400" />
          Reguli de repartizare automată
        </CardTitle>
        <CardDescription className="text-gray-400">
          Cererile online de tipul ales ajung direct la departamentul și responsabilul stabiliți.
          Regulile se aplică în ordine — prima potrivire câștigă. Fără reguli, cererile rămân
          nerepartizate, ca înainte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {reguli.length > 0 && (
              <div className="divide-y divide-slate-700/60">
                {reguli.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm min-w-0 flex-wrap">
                      <span className="text-gray-200 font-medium">{tipLabel(r.match.tipCerere)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="text-cyan-300">{r.assign.departmentName || 'Departament'}</span>
                      {r.assign.userName && (
                        <span className="text-blue-300">· {r.assign.userName}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRule(i)}
                      disabled={saving}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-rose-300 hover:bg-rose-600/20 shrink-0"
                      title="Șterge regula"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add-rule row */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end pt-2 border-t border-slate-700/60">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tip cerere</label>
                <Select value={tipCerere} onValueChange={setTipCerere}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                    <SelectValue placeholder="Alege tipul" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white max-h-72">
                    {TIP_CERERE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Departament</label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                    <SelectValue placeholder="Alege departamentul" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Responsabil (opțional)</label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value={NONE}>— Fără responsabil —</SelectItem>
                    {users
                      .filter((u) => u.active)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addRule} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 h-9">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1.5">Adaugă</span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
