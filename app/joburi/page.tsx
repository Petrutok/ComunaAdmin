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
  Building,
  Home,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JobFormData {
  title: string;
  company: string;
  description: string;
  salary: string;
  location: string;
  type: Job['type'];
  contactPhone: string;
  contactEmail: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: '',
    description: '',
    salary: '',
    location: '',
    type: 'full-time',
    contactPhone: '',
    contactEmail: '',
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
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca joburile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contactPhone.trim()) {
      toast({
        title: "Eroare",
        description: "Numărul de telefon este obligatoriu",
        variant: "destructive",
      });
      return;
    }

    try {
      const newJob: Omit<Job, 'id'> = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        description: formData.description.trim(),
        requirements: [],
        benefits: [],
        salary: formData.salary.trim() || undefined,
        location: formData.location.trim(),
        type: formData.type,
        contact: {
          phone: formData.contactPhone.trim(),
          email: formData.contactEmail.trim() || undefined,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, COLLECTIONS.JOBS), newJob);

      setShowAddDialog(false);
      setShowSuccessDialog(true);
      
      setFormData({
        title: '',
        company: '',
        description: '',
        salary: '',
        location: '',
        type: 'full-time',
        contactPhone: '',
        contactEmail: '',
      });
    } catch (error) {
      console.error('Error submitting job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite anunțul",
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

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
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

        <div className="mb-8 pt-16">
          <h1 className="text-3xl font-bold text-white mb-2">
            Locuri de Muncă în Comună
          </h1>
          <p className="text-gray-400">
            Găsește oportunități de angajare în zona ta
          </p>
        </div>

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
                  <p className="text-gray-300 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${job.contact.phone}`} className="hover:text-white">
                            {job.contact.phone}
                          </a>
                        </div>
                        {job.contact.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${job.contact.email}`} className="hover:text-white">
                              {job.contact.email}
                            </a>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.location.href = `tel:${job.contact.phone}`}
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

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Publică un job</DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează informațiile. Câmpurile cu * sunt obligatorii.
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
                  placeholder="Ex: Vânzător"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-gray-200">
                  Firma *
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Ex: Magazin Profi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-gray-200">
                    Tip *
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
                    placeholder="Comuna"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary" className="text-gray-200">
                  Salariu
                </Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="2500 RON"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">
                  Descriere *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-gray-200">
                  Telefon *
                </Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="07xx xxx xxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-gray-200">
                  Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="email@exemplu.ro"
                />
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
                  Trimite
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20 mx-auto">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  Job trimis cu succes!
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  Anunțul va fi verificat și aprobat în curând.
                </DialogDescription>
              </DialogHeader>
              
              <Button 
                onClick={() => setShowSuccessDialog(false)}
                className="w-full"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}