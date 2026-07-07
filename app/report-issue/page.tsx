"use client";

import {useState, useEffect} from 'react';
import {useToast} from "@/hooks/use-toast";
import {useRouter} from "next/navigation";
import {auth} from '@/lib/firebase';
import {useCitizenAuth} from '@/contexts/CitizenAuthContext';

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Info, Upload, CheckCircle, AlertTriangle, Home, MapPin, Camera} from "lucide-react";

// Cloudinary configuration
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const CLOUDINARY_CLOUD_NAME = "dckmiwgqq";

// Problem types
const problemTypes = [
  { value: 'infrastructura', label: 'Infrastructură', icon: '🏗️' },
  { value: 'iluminat', label: 'Iluminat public', icon: '💡' },
  { value: 'gunoi', label: 'Colectare gunoi', icon: '🗑️' },
  { value: 'vandalism', label: 'Vandalism', icon: '⚠️' },
  { value: 'general', label: 'General', icon: '📌' },
  { value: 'altele', label: 'Altele', icon: '📋' }
];

export default function ReportIssuePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [problemType, setProblemType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const {toast} = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasGeolocation, setHasGeolocation] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [reportId, setReportId] = useState<string>('');
  const { user: citizenUser, profile: citizenProfile } = useCitizenAuth();

  // Prefill for logged-in citizens (only if fields are still empty)
  useEffect(() => {
    if (!citizenUser) return;
    setName(prev => prev || citizenProfile?.numeComplet || citizenUser.displayName || '');
    setContact(prev => prev || citizenUser.email || '');
  }, [citizenUser, citizenProfile]);

  useEffect(() => {
    if (navigator.geolocation) {
      setHasGeolocation(true);
    } else {
      console.log("Geolocation is not supported by this browser.");
      toast({
        variant: 'destructive',
        title: 'Eroare Geolocație',
        description: 'Geolocația nu este suportată de acest browser.',
      });
    }
  }, []);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !contact || !location || !description) {
      toast({
        variant: 'destructive',
        title: 'Informații lipsă',
        description: 'Vă rugăm să completați toate câmpurile obligatorii.',
      });
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting issue...");

    try {
      let uploadedImageUrl = '';

      // Upload image to Cloudinary if present
      if (image) {
        setUploadingImage(true);
        try {
          uploadedImageUrl = await uploadToCloudinary(image);
          console.log('Image uploaded successfully:', uploadedImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
          toast({
            title: 'Avertisment imagine',
            description: 'Nu am putut încărca imaginea, dar raportul va fi trimis.',
            variant: 'default',
          });
        } finally {
          setUploadingImage(false);
        }
      }

      // Get problem type label for title
      const typeLabel = problemTypes.find(t => t.value === problemType)?.label || 'General';

      // Parse coordinates safely if present
      let coordinates = null;
      if (location.includes('Lat:')) {
        try {
          const latMatch = location.match(/Lat:\s*([-\d.]+)/);
          const lngMatch = location.match(/Lng:\s*([-\d.]+)/);
          if (latMatch && lngMatch) {
            const lat = parseFloat(latMatch[1]);
            const lng = parseFloat(lngMatch[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              coordinates = { lat, lng };
            }
          }
        } catch (e) {
          console.warn('Failed to parse coordinates:', e);
        }
      }

      // Prepare data for API
      const reportData = {
        name,
        contact,
        location,
        description,
        type: problemType,
        priority,
        title: `Problemă ${typeLabel} - ${location.substring(0, 50)}`,
        imageUrl: uploadedImageUrl,
        coordinates
      };

      // Logged-in citizens get the issue linked to their account (Dosarul meu)
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);

      // Send to API
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(reportData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('Issue reported successfully!', result);
        
        // Save report ID for display
        setReportId(result.reportId || result.id);
        
        // Show success dialog
        setShowSuccessDialog(true);

        // Reset form
        setName('');
        setContact('');
        setLocation('');
        setDescription('');
        setProblemType('general');
        setPriority('medium');
        setImage(null);
        setImageUrl('');
        
      } else {
        throw new Error(result.error || 'Failed to submit issue');
      }

    } catch (error: unknown) {
      console.error("Error submitting issue:", error);
      
      let errorMessage = 'A apărut o eroare necunoscută';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Eroare la trimitere',
        description: `Nu am putut trimite raportul: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            setLocation(`Lat: ${lat}, Lng: ${lng}`);
            
            toast({
              title: 'Locație preluată',
              description: 'Locația dvs. curentă a fost adăugată.',
            });
          } catch (err) {
            console.error("Error processing location:", err);
            toast({
              variant: 'destructive',
              title: 'Eroare procesare locație',
              description: 'Nu am putut procesa coordonatele GPS.',
            });
          }
        },
        (error: GeolocationPositionError) => {
          console.error("Error getting location - Code:", error.code, "Message:", error.message);
          
          let errorMessage = 'Nu am putut prelua locația';
          
          // Folosim error.code care este un număr
          if (error.code === 1) { // PERMISSION_DENIED
            errorMessage = 'Accesul la locație a fost refuzat. Vă rugăm să activați permisiunile de locație.';
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            errorMessage = 'Informațiile despre locație nu sunt disponibile.';
          } else if (error.code === 3) { // TIMEOUT
            errorMessage = 'Cererea de locație a expirat.';
          }
          
          toast({
            variant: 'destructive',
            title: 'Eroare locație',
            description: errorMessage,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        variant: 'destructive',
        title: 'Eroare Geolocație',
        description: 'Geolocația nu este suportată de acest browser.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-4xl mx-auto">
        {/* Home Button */}
        <button
          onClick={() => window.location.href = '/'}
          className="fixed top-4 left-4 z-50 group"
        >
          <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
            <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-semibold">
              Acasă
            </span>
          </div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity -z-10"></div>
        </button>

        {/* Header */}
        <div className="text-center pt-16 pb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-red-500 rounded-xl mb-4">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Raportează o Problemă
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Ajută-ne să îmbunătățim comunitatea raportând problemele întâmpinate
          </p>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">Informație importantă</h3>
              <p className="text-gray-300 text-sm">
                Raportul dvs. va fi înregistrat în sistemul nostru și procesat de echipa responsabilă. 
                Veți primi o confirmare pe email cu numărul de înregistrare.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-slate-800/80 border-slate-700 rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* --- Sectiunea 1: Problema --- */}
              <div className="space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                  Problema
                </h2>

                {/* Problem type - visual tile grid instead of dropdown */}
                <div className="space-y-2">
                  <Label className="text-white">Ce fel de problemă? *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {problemTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setProblemType(type.value)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all ${
                          problemType === type.value
                            ? 'border-red-500 bg-red-500/15 text-white'
                            : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">
                    Descrie problema *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ce s-a întâmplat, de când, cât de gravă e situația..."
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 rounded-xl"
                    required
                  />
                </div>

                {/* Photo - friendly upload zone */}
                <div className="space-y-2">
                  <Label className="text-white">Poză (opțional, ajută mult)</Label>
                  <label
                    htmlFor="image"
                    className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-700/30 p-4 transition-colors hover:border-slate-500 hover:bg-slate-700/50"
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="h-20 w-20 rounded-lg object-cover border border-slate-600"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{image?.name}</p>
                          <p className="text-sm text-gray-400">
                            {image ? (image.size / 1024 / 1024).toFixed(2) : ''} MB · apasă pentru a schimba
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl bg-slate-700 p-3">
                          <Camera className="h-7 w-7 text-gray-300" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Adaugă o poză</p>
                          <p className="text-sm text-gray-400">Fotografiază problema direct de pe telefon</p>
                        </div>
                      </>
                    )}
                  </label>
                  <Input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">
                    Unde se află? *
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Strada, numărul sau un reper cunoscut"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                    {hasGeolocation && (
                      <Button
                        type="button"
                        onClick={getCurrentLocation}
                        className="shrink-0 rounded-xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Folosește locația mea
                      </Button>
                    )}
                  </div>
                </div>

                {/* Priority - colored pills instead of dropdown */}
                <div className="space-y-2">
                  <Label className="text-white">Cât de urgentă e?</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'low', label: 'Scăzută', dot: 'bg-gray-400', active: 'border-gray-400 bg-gray-500/15' },
                      { value: 'medium', label: 'Medie', dot: 'bg-blue-400', active: 'border-blue-400 bg-blue-500/15' },
                      { value: 'high', label: 'Ridicată', dot: 'bg-orange-400', active: 'border-orange-400 bg-orange-500/15' },
                      { value: 'urgent', label: 'Urgentă', dot: 'bg-red-400', active: 'border-red-400 bg-red-500/15' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-all ${
                          priority === p.value
                            ? `${p.active} text-white`
                            : 'border-slate-600 bg-slate-700/50 text-gray-400 hover:border-slate-500'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${p.dot}`}></span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- Sectiunea 2: Datele tale --- */}
              <div className="space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                  Datele tale
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">
                      Nume complet *
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ion Popescu"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-white">
                      Telefon sau email *
                    </Label>
                    <Input
                      type="text"
                      id="contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="07xx xxx xxx sau email@exemplu.ro"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting || uploadingImage}
                className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-6 text-base font-semibold text-white shadow-lg transition-all hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <>
                    <Upload className="mr-2 h-5 w-5 animate-pulse" />
                    Se încarcă imaginea...
                  </>
                ) : isSubmitting ? (
                  <>
                    <div className="mr-2 h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Se trimite raportul...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Trimite sesizarea
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-center mb-3 text-white">
                Problemă Raportată! 🎉
              </DialogTitle>
              <DialogDescription className="text-center text-base leading-relaxed px-4 text-gray-300">
                Am primit raportul tău și echipa noastră va analiza problema cât mai repede.
              </DialogDescription>
              {reportId && (
                <div className="mt-3 p-3 bg-slate-700 rounded-lg mx-4">
                  <p className="text-sm text-gray-400">Număr înregistrare:</p>
                  <p className="text-lg font-semibold text-white">{reportId}</p>
                </div>
              )}
              <p className="mt-3 text-gray-400 text-sm px-4">
                Te vom contacta dacă avem nevoie de mai multe detalii.
              </p>
              {citizenUser ? (
                <p className="mt-3 text-sm text-gray-300 px-4">
                  Sesizarea a fost salvată în{' '}
                  <button
                    onClick={() => router.push('/dosarul-meu')}
                    className="text-blue-400 hover:underline font-medium"
                  >
                    Dosarul meu
                  </button>
                  {' '}— primești notificare când e rezolvată.
                </p>
              ) : (
                <div className="mt-3 mx-4 rounded-lg border border-blue-500/30 bg-blue-900/10 px-4 py-3 text-sm text-left">
                  <p className="text-gray-200 font-medium">Vrei să urmărești această sesizare?</p>
                  <p className="text-gray-400 mt-1">
                    Cu un cont gratuit, sesizările tale apar în „Dosarul meu" și primești
                    notificare când sunt rezolvate.
                  </p>
                  <Button
                    onClick={() => router.push('/cont')}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Creează cont gratuit
                  </Button>
                </div>
              )}
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              >
                Raportează altă problemă
              </Button>
              <Button
                onClick={() => router.push('/')}
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-gray-100"
              >
                Pagina principală →
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}