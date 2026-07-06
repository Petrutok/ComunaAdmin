'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2, CheckCircle } from 'lucide-react';
import { generateRegistruNumber } from '@/lib/utils/generateRegistruNumber';
import { db, COLLECTIONS, RegistruDocument, TipDocument, StatusRegistru } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG, DEPARTMENTS_LIST } from '@/types/registru';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface IntrareNouaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  tipDocument: z.enum([
    'adresa',
    'dispozitie',
    'hotarare',
    'raport',
    'cerere',
    'notificare',
    'proces_verbal',
    'nota_interna',
    'altele',
  ] as const),
  dataExterna: z.string().optional(),
  numarExtern: z.string().optional(),
  emitent: z.string().min(1, 'Emitentul este obligatoriu'),
  adresaEmitent: z.string().optional(),
  emailEmitent: z.string().email('Email invalid').optional().or(z.literal('')),
  destinatar: z.string().min(1, 'Destinatarul este obligatoriu'),
  adresaDestinatar: z.string().optional(),
  emailDestinatar: z.string().email('Email invalid').optional().or(z.literal('')),
  continut: z.string().min(10, 'Conținutul trebuie să aibă cel puțin 10 caractere'),
  departament: z.string().optional(),
  observatii: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function IntrareNouaDialog({
  open,
  onOpenChange,
  onSuccess,
}: IntrareNouaDialogProps) {
  const [tab, setTab] = useState<'complete' | 'number-only'>('complete');
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipDocument: 'adresa',
      dataExterna: '',
      numarExtern: '',
      emitent: '',
      adresaEmitent: '',
      emailEmitent: '',
      destinatar: '',
      adresaDestinatar: '',
      emailDestinatar: '',
      continut: '',
      departament: '',
      observatii: '',
    },
  });

  // Generate number when dialog opens
  useEffect(() => {
    if (open && !registrationNumber) {
      generateNumberOnOpen();
    }
  }, [open]);

  const generateNumberOnOpen = async () => {
    try {
      setGeneratingNumber(true);
      const number = await generateRegistruNumber();
      setRegistrationNumber(number);
    } catch (error) {
      console.error('Error generating registration number:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut genera numărul de înregistrare',
        variant: 'destructive',
      });
    } finally {
      setGeneratingNumber(false);
    }
  };

  const copyNumberToClipboard = () => {
    if (!registrationNumber) return;
    navigator.clipboard.writeText(registrationNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
    toast({
      title: 'Copiat',
      description: 'Numărul a fost copiat în clipboard',
    });
  };

  const onSubmitCompleteForm = async (values: FormValues) => {
    if (!registrationNumber) return;

    try {
      setSavingDocument(true);

      const newDocument: Omit<RegistruDocument, 'id'> = {
        numarInregistrare: registrationNumber,
        tipDocument: values.tipDocument as TipDocument,
        dataInregistrare: Timestamp.now(),
        dataExterna: values.dataExterna || undefined,
        numarExtern: values.numarExtern || undefined,
        emitent: values.emitent,
        adresaEmitent: values.adresaEmitent || undefined,
        emailEmitent: values.emailEmitent || undefined,
        destinatar: values.destinatar,
        adresaDestinatar: values.adresaDestinatar || undefined,
        emailDestinatar: values.emailDestinatar || undefined,
        continut: values.continut,
        observatii: values.observatii || undefined,
        departament: values.departament || undefined,
        status: 'nou' as StatusRegistru,
        creatDe: 'admin', // TODO: Get from current user
        creatDeNume: 'Administrator', // TODO: Get from current user
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, COLLECTIONS.REGISTRU_GENERAL), newDocument);

      toast({
        title: 'Succes',
        description: `Document "${registrationNumber}" a fost salvat`,
      });

      // Reset and close
      form.reset();
      setRegistrationNumber(null);
      setTab('complete');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut salva documentul',
        variant: 'destructive',
      });
    } finally {
      setSavingDocument(false);
    }
  };

  const onSubmitNumberOnly = async (values: FormValues) => {
    if (!registrationNumber) return;

    try {
      setSavingDocument(true);

      // Create minimal document with just basic info and the number
      const newDocument: Omit<RegistruDocument, 'id'> = {
        numarInregistrare: registrationNumber,
        tipDocument: values.tipDocument as TipDocument,
        dataInregistrare: Timestamp.now(),
        emitent: values.emitent || 'Nespecificat',
        destinatar: values.destinatar || 'Nespecificat',
        continut: values.continut || '(Document creat manual)',
        status: 'nou' as StatusRegistru,
        creatDe: 'admin',
        creatDeNume: 'Administrator',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, COLLECTIONS.REGISTRU_GENERAL), newDocument);

      toast({
        title: 'Succes',
        description: `Document "${registrationNumber}" a fost înregistrat`,
      });

      // Reset and close
      setRegistrationNumber(null);
      setTab('complete');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut salva documentul',
        variant: 'destructive',
      });
    } finally {
      setSavingDocument(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setRegistrationNumber(null);
    setTab('complete');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            📄 Intrare Nouă
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Adaugă un document nou la registru
          </DialogDescription>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setTab('complete')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'complete'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📝 Formular Complet
          </button>
          <button
            onClick={() => setTab('number-only')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'number-only'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            #️⃣ Doar Număr
          </button>
        </div>

        <div className="mt-6">
          {/* TAB 1: COMPLETE FORM */}
          {tab === 'complete' && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitCompleteForm)}
                className="space-y-6"
              >
                {/* Registration Number Display */}
                <div className="bg-blue-500/10 border border-blue-400/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Numărul de înregistrare:</p>
                      <p className="font-mono font-bold text-blue-300 text-xl">
                        {registrationNumber ? registrationNumber : 'Se generează...'}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">(Auto-generat)</p>
                    </div>
                    {registrationNumber && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={copyNumberToClipboard}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copiedNumber ? 'Copiat!' : 'Copiază'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Document Type */}
                <FormField
                  control={form.control}
                  name="tipDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Tip Document *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {(
                            [
                              'adresa',
                              'dispozitie',
                              'hotarare',
                              'raport',
                              'cerere',
                              'notificare',
                              'proces_verbal',
                              'nota_interna',
                              'altele',
                            ] as TipDocument[]
                          ).map((type) => (
                            <SelectItem key={type} value={type} className="text-gray-300">
                              <span className="mr-2">{TIP_DOCUMENT_CONFIG[type].icon}</span>
                              {TIP_DOCUMENT_CONFIG[type].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* External Data */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numarExtern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Nr. Extern (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 123/2025"
                            {...field}
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataExterna"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Data Externă (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="dd.mm.yyyy"
                            {...field}
                            type="date"
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Sender Section */}
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    👤 EMITENT (Expeditor)
                  </h3>

                  <FormField
                    control={form.control}
                    name="emitent"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel className="text-gray-300">Nume Emitent *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Numele persoanei sau organizației"
                            {...field}
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adresaEmitent"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel className="text-gray-300">Adresă Emitent (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Adresa completă"
                            {...field}
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emailEmitent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email Emitent (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com"
                            {...field}
                            type="email"
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Recipient Section */}
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📨 DESTINATAR
                  </h3>

                  <FormField
                    control={form.control}
                    name="destinatar"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel className="text-gray-300">Nume Destinatar *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Primăria, organizație, etc."
                            {...field}
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adresaDestinatar"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel className="text-gray-300">Adresă Destinatar (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Adresa completă"
                            {...field}
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emailDestinatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email Destinatar (opțional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com"
                            {...field}
                            type="email"
                            className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Content */}
                <FormField
                  control={form.control}
                  name="continut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Conținut Document *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrierea documentului..."
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500 resize-none"
                          rows={5}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 mt-1">
                        {field.value.length} / 2500 caractere
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department */}
                <FormField
                  control={form.control}
                  name="departament"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Departament (opțional)</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Selectează departament" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {DEPARTMENTS_LIST.map((dept) => (
                            <SelectItem key={dept} value={dept} className="text-gray-300">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="observatii"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Observații (opțional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observații interne despre document..."
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500 resize-none"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={savingDocument}
                  >
                    Anulează
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={savingDocument || !registrationNumber}
                  >
                    {savingDocument ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Se salvează...
                      </>
                    ) : (
                      <>
                        💾 Salvează Document
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {/* TAB 2: NUMBER ONLY */}
          {tab === 'number-only' && (
            <div className="space-y-6">
              {/* Generated Number Display */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 p-8 rounded-lg text-center">
                <p className="text-gray-400 mb-2">🎯 NUMĂRUL GENERAT</p>
                <p className="font-mono font-bold text-4xl text-blue-300 tracking-wider mb-4">
                  {registrationNumber}
                </p>
                <Button
                  onClick={copyNumberToClipboard}
                  className={`${
                    copiedNumber
                      ? 'bg-emerald-600 hover:bg-emerald-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {copiedNumber ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copiat!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiază Numărul
                    </>
                  )}
                </Button>

                <div className="mt-6 p-4 bg-slate-700/30 border border-slate-600/30 rounded">
                  <p className="text-gray-300 text-sm">
                    ℹ️ Numărul a fost generat și salvat. Poți să-l folosești în documentele
                    Word/PDF create manual.
                  </p>
                </div>
              </div>

              {/* Quick Complete Form */}
              <div className="border-t border-slate-700 pt-6">
                <p className="text-gray-400 text-sm mb-4">Detalii rapide (opțional):</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Tip Document</label>
                    <Select
                      value={form.getValues('tipDocument')}
                      onValueChange={(value) =>
                        form.setValue('tipDocument', value as TipDocument)
                      }
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {(
                          [
                            'adresa',
                            'dispozitie',
                            'hotarare',
                            'raport',
                            'cerere',
                            'notificare',
                            'proces_verbal',
                            'nota_interna',
                            'altele',
                          ] as TipDocument[]
                        ).map((type) => (
                          <SelectItem key={type} value={type} className="text-gray-300">
                            <span className="mr-2">{TIP_DOCUMENT_CONFIG[type].icon}</span>
                            {TIP_DOCUMENT_CONFIG[type].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Emitent</label>
                    <Input
                      placeholder="Cine a creat documentul?"
                      value={form.getValues('emitent')}
                      onChange={(e) => form.setValue('emitent', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Destinatar</label>
                    <Input
                      placeholder="Pentru cine este?"
                      value={form.getValues('destinatar')}
                      onChange={(e) => form.setValue('destinatar', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Scurt rezumat</label>
                    <Textarea
                      placeholder="Ce conține documentul?"
                      value={form.getValues('continut')}
                      onChange={(e) => form.setValue('continut', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Închide
                </Button>
                <Button
                  onClick={() => {
                    form.handleSubmit(onSubmitNumberOnly)();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={savingDocument || !registrationNumber}
                >
                  {savingDocument ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    <>
                      💾 Salvează Minimal
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
