'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS, Job } from '@/lib/firebase';
import {
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Search,
  Filter,
  Check,
  Briefcase,
  Clock,
  Building,
  Home,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    benefits: '',
    salary: '',
    location: '',
    type: 'full-time' as Job['type'],
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.JOBS),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];
      
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newJob: Omit<Job, 'id'> = {
        title: formData.title,
        company: formData.company,
        description: formData.description,
        requirements: [],
        benefits: [],
        salary: formData.salary || undefined,
        location: formData.location,
        type: formData.type,
        contact: {
          email: formData.contactEmail,
          phone: formData.contactPhone || undefined,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, COLLECTIONS.JOBS), newJob);

      setShowAddDialog(false);
      setShowSuccessDialog(true);
      
      // Resetează formularul
      setFormData({
        title: '',
        company: '',
        description: '',
        requirements: '',
        benefits: '',
        salary: '',
        location: '',
        type: 'full-time',
        contactEmail: '',
        contactPhone: '',
      });
    } catch (error) {
      console.error('Error submitting job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite anunțul. Încearcă din nou.",
        variant: "destructive",
      });
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || job.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'full-time': return 'Full Time';
      case 'part-time': return 'Part Time';
      case 'contract': return 'Sezonier';
      case 'internship': return 'Ucenicie';
      default: return type;
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'full-time': return 'bg-green-500';
      case 'part-time': return 'bg-blue-500';
      case 'contract': return 'bg-orange-500';
      case 'internship': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleContact = (job: Job) => {
    // Dacă are telefon, preferăm telefonul
    if (job.contact.phone) {
      window.location.href = `tel:${job.contact.phone}`;
    } else if (job.contact.email) {
      window.location.href = `mailto:${job.contact.email}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
        <div className="mb-8 pt-16">
          <h1 className="text-3xl font-bold text-white mb-2">
            Locuri de Muncă în Comună
          </h1>
          <p className="text-gray-400">
            Găsește oportunități de angajare în zona ta
          </p>
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută job-uri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="contract">Sezonier</SelectItem>
                <SelectItem value="internship">Ucenicie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Publică job
          </Button>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            Se încarcă job-urile...
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <p className="text-gray-400">
                {searchTerm || selectedType !== 'all' 
                  ? 'Nu s-au găsit job-uri pentru criteriile selectate.'
                  : 'Nu există job-uri publicate încă.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-white text-xl">
                        {job.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                    </div>
                    <Badge className={getJobTypeColor(job.type)}>
                      {getJobTypeLabel(job.type)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.salary}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(job.createdAt).toLocaleDateString('ro-RO')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-300 line-clamp-3">
                      {job.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${job.contact.email}`} className="hover:text-white">
                            {job.contact.email}
                          </a>
                        </div>
                        {job.contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${job.contact.phone}`} className="hover:text-white">
                              {job.contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleContact(job)}
                      >
                        Contactează
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Job Dialog - Simplified */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Publică un job</DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează informațiile despre poziția disponibilă. Câmpurile marcate cu * sunt obligatorii.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">
                  Titlu poziție *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Ex: Vânzător, Șofer, Muncitor, Îngrijitor, Bucătar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-gray-200">
                  Firma/Angajator *
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Ex: Magazin Profi, Ferma Popescu, Restaurant La Noi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-gray-200">
                    Tip angajare *
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as Job['type'] })}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Sezonier</SelectItem>
                      <SelectItem value="internship">Ucenicie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-200">
                    Locație *
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="Comuna noastră / Oraș apropiat"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary" className="text-gray-200">
                  Salariu oferit (opțional)
                </Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Ex: 2500 RON, Negociabil, Competitiv"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">
                  Descriere job *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Descrie pe scurt: program de lucru, responsabilități principale, experiență necesară (dacă e cazul)..."
                />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-white font-medium mb-3">Date de contact</h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-gray-200">
                      Email *
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                      placeholder="email@exemplu.ro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-gray-200">
                      Telefon (opțional)
                    </Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                      placeholder="07xx xxx xxx"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Anulează
                </Button>
                <Button type="submit" className="flex-1">
                  Trimite spre aprobare
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-2xl font-bold text-white">
                  Job trimis cu succes!
                </DialogTitle>
                <DialogDescription className="text-gray-300 space-y-3">
                  <p className="text-base">
                    Îți mulțumim pentru postarea oportunității de angajare!
                  </p>
                  <p className="text-sm">
                    Anunțul va fi verificat de echipa noastră și aprobat în cel mai scurt timp posibil, 
                    de obicei în mai puțin de 24 de ore.
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    După aprobare, job-ul va fi vizibil în această secțiune 
                    și persoanele interesate vor putea lua legătura cu tine.
                  </p>
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter className="w-full">
                <Button 
                  onClick={() => setShowSuccessDialog(false)}
                  className="w-full"
                >
                  Am înțeles
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}