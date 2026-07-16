"use client";

// Admin -> Conținut: editable public content (events, ongoing works,
// council members, waste-calendar link). One generic CRUD driven by
// per-collection field schemas - public pages read these collections and
// show a neutral empty state while a collection is empty.

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LayoutList, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import {
  EVENT_CATEGORY_CONFIG,
  WORK_CATEGORY_CONFIG,
  MONTHS_RO,
} from '@/types/content';

type FieldType = 'text' | 'textarea' | 'number' | 'select';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** textarea stored as string[] (one item per line) */
  asList?: boolean;
}

interface SectionDef {
  collection: string;
  singular: string;
  titleKey: string;
  subtitle: (item: any) => string;
  fields: FieldDef[];
}

const SECTIONS: Record<string, SectionDef> = {
  evenimente: {
    collection: 'events',
    singular: 'eveniment',
    titleKey: 'title',
    subtitle: (i) => [i.date, i.location].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Titlu', type: 'text', required: true },
      { key: 'date', label: 'Data (ex: 20 iunie 2026)', type: 'text', required: true },
      { key: 'time', label: 'Interval orar (ex: 10:00 - 22:00)', type: 'text' },
      { key: 'location', label: 'Locația', type: 'text' },
      {
        key: 'month', label: 'Luna (pentru filtru)', type: 'select', required: true,
        options: MONTHS_RO.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) })),
      },
      {
        key: 'category', label: 'Categorie', type: 'select', required: true,
        options: Object.entries(EVENT_CATEGORY_CONFIG).map(([value, c]) => ({ value, label: c.label })),
      },
      { key: 'description', label: 'Descriere', type: 'textarea' },
      { key: 'activities', label: 'Activități (una pe linie)', type: 'textarea', asList: true },
    ],
  },
  lucrari: {
    collection: 'ongoing_works',
    singular: 'lucrare',
    titleKey: 'title',
    subtitle: (i) => [i.location, i.program, i.status, i.budget].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Titlu proiect', type: 'text', required: true },
      { key: 'location', label: 'Locația (ex: Sat Cârligi)', type: 'text' },
      { key: 'program', label: 'Program de finanțare (ex: PNRR, AFM, Buget local)', type: 'text' },
      {
        key: 'category', label: 'Categorie', type: 'select', required: true,
        options: Object.entries(WORK_CATEGORY_CONFIG).map(([value, c]) => ({ value, label: c.label })),
      },
      { key: 'progress', label: 'Progres (%)', type: 'number', required: true },
      { key: 'budget', label: 'Buget (ex: 2.500.000 RON)', type: 'text' },
      {
        key: 'status', label: 'Stadiu', type: 'select',
        options: [
          { value: 'În pregătire', label: 'În pregătire' },
          { value: 'În execuție', label: 'În execuție' },
          { value: 'În finalizare', label: 'În finalizare' },
        ],
      },
      { key: 'description', label: 'Descriere', type: 'textarea' },
    ],
  },
  consilieri: {
    collection: 'representatives',
    singular: 'consilier',
    titleKey: 'name',
    subtitle: (i) => [i.affiliation, i.phone].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Nume complet', type: 'text', required: true },
      { key: 'affiliation', label: 'Partid / Independent', type: 'text', required: true },
      { key: 'phone', label: 'Telefon', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      {
        key: 'gender', label: 'Gen (pentru avatar)', type: 'select',
        options: [
          { value: 'male', label: 'Masculin' },
          { value: 'female', label: 'Feminin' },
        ],
      },
    ],
  },
};

