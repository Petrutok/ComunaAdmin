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
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { generateRegistruNumber } from '@/lib/utils/generateRegistruNumber';
import { db, COLLECTIONS, TipDocument, StatusRegistru } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG, DEPARTMENTS_LIST } from '@/types/registru';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

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

  // Generate registration number on page load
  useEffect(() => {
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
    generateNumber();
  }, [toast]);

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
      await addDoc(collection(db, COLLECTIONS.REGISTRU_GENERAL), {
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
        createdAt: Timestamp.now(),
      });

      toast({
        title: 'Succes',
        description: `Documentul ${registruNumber} a fost înregistrat cu succes`,
      });

      // Redirect back to registru page
      router.push('/admin/registru');
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
        {loading ? (
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
