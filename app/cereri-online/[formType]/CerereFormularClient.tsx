'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';
import { 
  FileText, 
  Send, 
  Home, 
  Loader2,
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  ArrowLeft,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REQUEST_CONFIGS } from '@/lib/simple-pdf-generator';

// Lista județelor din România
const JUDETE = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași',
  'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
  'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj',
  'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea', 'Vrancea'
];

interface CerereFormularClientProps {
  formType: string;
}

export default function CerereFormularClient({ formType }: CerereFormularClientProps) {
  const router = useRouter();
  const config = REQUEST_CONFIGS[formType];
  
  const [formData, setFormData] = useState({
    // Date personale
    nume: '',
    prenume: '',
    cnp: '',
    
    // Contact
    email: '',
    telefonMobil: '',
    telefonFix: '',
    
    // Domiciliu
    judet: 'Bacău', // Default Bacău
    localitate: '',
    strada: '',
    numar: '',
    bloc: '',
    scara: '',
    etaj: '',
    apartament: '',
    
    // Date specifice cererii
    scopulCererii: '',
    fisiere: [] as File[],
    
    // Câmpuri adiționale pentru anumite tipuri de cereri
    numeFirma: '',
    cui: '',
    nrRegistruComert: '',
    reprezentantLegal: '',
    suprafataTeren: '',
    nrCadastral: '',
    tipConstructie: '',
    suprafataConstructie: '',
    anConstructie: '',
    marcaAuto: '',
    serieSasiu: '',
    anFabricatie: '',
    capacitateCilindrica: '',
    masaMaxima: '',
    nrInmatriculare: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [successRegNumber, setSuccessRegNumber] = useState('');
  const { user: citizenUser, profile: citizenProfile } = useCitizenAuth();

  // Prefill contact fields for logged-in citizens (only if still empty)
  useEffect(() => {
    if (!citizenUser) return;
    setFormData(prev => ({
      ...prev,
      email: prev.email || citizenUser.email || '',
      telefonMobil: prev.telefonMobil || citizenProfile?.telefon || '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenUser, citizenProfile]);
  const { toast } = useToast();

  // Dacă tipul de cerere nu există, redirecționează
  useEffect(() => {
    if (!config) {
      router.push('/cereri-online');
    }
  }, [config, router]);

  if (!config) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      toast({
        title: "Eroare",
        description: "Poți încărca maxim 3 fișiere",
        variant: "destructive"
      });
      return;
    }
    setFormData({ ...formData, fisiere: files });
  };

// Alternativă pentru handleSubmit - trimite fișierele ca Base64 în JSON
// Înlocuiește funcția handleSubmit din page.tsx cu aceasta:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validări
  if (!formData.nume || !formData.prenume) {
    toast({
      title: "Eroare",
      description: "Numele și prenumele sunt obligatorii",
      variant: "destructive"
    });
    return;
  }

  if (formData.cnp.length !== 13 || !/^\d+$/.test(formData.cnp)) {
    toast({
      title: "Eroare",
      description: "CNP-ul trebuie să conțină exact 13 cifre",
      variant: "destructive"
    });
    return;
  }

  setIsSubmitting(true);
  console.log('🔄 Start trimitere cerere...');
  console.log('📎 Număr fișiere:', formData.fisiere?.length || 0);
  
  // Salvăm email-ul înainte de reset pentru dialog
  const emailForDialog = formData.email;
  
  try {
    // Construim numele complet și adresa completă
    const numeComplet = `${formData.nume} ${formData.prenume}`;
    const adresaCompleta = `Str. ${formData.strada}${formData.numar ? `, Nr. ${formData.numar}` : ''}${formData.bloc ? `, Bl. ${formData.bloc}` : ''}${formData.scara ? `, Sc. ${formData.scara}` : ''}${formData.etaj ? `, Et. ${formData.etaj}` : ''}${formData.apartament ? `, Ap. ${formData.apartament}` : ''}`;
    
    // Convertim fișierele în Base64 cu timeout și error handling
    const filesBase64 = [];
    if (formData.fisiere && formData.fisiere.length > 0) {
      console.log('📄 Procesare fișiere...');
      for (const file of formData.fisiere) {
        try {
          // Verifică dimensiunea fișierului (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: "Fișier prea mare",
              description: `${file.name} depășește 5MB`,
              variant: "destructive"
            });
            continue;
          }
          
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            
            // Timeout de 10 secunde
            const timeout = setTimeout(() => {
              reject(new Error('Timeout la citirea fișierului'));
            }, 10000);
            
            reader.onload = () => {
              clearTimeout(timeout);
              const result = reader.result as string;
              const base64String = result.split(',')[1];
              resolve(base64String);
            };
            
            reader.onerror = () => {
              clearTimeout(timeout);
              reject(reader.error);
            };
            
            reader.readAsDataURL(file);
          });
          
          filesBase64.push({
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64
          });
          console.log(`✅ Procesat: ${file.name}`);
        } catch (error) {
          console.error(`❌ Eroare la procesarea fișierului ${file.name}:`, error);
          toast({
            title: "Eroare fișier",
            description: `Nu s-a putut procesa ${file.name}`,
            variant: "destructive"
          });
        }
      }
    }
    
    // Pregătim datele pentru trimitere
    const dataToSend = {
      numeComplet,
      cnp: formData.cnp,
      localitate: formData.localitate,
      strada: formData.strada, // Adăugat
      numar: formData.numar,
      bloc: formData.bloc,
      scara: formData.scara,
      etaj: formData.etaj,
      apartament: formData.apartament,
      adresa: adresaCompleta,
      telefon: formData.telefonMobil || formData.telefonFix,
      email: formData.email,
      tipCerere: formType,
      scopulCererii: formData.scopulCererii,
      nume: formData.nume,
      prenume: formData.prenume,
      judet: formData.judet,
      telefonMobil: formData.telefonMobil,
      telefonFix: formData.telefonFix,
      // Fișierele ca Base64
      fisiere: filesBase64,
      // Câmpuri adiționale specifice
      ...(formData.numeFirma && { numeFirma: formData.numeFirma }),
      ...(formData.cui && { cui: formData.cui }),
      ...(formData.nrRegistruComert && { nrRegistruComert: formData.nrRegistruComert }),
      ...(formData.reprezentantLegal && { reprezentantLegal: formData.reprezentantLegal }),
      ...(formData.suprafataTeren && { suprafataTeren: formData.suprafataTeren }),
      ...(formData.nrCadastral && { nrCadastral: formData.nrCadastral }),
      ...(formData.tipConstructie && { tipConstructie: formData.tipConstructie }),
      ...(formData.suprafataConstructie && { suprafataConstructie: formData.suprafataConstructie }),
      ...(formData.anConstructie && { anConstructie: formData.anConstructie }),
      ...(formData.marcaAuto && { marcaAuto: formData.marcaAuto }),
      ...(formData.serieSasiu && { serieSasiu: formData.serieSasiu }),
      ...(formData.anFabricatie && { anFabricatie: formData.anFabricatie }),
      ...(formData.capacitateCilindrica && { capacitateCilindrica: formData.capacitateCilindrica }),
      ...(formData.masaMaxima && { masaMaxima: formData.masaMaxima }),
      ...(formData.nrInmatriculare && { nrInmatriculare: formData.nrInmatriculare }),
    };

    console.log('📤 Trimitere date către API...');
    
    // Logged-in citizens get the request linked to their account (Dosarul meu)
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);

    // Trimitem ca JSON normal
    const response = await fetch('/api/trimite-cerere', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(dataToSend),
    });

    const result = await response.json();

   if (result.success) {
  console.log('✅ Cerere trimisă cu succes!');

  // 1. Save email and registration number for the dialog
  setSuccessEmail(formData.email);
  setSuccessRegNumber(result.numarInregistrare || '');
  setShowSuccess(true);

  // 2. Reset the form (after a short delay so the dialog has the data)
  setTimeout(() => {
    setFormData({
      nume: '',
      prenume: '',
      cnp: '',
      email: '',
      telefonMobil: '',
      telefonFix: '',
      judet: 'Bacău',
      localitate: '',
      strada: '',
      numar: '',
      bloc: '',
      scara: '',
      etaj: '',
      apartament: '',
      scopulCererii: '',
      fisiere: [],
      numeFirma: '',
      cui: '',
      nrRegistruComert: '',
      reprezentantLegal: '',
      suprafataTeren: '',
      nrCadastral: '',
      tipConstructie: '',
      suprafataConstructie: '',
      anConstructie: '',
      marcaAuto: '',
      serieSasiu: '',
      anFabricatie: '',
      capacitateCilindrica: '',
      masaMaxima: '',
      nrInmatriculare: '',
    });
  }, 500);
    } else {
      console.error('❌ Eroare:', result.error);
      toast({
        title: "Eroare",
        description: result.error || "Nu s-a putut trimite cererea",
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    toast({
      title: "Eroare",
      description: "Eroare de conexiune. Încearcă din nou.",
      variant: "destructive"
    });
  } finally {
    setIsSubmitting(false);
  }
};

  // Verifică dacă sunt necesare câmpuri adiționale
  const needsAdditionalFields = config.additionalFields && config.additionalFields.length > 0;

  // Obține icon-ul pentru categoria cererii
  const getCategoryIcon = () => {
    switch (config.category) {
      case 'urbanism': return '🏗️';
      case 'asistenta-sociala': return '❤️';
      case 'registru-agricol': return '🌾';
      case 'taxe-impozite': return '💰';
      case 'spclep': return '👥';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Buttons */}
        <div className="flex justify-between mb-8">
          <button
            onClick={() => router.push('/cereri-online')}
            className="group"
          >
            <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
              <ArrowLeft className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Înapoi</span>
            </div>
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="group"
          >
            <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
              <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Acasă</span>
            </div>
          </button>
        </div>

        {/* Header */}
        <div className="text-center pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-xl mb-4">
            <span className="text-3xl">{getCategoryIcon()}</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {config.title}
          </h1>
          
          <p className="text-lg text-gray-300">
            Completează formularul pentru a trimite cererea
          </p>
        </div>

        {/* Alert Info */}
        <Card className="mb-6 bg-yellow-900/20 border-yellow-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                <span className="font-medium text-yellow-400">De reținut!</span> După{' '}
                <span className="text-blue-400 underline cursor-pointer">autentificare</span> (opțional) 
                și adăugarea datelor personale, câmpurile din formulare vor fi completate automat cu informațiile salvate.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Date personale */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Date personale</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nume" className="text-gray-200">
                      (*) Nume
                    </Label>
                    <Input
                      id="nume"
                      value={formData.nume}
                      onChange={(e) => setFormData({ ...formData, nume: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prenume" className="text-gray-200">
                      (*) Prenume
                    </Label>
                    <Input
                      id="prenume"
                      value={formData.prenume}
                      onChange={(e) => setFormData({ ...formData, prenume: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnp" className="text-gray-200">
                      (*) CNP
                    </Label>
                    <Input
                      id="cnp"
                      value={formData.cnp}
                      onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
                      required
                      maxLength={13}
                      pattern="\d{13}"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Adresă de email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefonMobil" className="text-gray-200">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Telefon mobil
                    </Label>
                    <Input
                      id="telefonMobil"
                      type="tel"
                      value={formData.telefonMobil}
                      onChange={(e) => setFormData({ ...formData, telefonMobil: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefonFix" className="text-gray-200">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Telefon fix
                    </Label>
                    <Input
                      id="telefonFix"
                      type="tel"
                      value={formData.telefonFix}
                      onChange={(e) => setFormData({ ...formData, telefonFix: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Domiciliu */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Domiciliu</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="judet" className="text-gray-200">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      (*) Județ
                    </Label>
                    <Select
                      value={formData.judet}
                      onValueChange={(value) => setFormData({ ...formData, judet: value })}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue placeholder="Selectează județul" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {JUDETE.map((judet) => (
                          <SelectItem 
                            key={judet} 
                            value={judet}
                            className="text-white hover:bg-slate-700"
                          >
                            {judet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="localitate" className="text-gray-200">
                      (*) Localitate
                    </Label>
                    <Input
                      id="localitate"
                      value={formData.localitate}
                      onChange={(e) => setFormData({ ...formData, localitate: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strada" className="text-gray-200">
                      (*) Stradă
                    </Label>
                    <Input
                      id="strada"
                      value={formData.strada}
                      onChange={(e) => setFormData({ ...formData, strada: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="numar" className="text-gray-200">
                      Număr
                    </Label>
                    <Input
                      id="numar"
                      value={formData.numar}
                      onChange={(e) => setFormData({ ...formData, numar: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloc" className="text-gray-200">
                      Bloc
                    </Label>
                    <Input
                      id="bloc"
                      value={formData.bloc}
                      onChange={(e) => setFormData({ ...formData, bloc: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scara" className="text-gray-200">
                      Scară
                    </Label>
                    <Input
                      id="scara"
                      value={formData.scara}
                      onChange={(e) => setFormData({ ...formData, scara: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="etaj" className="text-gray-200">
                      Etaj
                    </Label>
                    <Input
                      id="etaj"
                      value={formData.etaj}
                      onChange={(e) => setFormData({ ...formData, etaj: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apartament" className="text-gray-200">
                      Apartament
                    </Label>
                    <Input
                      id="apartament"
                      value={formData.apartament}
                      onChange={(e) => setFormData({ ...formData, apartament: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Câmpuri adiționale specifice tipului de cerere */}
              {needsAdditionalFields && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Date specifice cererii</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.additionalFields?.includes('numeFirma') && (
                      <div className="space-y-2">
                        <Label htmlFor="numeFirma" className="text-gray-200">
                          (*) Denumire firmă
                        </Label>
                        <Input
                          id="numeFirma"
                          value={formData.numeFirma}
                          onChange={(e) => setFormData({ ...formData, numeFirma: e.target.value })}
                          required
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('cui') && (
                      <div className="space-y-2">
                        <Label htmlFor="cui" className="text-gray-200">
                          (*) CUI
                        </Label>
                        <Input
                          id="cui"
                          value={formData.cui}
                          onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                          required
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('reprezentantLegal') && (
                      <div className="space-y-2">
                        <Label htmlFor="reprezentantLegal" className="text-gray-200">
                          Calitate reprezentant
                        </Label>
                        <Input
                          id="reprezentantLegal"
                          value={formData.reprezentantLegal}
                          onChange={(e) => setFormData({ ...formData, reprezentantLegal: e.target.value })}
                          placeholder="Administrator, Director, etc."
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('suprafataTeren') && (
                      <div className="space-y-2">
                        <Label htmlFor="suprafataTeren" className="text-gray-200">
                          (*) Suprafață teren
                        </Label>
                        <Input
                          id="suprafataTeren"
                          value={formData.suprafataTeren}
                          onChange={(e) => setFormData({ ...formData, suprafataTeren: e.target.value })}
                          required
                          placeholder="mp sau ha"
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('nrCadastral') && (
                      <div className="space-y-2">
                        <Label htmlFor="nrCadastral" className="text-gray-200">
                          Număr cadastral
                        </Label>
                        <Input
                          id="nrCadastral"
                          value={formData.nrCadastral}
                          onChange={(e) => setFormData({ ...formData, nrCadastral: e.target.value })}
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('marcaAuto') && (
                      <div className="space-y-2">
                        <Label htmlFor="marcaAuto" className="text-gray-200">
                          (*) Marca și model
                        </Label>
                        <Input
                          id="marcaAuto"
                          value={formData.marcaAuto}
                          onChange={(e) => setFormData({ ...formData, marcaAuto: e.target.value })}
                          required
                          placeholder="Ex: Dacia Logan"
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}
                    
                    {config.additionalFields?.includes('nrInmatriculare') && (
                      <div className="space-y-2">
                        <Label htmlFor="nrInmatriculare" className="text-gray-200">
                          (*) Număr înmatriculare
                        </Label>
                        <Input
                          id="nrInmatriculare"
                          value={formData.nrInmatriculare}
                          onChange={(e) => setFormData({ ...formData, nrInmatriculare: e.target.value })}
                          required
                          placeholder="Ex: BC 01 ABC"
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detalii cerere */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Detalii cerere</h3>
                <div className="space-y-2">
                  <Label htmlFor="scopulCererii" className="text-gray-200">
                    (*) Motivul cererii / Detalii adiționale
                  </Label>
                  <Textarea
                    id="scopulCererii"
                    value={formData.scopulCererii}
                    onChange={(e) => setFormData({ ...formData, scopulCererii: e.target.value })}
                    required
                    rows={4}
                    className="bg-slate-900 border-slate-600 text-white placeholder:text-gray-500"
                    placeholder={config.scopPlaceholder || "Descrie detaliat motivul cererii tale..."}
                  />
                </div>
              </div>

              {/* Upload fișiere */}
              {config.requiresAttachments && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Documente necesare</h3>
                  <div className="space-y-2">
                    <Label htmlFor="fisiere" className="text-gray-200">
                      <Upload className="inline h-4 w-4 mr-1" />
                      Încarcă documente
                    </Label>
                    <Input
                      id="fisiere"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="bg-slate-900 border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                    />
                    <p className="text-xs text-gray-400">
                      Maxim 3 fișiere. Formate acceptate: PDF, JPG, PNG, DOC, DOCX
                    </p>
                    {formData.fisiere.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {formData.fisiere.map((file, idx) => (
                          <div key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-green-400" />
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/cereri-online')}
                  disabled={isSubmitting}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[150px] bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se trimite...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Trimite cererea
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-900/20 border-blue-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileCheck className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-1">Informații importante:</p>
                <ul className="space-y-1 text-gray-400">
                  <li>• Cererea va fi generată automat în format PDF</li>
                  <li>• Vei primi o copie pe email-ul specificat</li>
                  <li>• Răspunsul va fi trimis în maxim 30 de zile</li>
                  <li>• Pentru urgențe, contactează direct primăria</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

    {/* Success Dialog */}
<Dialog open={showSuccess} onOpenChange={setShowSuccess}>
  <DialogContent className="bg-slate-800 border-slate-700">
    <DialogHeader>
      <DialogTitle className="text-2xl font-bold text-white text-center">
        Cerere trimisă cu succes!
      </DialogTitle>
     <DialogDescription className="text-gray-300 text-center mt-2">
  Cererea ta pentru {config.title} a fost înregistrată și trimisă către primărie.
  Vei primi o copie a cererii pe email-ul <strong>{successEmail}</strong>.
  Răspunsul va fi comunicat în maxim 30 de zile.
    </DialogDescription>
    </DialogHeader>
    
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20">
        <CheckCircle className="h-8 w-8 text-green-400" />
      </div>

      {successRegNumber && (
        <div className="rounded-lg border border-green-500/30 bg-green-900/10 px-4 py-3">
          <p className="text-sm text-gray-400">Număr de înregistrare</p>
          <p className="text-xl font-bold tracking-wide text-green-400">{successRegNumber}</p>
          <p className="mt-1 text-xs text-gray-400">
            Notează acest număr — cu el poți urmări cererea la primărie.
          </p>
        </div>
      )}

      {citizenUser ? (
        <p className="text-sm text-gray-300">
          Cererea a fost salvată în{' '}
          <button
            onClick={() => { setShowSuccess(false); router.push('/dosarul-meu'); }}
            className="text-blue-400 hover:underline font-medium"
          >
            Dosarul meu
          </button>
          {' '}— primești notificare când primăria o rezolvă.
        </p>
      ) : (
        <div className="rounded-lg border border-blue-500/30 bg-blue-900/10 px-4 py-3 text-sm">
          <p className="text-gray-200 font-medium">Vrei să urmărești această cerere din aplicație?</p>
          <p className="text-gray-400 mt-1">
            Creează-ți un cont gratuit și viitoarele cereri vor apărea în „Dosarul meu",
            cu notificare când sunt rezolvate.
          </p>
          <Button
            onClick={() => { setShowSuccess(false); router.push('/cont'); }}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
          >
            Creează cont gratuit
          </Button>
        </div>
      )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccess(false);
                    router.push('/cereri-online');
                  }}
                  className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Altă cerere
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccess(false);
                    router.push('/');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Înapoi acasă
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}