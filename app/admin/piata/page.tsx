"use client";

// Admin moderation for Piața locală: pending / approved / rejected tabs,
// with approve, reject (with reason) and delete - same flow as
// announcements moderation.

import { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBasket, Loader2, Check, X, Trash2, Phone, MapPin } from 'lucide-react';
import { ProdusLocal, PRODUSE_CATEGORII } from '@/types/piata';

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminPiataPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<ProdusLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [rejectTarget, setRejectTarget] = useState<ProdusLocal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProdusLocal | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'piata_locala'), where('status', '==', tab))
      );
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ProdusLocal))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setItems(data);
    } catch (error) {
      console.error('Error loading piata admin:', error);
      toast({ title: 'Eroare', description: 'Nu s-au putut încărca produsele.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'piata_locala'), where('status', '==', 'pending'))
      );
      setPendingCount(snap.size);
    } catch { /* non-critical */ }
  };

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadPendingCount(); }, []);

  const approve = async (p: ProdusLocal) => {
    try {
      await updateDoc(doc(db, 'piata_locala', p.id), { status: 'approved', updatedAt: Timestamp.now() });
      toast({ title: 'Produs aprobat', description: 'Este vizibil în Piața locală.' });
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      loadPendingCount();
    } catch {
      toast({ title: 'Eroare', description: 'Nu s-a putut aproba.', variant: 'destructive' });
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    try {
      await updateDoc(doc(db, 'piata_locala', rejectTarget.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || 'Nu respectă regulile pieței',
        updatedAt: Timestamp.now(),
      });
      toast({ title: 'Produs respins' });
      setItems((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
      loadPendingCount();
    } catch {
      toast({ title: 'Eroare', description: 'Nu s-a putut respinge.', variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'piata_locala', deleteTarget.id));
      toast({ title: 'Produs șters' });
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Eroare', description: 'Nu s-a putut șterge.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/20 p-3">
          <ShoppingBasket className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Piața locală</h1>
          <p className="text-sm text-gray-400">Verifică produsele înainte de publicare</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1">
          <TabsTrigger value="pending" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            În așteptare
            {pendingCount > 0 && <Badge className="ml-2 bg-amber-500 text-black">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Aprobate
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Respinse
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border-slate-700 bg-slate-800/60">
          <CardContent className="py-12 text-center text-gray-400">
            {tab === 'pending' ? 'Niciun produs în așteptare. Totul e verificat.' :
             tab === 'approved' ? 'Niciun produs aprobat.' : 'Niciun produs respins.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const cat = PRODUSE_CATEGORII[p.categorie] || PRODUSE_CATEGORII.altele;
            return (
              <Card key={p.id} className="overflow-hidden rounded-2xl border-slate-700 bg-slate-800/80">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.titlu} className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-24 sm:shrink-0" />
                  ) : (
                    <div className={`flex h-28 items-center justify-center rounded-xl text-4xl sm:h-24 sm:w-24 sm:shrink-0 ${cat.bg}`}>{cat.icon}</div>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${cat.bg} ${cat.color} ${cat.border}`}>
                      {cat.icon} {cat.label}
                    </span>
                    <h3 className="mt-1.5 font-semibold text-white">{p.titlu}</h3>
                    <p className="text-lg font-bold text-emerald-400">{p.pret} lei/{p.unitate}{p.negociabil ? ' (neg.)' : ''}</p>
                    {p.descriere && <p className="mt-1 text-sm text-gray-400 line-clamp-2">{p.descriere}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>Vânzător: <span className="text-gray-200">{p.vanzator}</span></span>
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.telefon}</span>
                      {p.localitate && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.localitate}</span>}
                    </div>
                    {p.status === 'rejected' && p.rejectionReason && (
                      <p className="mt-1 text-xs text-rose-300">Motiv respingere: {p.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex gap-2 sm:flex-col sm:justify-center">
                    {tab === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approve(p)} className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                          <Check className="mr-1.5 h-4 w-4" /> Aprobă
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(p)} className="flex-1 rounded-lg border-slate-600 text-gray-300 hover:bg-slate-700">
                          <X className="mr-1.5 h-4 w-4" /> Respinge
                        </Button>
                      </>
                    )}
                    {tab === 'rejected' && (
                      <Button size="sm" onClick={() => approve(p)} className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
                        <Check className="mr-1.5 h-4 w-4" /> Aprobă totuși
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget(p)} className="rounded-lg border-rose-500/40 text-rose-300 hover:bg-rose-950/30">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="rounded-2xl border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Respinge produsul</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">{rejectTarget?.titlu}</p>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivul respingerii (opțional)"
            className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRejectTarget(null)} className="flex-1 rounded-lg border-slate-600 text-gray-300 hover:bg-slate-700">
              Anulează
            </Button>
            <Button onClick={reject} className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700">
              Respinge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-slate-700 bg-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi definitiv produsul?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {deleteTarget?.titlu} — acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600">Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 text-white hover:bg-red-700">Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
