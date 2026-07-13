'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, Plus, Paperclip, X, CheckCircle2, PenLine } from 'lucide-react';
import { generateRegistruNumber } from '@/lib/utils/generateRegistruNumber';
import { db, storage, COLLECTIONS, TipDocument, StatusRegistru } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG, DEPARTMENTS_LIST } from '@/types/registru';
import { collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

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

export default function IntrareNouaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [registruNumber, setRegistruNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Scans/photos of the physical document (paper brought to the ghiseu)
  const [fisiere, setFisiere] = useState<File[]>([]);
  // After save: show the number big on screen instead of redirecting
  const [savedNumber, setSavedNumber] = useState<string | null>(null);

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

  const generateNumber = async () => {
    setLoading(true);
    try {
      const number = await generateRegistruNumber();
      setRegistruNumber(number);
    } catch (error) {
      console.error('Error generating number:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut genera numărul de înregistrare',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate registration number on page load
  useEffect(() => {
    generateNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register the next physical document from the ghiseu without leaving
  const handleInregistreazaAltul = () => {
    form.reset();
    setFisiere([]);
    setSavedNumber(null);
    setRegistruNumber('');
    generateNumber();
  };

  const onSubmit = async (values: FormValues) => {
    if (!registruNumber) {
      toast({
        title: 'Eroare',
        description: 'Numărul de înregistrare nu a fost generat',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.REGISTRU_GENERAL), {
        numarInregistrare: registruNumber,
        tipDocument: values.tipDocument,
        dataInregistrare: Timestamp.now(),
        dataExterna: values.dataExterna || null,
        numarExtern: values.numarExtern || null,
        emitent: values.emitent,
        adresaEmitent: values.adresaEmitent || null,
        emailEmitent: values.emailEmitent || null,
        destinatar: values.destinatar,
        adresaDestinatar: values.adresaDestinatar || null,
        emailDestinatar: values.emailDestinatar || null,
        continut: values.continut,
        departament: values.departament || null,
        observatii: values.observatii || null,
        status: 'nou' as StatusRegistru,
        // Unified registry fields: manual entries are intrari on paper,
        // with the same 30-day legal response deadline (OG 27/2002)
        sursa: 'manual',
        directie: 'intrare',
        termen: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: Timestamp.now(),
      });

      // Scans/photos of the paper document (best effort per file; the
      // entry itself is already registered)
      if (fisiere.length > 0) {
        const uploaded: { name: string; storagePath: string; size: number; type: string }[] = [];
        for (const file of fisiere) {
          try {
            const safeName = file.name.replace(/[^\w.\-()\s]/g, '_');
            const storagePath = `registru/${docRef.id}/${safeName}`;
            await uploadBytes(ref(storage, storagePath), file, {
              contentType: file.type || 'application/octet-stream',
            });
            uploaded.push({ name: safeName, storagePath, size: file.size, type: file.type });
          } catch (uploadError) {
            console.error('Error uploading attachment:', file.name, uploadError);
            toast({
              title: 'Atenție',
              description: `Fișierul ${file.name} nu s-a putut încărca`,
              variant: 'destructive',
            });
          }
        }
        if (uploaded.length > 0) {
          await updateDoc(docRef, { fisiere: uploaded });
        }
      }

      // Show the number big on screen: the clerk writes it BY HAND on
      // the physical document (no printed receipt - saves paper)
      setSavedNumber(registruNumber);
    } catch (error: any) {
      console.error('Error saving document:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut salva documentul',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi
          </Button>
          <h1 className="text-2xl font-bold text-white">Creeaza Inregistrare / Intrare Noua</h1>
        </div>
        <p className="text-gray-400 text-sm ml-12">Formular de creare</p>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {savedNumber ? (
          /* Success screen: the clerk copies the number onto the paper */
          <div className="max-w-xl mx-auto mt-10">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-5">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <p className="text-gray-300">Document înregistrat cu numărul</p>
                <p className="mt-2 font-mono text-4xl font-bold text-emerald-300 tracking-wide">
                  {savedNumber}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  din {new Date().toLocaleDateString('ro-RO')}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <PenLine className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  <span className="font-semibold">Scrieți de mână numărul și data pe documentul fizic</span>{' '}
                  și comunicați-le persoanei care l-a depus. Nu se tipărește bon — numărul de pe
                  document este dovada înregistrării.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button
                  onClick={handleInregistreazaAltul}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Înregistrează alt document
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/registru')}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  Înapoi la registru
                </Button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Informatii Generale */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Informatii generale</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Registration Number - Read Only */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Nr. Inregistrare</label>
                    <div className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white font-mono text-sm">
                      {registruNumber}
                    </div>
                  </div>

                {/* Document Type */}
                <FormField
                  control={form.control}
                  name="tipDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Tip Document</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {Object.entries(TIP_DOCUMENT_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="text-gray-300">
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Archive Number */}
                <FormField
                  control={form.control}
                  name="dataExterna"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Data externa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* External Number */}
                <FormField
                  control={form.control}
                  name="numarExtern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Nr. emitent</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Numar emitent"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sender */}
                <FormField
                  control={form.control}
                  name="emitent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Emitent</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Selecteaza emitent" />
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

                {/* Sender Address */}
                <FormField
                  control={form.control}
                  name="adresaEmitent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Adresa Emitent</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Adresa emitent"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Continut Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Continut</h2>

              <FormField
                control={form.control}
                name="continut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Text continut</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Introduceti continutul documentului..."
                        rows={8}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 resize-none"
                      />
                    </FormControl>
                    <div className="text-right text-xs text-gray-400 mt-2">
                      {field.value.length} / 2500
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scanned document Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-400" />
                Document scanat (opțional)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Atașează scanul sau o poză a documentului fizic — pe telefon/tabletă poți
                fotografia direct. Rămâne atașat intrării din registru.
              </p>
              <Input
                type="file"
                multiple
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  const tooBig = selected.filter((f) => f.size > 10 * 1024 * 1024);
                  if (tooBig.length > 0) {
                    toast({
                      title: 'Fișier prea mare',
                      description: `${tooBig.map((f) => f.name).join(', ')} depășește 10MB`,
                      variant: 'destructive',
                    });
                  }
                  setFisiere((prev) => [
                    ...prev,
                    ...selected.filter((f) => f.size <= 10 * 1024 * 1024),
                  ]);
                  e.target.value = '';
                }}
                className="bg-slate-700 border-slate-600 text-white file:text-gray-300"
              />
              {fisiere.length > 0 && (
                <div className="mt-3 space-y-2">
                  {fisiere.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFisiere((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-rose-300 hover:bg-rose-600/20 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Email</h2>

              <FormField
                control={form.control}
                name="emailEmitent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Email Emitent</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com"
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Attribution Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Atributie Inregistrare</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Department */}
                <FormField
                  control={form.control}
                  name="departament"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Departamente (optional)</FormLabel>
                      <Select value={field.value || ''} onValueChange={(value) => field.onChange(value || null)}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Selecteaza departament" />
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

                {/* Recipient */}
                <FormField
                  control={form.control}
                  name="destinatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Destinatar</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Destinatar document"
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observatii"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Observatii</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Adaugati observatii..."
                        rows={4}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Anuleza
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Se salveaza...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Salveaza Inregistrare
                  </>
                )}
              </Button>
            </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
