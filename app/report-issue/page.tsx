"use client";

import {useState, useEffect} from 'react';
import {useToast} from "@/hooks/use-toast";
import {useRouter} from "next/navigation";

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
        // Add coordinates if using geolocation
        coordinates: location.includes('Lat:') ? {
          lat: parseFloat(location.split('Lat: ')[1].split(',')[0]),
          lng: parseFloat(location.split('Lng: ')[1])
        } : null
      };

      // Send to API
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Nume complet *
                </Label>
                <Input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Introduceți numele dvs."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Contact Field */}
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-white">
                  Contact (telefon/email) *
                </Label>
                <Input
                  type="text"
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Ex: 0712345678 sau email@exemplu.ro"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Location Field */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  Locație *
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Introduceți locația problemei"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  {hasGeolocation && (
                    <Button 
                      type="button" 
                      onClick={getCurrentLocation}
                      className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Locație curentă
                    </Button>
                  )}
                </div>
              </div>

              {/* Problem Type Field */}
              <div className="space-y-2">
                <Label htmlFor="problemType" className="text-white">
                  Tip problemă *
                </Label>
                <Select value={problemType} onValueChange={setProblemType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selectează tipul problemei" />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Field */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-white">
                  Prioritate
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selectează prioritatea" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                        Scăzută
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Medie
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Ridicată
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Urgentă
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Descrierea problemei *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrieți problema în detaliu"
                  rows={5}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image" className="text-white">
                  Încărcare imagine (opțional)
                </Label>
                <div className="relative">
                  <Input 
                    type="file" 
                    id="image" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:mr-4"
                  />
                  {image && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-2">
                        Selectat: {image.name} ({(image.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      {imageUrl && (
                        <div className="relative inline-block">
                          <img 
                            src={imageUrl} 
                            alt="Preview" 
                            className="max-w-xs h-auto rounded-lg border border-slate-600"
                          />
                          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
                            <Camera className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-400">* Câmpuri obligatorii</p>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isSubmitting || uploadingImage} 
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Trimite raportul
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
                {reportId && (
                  <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-400">Număr înregistrare:</p>
                    <p className="text-lg font-semibold text-white">{reportId}</p>
                  </div>
                )}
                <span className="block mt-3 text-gray-400">
                  Vei primi o confirmare pe email și te vom contacta dacă avem nevoie de mai multe detalii.
                </span>
              </DialogDescription>
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