'use client';

// Avizare queue for the admin dashboard: documents waiting for the
// secretar's aviz or the primar's signature. The designated secretar /
// primar (or any admin) reviews the draft text and either approves,
// signs & issues, or returns it to the responsabil with a reason.
//
// Renders nothing for staff who have no role in the circuit.

import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileSignature, Loader2, CornerDownLeft, BadgeCheck, Stamp } from 'lucide-react';

interface AvizareItem {
  id: string;
  tipDocument: 'adeverinta' | 'raspuns';
  cerereId?: string | null;
  registruDocId?: string | null;
  continut: string;
  stadiu: 'la_secretar' | 'la_primar';
  referinta?: {
    numarInregistrare?: string | null;
    numeComplet?: string | null;
    tipLabel?: string | null;
  };
  intocmitDe?: { uid: string; nume: string };
  avizatDe?: { uid: string; nume: string } | null;
  createdAt?: any;
}

export function AvizareQueue() {
  const { isAdmin, userId } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<AvizareItem[]>([]);
  const [settings, setSettings] = useState<{ secretarUserId?: string; primarUserId?: string }>({});
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<AvizareItem | null>(null);
  const [motiv, setMotiv] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settingsSnap, queueSnap] = await Promise.all([
        getDoc(doc(db, 'config', 'adeverinta_settings')),
        getDocs(
          query(collection(db, 'avizari'), where('stadiu', 'in', ['la_secretar', 'la_primar']))
        ),
      ]);
      setSettings(settingsSnap.data() || {});
      const data = queueSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AvizareItem);
      data.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setItems(data);
    } catch (error) {
      console.error('[AvizareQueue] Load failed:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isSecretar = userId && userId === settings.secretarUserId;
  const isPrimar = userId && userId === settings.primarUserId;

  // Staff with no role in the circuit don't see the queue
  if (!isAdmin && !isSecretar && !isPrimar) return null;
  if (!loaded || items.length === 0) return null;

  const canActOn = (item: AvizareItem) =>
    isAdmin ||
    (item.stadiu === 'la_secretar' && isSecretar) ||
    (item.stadiu === 'la_primar' && isPrimar);

  const callApi = async (url: string, body: Record<string, unknown>) => {
    const idToken = await auth.currentUser?.getIdToken();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Acțiunea a eșuat');
    return result;
  };

  const handleAvizeaza = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await callApi('/api/avizare', { action: 'avizeaza', avizareId: selected.id });
      toast({
        title: 'Document avizat',
        description: 'A fost trimis primarului pentru semnătură.',
      });
      setSelected(null);
      load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Avizarea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  const handleSemneaza = async () => {
    if (!selected) return;
    setActing(true);
    try {
      const endpoint =
        selected.tipDocument === 'adeverinta' ? '/api/emite-adeverinta' : '/api/emite-raspuns';
      const result = await callApi(endpoint, { avizareId: selected.id });

      // Citizen notification (push + email) for online cereri - best effort
      if (selected.cerereId) {
        const idToken = await auth.currentUser?.getIdToken();
        fetch('/api/notify-status-change', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            collection: 'form_submissions',
            docId: selected.cerereId,
            newStatus: result.status || 'rezolvat',
          }),
        }).catch(() => {});
      }

      toast({
        title: 'Document semnat și emis',
        description: `Nr. ieșire ${result.numarIesire}`,
      });
      setSelected(null);
      load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Semnarea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  const handleReturneaza = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await callApi('/api/avizare', {
        action: 'returneaza',
        avizareId: selected.id,
        motiv: motiv.trim(),
      });
      toast({
        title: 'Document returnat',
        description: 'Responsabilul a fost notificat.',
      });
      setSelected(null);
      setMotiv('');
      load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Returnarea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <Card className="bg-indigo-500/5 border-indigo-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-indigo-400" />
            De avizat / de semnat
            <Badge variant="outline" className="ml-1 bg-indigo-500/15 text-indigo-300 border-indigo-500/30 text-xs">
              {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-700/60">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-slate-700/40 transition-colors cursor-pointer"
                onClick={() => {
                  setMotiv('');
                  setSelected(item);
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {item.referinta?.tipLabel || 'Document'}
                      {item.referinta?.numeComplet ? ` — ${item.referinta.numeComplet}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {item.referinta?.numarInregistrare
                      ? `${item.referinta.numarInregistrare} · `
                      : ''}
                    întocmit de {item.intocmitDe?.nume || '—'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${
                    item.stadiu === 'la_secretar'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {item.stadiu === 'la_secretar' ? 'La secretar' : 'La primar'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-xl flex items-center gap-2">
                  <Stamp className="h-5 w-5 text-indigo-400" />
                  {selected.referinta?.tipLabel || 'Document în avizare'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {selected.referinta?.numarInregistrare && (
                    <>
                      Pentru documentul{' '}
                      <span className="font-mono text-green-400">
                        {selected.referinta.numarInregistrare}
                      </span>{' '}
                    </>
                  )}
                  {selected.referinta?.numeComplet && (
                    <>
                      · <span className="text-white">{selected.referinta.numeComplet}</span>
                    </>
                  )}
                  <span className="block mt-1">
                    Întocmit de {selected.intocmitDe?.nume || '—'}
                    {selected.avizatDe ? ` · avizat de ${selected.avizatDe.nume}` : ''}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border border-slate-600 bg-slate-900/70 p-4 whitespace-pre-wrap text-sm text-gray-200 font-mono max-h-72 overflow-y-auto">
                {selected.continut}
              </div>

              {canActOn(selected) ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {selected.stadiu === 'la_secretar' ? (
                      <Button
                        onClick={handleAvizeaza}
                        disabled={acting}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {acting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeCheck className="mr-2 h-4 w-4" />
                        )}
                        Avizez
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSemneaza}
                        disabled={acting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {acting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Stamp className="mr-2 h-4 w-4" />
                        )}
                        Semnez și emit cu număr de ieșire
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      value={motiv}
                      onChange={(e) => setMotiv(e.target.value)}
                      placeholder="Motivul returnării (opțional)..."
                      rows={2}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleReturneaza}
                      disabled={acting}
                      className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/15"
                    >
                      <CornerDownLeft className="mr-2 h-4 w-4" />
                      Returnează responsabilului
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Documentul așteaptă{' '}
                  {selected.stadiu === 'la_secretar'
                    ? 'avizul secretarului general'
                    : 'semnătura primarului'}
                  .
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
