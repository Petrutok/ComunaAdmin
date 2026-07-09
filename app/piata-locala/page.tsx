"use client";

// Piața locală - produce market for goods sold by local households.
// Public browse + post (like announcements: anyone can list, staff moderate).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection, addDoc, getDocs, query, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';
import {
  Home, Search, Plus, Loader2, Phone, MapPin, Camera, ShoppingBasket, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ProdusLocal, ProduseCategorie, PRODUSE_CATEGORII, UNITATI_PRODUSE,
} from '@/types/piata';

const EMPTY_FORM = {
  categorie: '' as ProduseCategorie | '',
  titlu: '',
  descriere: '',
  pret: '',
  unitate: 'kg',
  negociabil: false,
  cantitateDisponibila: '',
  localitate: '',
  vanzator: '',
  telefon: '',
};

export default function PiataLocalaPage() {
  const { toast } = useToast();
  const { user, profile } = useCitizenAuth();

  const [produse, setProduse] = useState<ProdusLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProduseCategorie | 'toate'>('toate');
  const [sortBy, setSortBy] = useState<'noi' | 'vechi' | 'pret-asc' | 'pret-desc'>('noi');

  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<ProdusLocal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Single-field orderBy keeps this index-free; inactive items (hidden
      // by staff moderation) are filtered client-side
      const snap = await getDocs(
        query(collection(db, 'piata_locala'), orderBy('createdAt', 'desc'), limit(200))
      );
      setProduse(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as ProdusLocal))
          .filter((p) => p.status !== 'inactiv')
      );
    } catch (error) {
      console.error('Error loading piata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Prefill seller fields for logged-in citizens
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        vanzator: f.vanzator || profile?.numeComplet || user.displayName || '',
        telefon: f.telefon || profile?.telefon || '',
      }));
    }
  }, [user, profile]);

  const filtered = produse
    .filter((p) => {
      if (category !== 'toate' && p.categorie !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return [p.titlu, p.descriere, p.vanzator, p.localitate]
          .join(' ').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      switch (sortBy) {
        case 'vechi': return ta - tb;
        case 'pret-asc': return a.pret - b.pret;
        case 'pret-desc': return b.pret - a.pret;
        default: return tb - ta; // cele mai noi
      }
    });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagine prea mare', description: 'Maxim 5 MB.', variant: 'destructive' });
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!form.categorie || !form.titlu.trim() || !form.vanzator.trim() || !form.telefon.trim()) {
      toast({ title: 'Completează câmpurile', description: 'Categorie, produs, nume și telefon sunt obligatorii.', variant: 'destructive' });
      return;
    }
    if (!/^[\d\s\-+()]{7,}$/.test(form.telefon)) {
      toast({ title: 'Telefon invalid', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (image) {
        const storageRef = ref(storage, `piata/${Date.now()}_${image.name}`);
        const snap = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(snap.ref);
      }

      await addDoc(collection(db, 'piata_locala'), {
        categorie: form.categorie,
        titlu: form.titlu.trim(),
        descriere: form.descriere.trim(),
        pret: parseFloat(form.pret) || 0,
        unitate: form.unitate,
        negociabil: form.negociabil,
        cantitateDisponibila: form.cantitateDisponibila.trim(),
        localitate: form.localitate.trim(),
        vanzator: form.vanzator.trim(),
        telefon: form.telefon.trim(),
        ...(imageUrl ? { imageUrl } : {}),
        status: 'activ',
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Produs publicat', description: 'Anunțul tău e vizibil în Piața locală.' });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setImage(null);
      setImagePreview('');
      load();
    } catch (error) {
      console.error('Error posting produs:', error);
      toast({ title: 'Eroare', description: 'Nu s-a putut publica produsul.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (p: ProdusLocal) =>
    `${p.pret} lei/${p.unitate}${p.negociabil ? ' (negociabil)' : ''}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <Link href="/" className="fixed left-4 top-4 z-50">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 font-medium text-white shadow-2xl backdrop-blur-md transition-all hover:bg-white/20">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Acasă</span>
          </div>
        </Link>

        {/* Header */}
        <div className="pt-20 pb-6 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
            <ShoppingBasket className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Piața locală</h1>
          <p className="mx-auto mt-2 max-w-xl px-4 text-gray-400">
            Produse proaspete de la gospodarii din comună — miere, ouă, brânză, legume, dulcețuri
          </p>
        </div>

        {/* Search + add */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută un produs sau un gospodar..."
              className="h-12 rounded-xl border-slate-700 bg-slate-800/80 pl-12 text-base text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 text-base font-semibold text-white shadow-lg hover:from-green-500 hover:to-emerald-500"
          >
            <Plus className="mr-2 h-5 w-5" />
            Vinde un produs
          </Button>
        </div>

        {/* Category chips */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setCategory('toate')}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
              category === 'toate'
                ? 'border-emerald-500 bg-emerald-500/20 text-white'
                : 'border-slate-700 bg-slate-800/60 text-gray-300 hover:border-slate-500'
            )}
          >
            🧺 Toate
            <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold',
              category === 'toate' ? 'bg-emerald-500/40 text-white' : 'bg-slate-700 text-gray-400')}>
              {produse.length}
            </span>
          </button>
          {(Object.keys(PRODUSE_CATEGORII) as ProduseCategorie[]).map((key) => {
            const cat = PRODUSE_CATEGORII[key];
            const count = produse.filter((p) => p.categorie === key).length;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  category === key
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-slate-700 bg-slate-800/60 text-gray-300 hover:border-slate-500'
                )}
              >
                {cat.icon} {cat.label}
                {count > 0 && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-bold',
                    category === key ? 'bg-emerald-500/40 text-white' : 'bg-slate-700 text-gray-400')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Result count + sort */}
        {!loading && filtered.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length} {filtered.length === 1 ? 'produs' : 'produse'}
            </span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[190px] rounded-lg border-slate-700 bg-slate-800/80 text-sm text-white" aria-label="Sortează produsele">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-white">
                <SelectItem value="noi">Cele mai noi</SelectItem>
                <SelectItem value="vechi">Cele mai vechi</SelectItem>
                <SelectItem value="pret-asc">Preț: mic → mare</SelectItem>
                <SelectItem value="pret-desc">Preț: mare → mic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/60">
            <CardContent className="py-16 text-center">
              <ShoppingBasket className="mx-auto mb-3 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">
                {produse.length === 0
                  ? 'Niciun produs listat încă. Fii primul gospodar care vinde aici!'
                  : 'Niciun produs nu corespunde căutării.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const cat = PRODUSE_CATEGORII[p.categorie] || PRODUSE_CATEGORII.altele;
              return (
                <button key={p.id} onClick={() => setDetail(p)} className="text-left">
                  <Card className="group h-full overflow-hidden rounded-2xl border-slate-700 bg-slate-800/80 transition-all hover:border-slate-500 hover:shadow-lg">
                    {p.imageUrl ? (
                      <div className="relative h-44 overflow-hidden">
                        <img src={p.imageUrl} alt={p.titlu} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className={cn('flex h-44 items-center justify-center text-6xl', cat.bg)}>
                        {cat.icon}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', cat.bg, cat.color, cat.border)}>
                        {cat.icon} {cat.label}
                      </span>
                      <h3 className="mt-2 line-clamp-1 font-semibold text-white">{p.titlu}</h3>
                      <p className="mt-1 text-xl font-bold text-emerald-400">{formatPrice(p)}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        {p.localitate && (
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.localitate}</span>
                        )}
                        {p.cantitateDisponibila && <span>Disponibil: {p.cantitateDisponibila}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-700 bg-slate-800 text-white">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detail.titlu}</DialogTitle>
              </DialogHeader>
              {detail.imageUrl && (
                <img src={detail.imageUrl} alt={detail.titlu} className="max-h-64 w-full rounded-xl object-cover" />
              )}
              <p className="text-2xl font-bold text-emerald-400">{formatPrice(detail)}</p>
              {detail.descriere && <p className="text-gray-300">{detail.descriere}</p>}
              <div className="space-y-1.5 text-sm text-gray-300">
                {detail.cantitateDisponibila && <p>Cantitate disponibilă: <span className="text-white">{detail.cantitateDisponibila}</span></p>}
                {detail.localitate && <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-500" />{detail.localitate}</p>}
                <p>Vânzător: <span className="text-white">{detail.vanzator}</span></p>
              </div>
              <a href={`tel:${detail.telefon}`}>
                <Button className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-base hover:from-green-500 hover:to-emerald-500">
                  <Phone className="mr-2 h-5 w-5" /> Sună: {detail.telefon}
                </Button>
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-slate-700 bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Vinde un produs</DialogTitle>
            <DialogDescription className="text-gray-400">
              Listează un produs de la gospodăria ta. Cetățenii te contactează direct la telefon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-200">Categorie *</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v as ProduseCategorie })}>
                <SelectTrigger className="rounded-lg border-slate-600 bg-slate-700 text-white">
                  <SelectValue placeholder="Alege categoria" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-white">
                  {(Object.keys(PRODUSE_CATEGORII) as ProduseCategorie[]).map((key) => (
                    <SelectItem key={key} value={key}>{PRODUSE_CATEGORII[key].icon} {PRODUSE_CATEGORII[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-200">Produsul *</Label>
              <Input value={form.titlu} onChange={(e) => setForm({ ...form, titlu: e.target.value })}
                placeholder="ex: Miere de salcâm" maxLength={80}
                className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-200">Preț (lei) *</Label>
                <Input type="number" value={form.pret} onChange={(e) => setForm({ ...form, pret: e.target.value })}
                  placeholder="25" className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-200">Pe unitate</Label>
                <Select value={form.unitate} onValueChange={(v) => setForm({ ...form, unitate: v })}>
                  <SelectTrigger className="rounded-lg border-slate-600 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-white">
                    {UNITATI_PRODUSE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.negociabil}
                onChange={(e) => setForm({ ...form, negociabil: e.target.checked })}
                className="h-4 w-4 accent-emerald-500" />
              Preț negociabil
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-200">Cantitate disponibilă</Label>
                <Input value={form.cantitateDisponibila} onChange={(e) => setForm({ ...form, cantitateDisponibila: e.target.value })}
                  placeholder="ex: 20 kg" className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-200">Sat / localitate</Label>
                <Input value={form.localitate} onChange={(e) => setForm({ ...form, localitate: e.target.value })}
                  placeholder="ex: Cârligi" className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-200">Descriere (opțional)</Label>
              <Textarea value={form.descriere} onChange={(e) => setForm({ ...form, descriere: e.target.value })}
                rows={2} placeholder="Detalii despre produs, cum se poate ridica..."
                className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
            </div>

            {/* Photo */}
            <div className="space-y-1.5">
              <Label className="text-gray-200">Poză (opțional)</Label>
              <label htmlFor="piata-image" className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-600 bg-slate-700/30 p-3 transition-colors hover:border-slate-500">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
                    <span className="text-sm text-gray-300">Apasă pentru a schimba</span>
                    <button type="button" onClick={(e) => { e.preventDefault(); setImage(null); setImagePreview(''); }}
                      className="ml-auto text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-slate-700 p-2.5"><Camera className="h-6 w-6 text-gray-300" /></div>
                    <span className="text-sm text-gray-300">Adaugă o poză cu produsul</span>
                  </>
                )}
              </label>
              <Input id="piata-image" type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-700 pt-4">
              <div className="space-y-1.5">
                <Label className="text-gray-200">Numele tău *</Label>
                <Input value={form.vanzator} onChange={(e) => setForm({ ...form, vanzator: e.target.value })}
                  placeholder="ex: Maria P." className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-200">Telefon *</Label>
                <Input type="tel" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                  placeholder="07xx xxx xxx" className="rounded-lg border-slate-600 bg-slate-700 text-white placeholder:text-gray-500" />
              </div>
            </div>

            <Button onClick={submit} disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-base font-semibold hover:from-green-500 hover:to-emerald-500">
              {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBasket className="mr-2 h-5 w-5" />}
              Publică produsul
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