export default function AdminContinutPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('evenimente');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // colectare settings (single doc, separate from list CRUD)
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarLabel, setCalendarLabel] = useState('Descarcă Calendar');
  const [savingColectare, setSavingColectare] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const result: Record<string, any[]> = {};
      for (const [key, section] of Object.entries(SECTIONS)) {
        const snap = await getDocs(collection(db, section.collection));
        result[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setItems(result);

      const colectareSnap = await getDoc(doc(db, 'site_settings', 'colectare'));
      const colectare = colectareSnap.data();
      if (colectare) {
        setCalendarUrl(colectare.calendarUrl || '');
        setCalendarLabel(colectare.calendarLabel || 'Descarcă Calendar');
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    const section = SECTIONS[activeSection];
    const initial: Record<string, any> = {};
    for (const field of section.fields) {
      const value = item[field.key];
      initial[field.key] = field.asList && Array.isArray(value) ? value.join('\n') : value ?? '';
    }
    setForm(initial);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const section = SECTIONS[activeSection];

    for (const field of section.fields) {
      if (field.required && !String(form[field.key] ?? '').trim()) {
        toast({ title: 'Câmp obligatoriu', description: `Completează: ${field.label}`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const data: Record<string, any> = {};
      for (const field of section.fields) {
        const raw = form[field.key];
        if (field.asList) {
          data[field.key] = String(raw || '')
            .split('\n')
            .map((l: string) => l.trim())
            .filter(Boolean);
        } else if (field.type === 'number') {
          data[field.key] = Math.max(0, Math.min(100, Number(raw) || 0));
        } else {
          data[field.key] = raw ?? '';
        }
      }

      if (editingId) {
        await updateDoc(doc(db, section.collection, editingId), data);
      } else {
        await addDoc(collection(db, section.collection), { ...data, createdAt: Timestamp.now() });
      }

      toast({ title: 'Salvat', description: 'Modificarea este vizibilă imediat în aplicație.' });
      setDialogOpen(false);
      loadAll();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({ title: 'Eroare', description: 'Salvarea a eșuat.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const section = SECTIONS[activeSection];
    try {
      await deleteDoc(doc(db, section.collection, deleteTarget.id));
      toast({ title: 'Șters' });
      loadAll();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({ title: 'Eroare', description: 'Ștergerea a eșuat.', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const saveColectare = async () => {
    setSavingColectare(true);
    try {
      await setDoc(doc(db, 'site_settings', 'colectare'), {
        calendarUrl: calendarUrl.trim(),
        calendarLabel: calendarLabel.trim() || 'Descarcă Calendar',
      });
      toast({ title: 'Salvat', description: 'Linkul de calendar a fost actualizat.' });
    } catch (error) {
      console.error('Error saving colectare settings:', error);
      toast({ title: 'Eroare', description: 'Salvarea a eșuat.', variant: 'destructive' });
    } finally {
      setSavingColectare(false);
    }
  };

  const section = SECTIONS[activeSection];
  const sectionItems = items[activeSection] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-teal-500/20 rounded-xl">
          <LayoutList className="h-7 w-7 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Conținut public</h1>
          <p className="text-gray-400 text-sm">
            Evenimente, lucrări, consilieri și calendarul de colectare — editabile fără programator
          </p>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-lg bg-slate-800 border border-slate-700 p-1">
          <TabsTrigger value="evenimente" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Evenimente
          </TabsTrigger>
          <TabsTrigger value="lucrari" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Lucrări
          </TabsTrigger>
          <TabsTrigger value="consilieri" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Consilieri
          </TabsTrigger>
          <TabsTrigger value="colectare" className="rounded-md py-2 text-gray-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Colectare
          </TabsTrigger>
        </TabsList>

        {/* List-based sections */}
        {Object.keys(SECTIONS).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {(items[key] || []).length === 0
                  ? 'Nimic publicat încă — aplicația afișează conținutul demonstrativ implicit.'
                  : `${(items[key] || []).length} elemente publicate.`}
              </p>
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-1.5 h-4 w-4" /> Adaugă {SECTIONS[key].singular}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              (items[key] || []).map((item) => (
                <Card key={item.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{item[SECTIONS[key].titleKey]}</p>
                      <p className="text-sm text-gray-400 truncate">{SECTIONS[key].subtitle(item)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="text-gray-300 hover:text-white hover:bg-slate-700">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(item)} className="text-rose-300 hover:text-rose-200 hover:bg-rose-600/20">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}

        {/* Colectare settings */}
        <TabsContent value="colectare" className="mt-4">
          <Card className="bg-slate-800 border-slate-700 max-w-xl">
            <CardHeader>
              <CardTitle className="text-white text-lg">Calendar colectare selectivă</CardTitle>
              <CardDescription className="text-gray-400">
                Linkul către calendarul publicat de operatorul de salubritate (imagine sau PDF).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-200">Link calendar</Label>
                <Input
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Eticheta butonului</Label>
                <Input
                  value={calendarLabel}
                  onChange={(e) => setCalendarLabel(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button onClick={saveColectare} disabled={savingColectare} className="w-full bg-teal-600 hover:bg-teal-700">
                {savingColectare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvează
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit dialog (schema-driven). Rendered only for list-based
          sections: on the "Colectare" tab SECTIONS[activeSection] is
          undefined, and JSX children evaluate eagerly even with the dialog
          closed - without this guard, section.singular crashes the page. */}
      {section && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? `Editează ${section.singular}` : `Adaugă ${section.singular}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-gray-200">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    rows={field.asList ? 4 : 3}
                    placeholder={field.placeholder}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={form[field.key] || ''}
                    onValueChange={(v) => setForm({ ...form, [field.key]: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Alege..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
              >
                Anulează
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 hover:bg-teal-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvează
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Șterge acest element?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {deleteTarget
                ? `„${deleteTarget[SECTIONS[activeSection].titleKey] || 'Element'}” va fi șters definitiv de pe site. Această acțiune nu poate fi anulată.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
