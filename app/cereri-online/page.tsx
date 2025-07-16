'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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
  FileCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const REQUEST_TYPES = {
  'adeverinta-domiciliu': {
    label: 'Adeverință de domiciliu',
    description: 'Pentru acte, înmatriculări, etc.',
    icon: '🏠'
  },
  'adeverinta-apia': {
    label: 'Adeverință APIA',
    description: 'Pentru dosare APIA și subvenții agricole',
    icon: '🌾'
  },
  'declaratie-proprie': {
    label: 'Declarație pe propria răspundere',
    description: 'Declarație cu valoare juridică',
    icon: '📝'
  },
  'audienta-primar': {
    label: 'Audiență la primar',
    description: 'Solicitare întâlnire cu primarul',
    icon: '🤝'
  },
  'spatiu-verde': {
    label: 'Spațiu verde / Teren',
    description: 'Solicitare atribuire teren',
    icon: '🌳'
  },
  'eliberare-documente': {
    label: 'Eliberare documente',
    description: 'Certificate, copii, extrase',
    icon: '📄'
  },
  'alte-cereri': {
    label: 'Alte cereri',
    description: 'Orice altă solicitare',
    icon: '📋'
  }
};

export default function CereriOnlinePage() {
  const [formData, setFormData] = useState({
    numeComplet: '',
    cnp: '',
    localitate: '',
    adresa: '',
    telefon: '',
    email: '',
    tipCerere: '',
    scopulCererii: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validări
    if (!formData.tipCerere) {
      toast({
        title: "Eroare",
        description: "Selectează tipul cererii",
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
    
    try {
      const response = await fetch('/api/trimite-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccess(true);
        // Reset form
        setFormData({
          numeComplet: '',
          cnp: '',
          localitate: '',
          adresa: '',
          telefon: '',
          email: '',
          tipCerere: '',
          scopulCererii: '',
        });
      } else {
        toast({
          title: "Eroare",
          description: result.error || "Nu s-a putut trimite cererea",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Eroare",
        description: "Eroare de conexiune. Încearcă din nou.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
        </button>

        {/* Header */}
        <div className="text-center pt-16 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-xl mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Cereri Online
          </h1>
          
          <p className="text-lg text-gray-300">
            Completează și trimite cereri direct către primărie
          </p>
        </div>

        {/* Main Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Formular cerere</CardTitle>
            <CardDescription className="text-gray-400">
              Toate câmpurile marcate cu * sunt obligatorii
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tip cerere */}
              <div className="space-y-2">
                <Label htmlFor="tipCerere" className="text-gray-200">
                  Tip cerere *
                </Label>
                <Select
                  value={formData.tipCerere}
                  onValueChange={(value) => setFormData({ ...formData, tipCerere: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Selectează tipul cererii" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REQUEST_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date personale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeComplet" className="text-gray-200">
                    <User className="inline h-4 w-4 mr-1" />
                    Nume complet *
                  </Label>
                  <Input
                    id="numeComplet"
                    value={formData.numeComplet}
                    onChange={(e) => setFormData({ ...formData, numeComplet: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="Ion Popescu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnp" className="text-gray-200">
                    CNP *
                  </Label>
                  <Input
                    id="cnp"
                    value={formData.cnp}
                    onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
                    required
                    maxLength={13}
                    pattern="\d{13}"
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="1234567890123"
                  />
                </div>
              </div>

              {/* Adresă */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="localitate" className="text-gray-200">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Localitate *
                  </Label>
                  <Input
                    id="localitate"
                    value={formData.localitate}
                    onChange={(e) => setFormData({ ...formData, localitate: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="Comuna, Sat"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresa" className="text-gray-200">
                    Adresă completă *
                  </Label>
                  <Input
                    id="adresa"
                    value={formData.adresa}
                    onChange={(e) => setFormData({ ...formData, adresa: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="Str. Principală, Nr. 10"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefon" className="text-gray-200">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Telefon *
                  </Label>
                  <Input
                    id="telefon"
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="07xx xxx xxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="email@exemplu.ro"
                  />
                </div>
              </div>

              {/* Scop cerere */}
              <div className="space-y-2">
                <Label htmlFor="scopulCererii" className="text-gray-200">
                  Scopul cererii / Detalii *
                </Label>
                <Textarea
                  id="scopulCererii"
                  value={formData.scopulCererii}
                  onChange={(e) => setFormData({ ...formData, scopulCererii: e.target.value })}
                  required
                  rows={4}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Descrie detaliat motivul cererii tale..."
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[150px]"
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
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  Cerere trimisă cu succes!
                </DialogTitle>
                <DialogDescription className="text-gray-300 space-y-3">
                  <p>
                    Cererea ta a fost înregistrată și trimisă către primărie.
                  </p>
                  <p className="text-sm">
                    Vei primi o copie a cererii pe email-ul specificat.
                    Răspunsul va fi comunicat în maxim 30 de zile.
                  </p>
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSuccess(false)}
                  className="flex-1"
                >
                  Închide
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccess(false);
                    window.location.href = '/';
                  }}
                  className="flex-1"
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