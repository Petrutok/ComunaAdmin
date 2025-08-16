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
  Search,
  Check,
  Briefcase,
  Building,
  Home,
  ChevronRight,
  Info,
  AlertCircle,
  Grid3x3,
  List,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const JOB_TYPES_LOCAL = {
  'full-time': { label: 'Full Time', color: 'green', icon: '🕐' },
  'part-time': { label: 'Part Time', color: 'blue', icon: '⏰' },
  'contract': { label: 'Sezonier', color: 'orange', icon: '📅' },
  'internship': { label: 'Ucenicie', color: 'purple', icon: '🎓' }
};

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
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setShowDetailDialog(true);
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.title) newErrors.title = 'Titlul poziției este obligatoriu';
      if (!formData.company) newErrors.company = 'Numele companiei este obligatoriu';
      if (!formData.description) newErrors.description = 'Descrierea este obligatorie';
      if (formData.description.length < 20) newErrors.description = 'Descrierea trebuie să aibă minim 20 caractere';
    }
    
    if (step === 2) {
      if (!formData.location) newErrors.location = 'Locația este obligatorie';
      if (!formData.contactPhone) newErrors.contactPhone = 'Telefonul este obligatoriu';
      if (formData.contactPhone && !/^[0-9]{10}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
        newErrors.contactPhone = 'Număr de telefon invalid';
      }
      if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Email invalid';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(2)) return;

    setIsSubmitting(true);

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
      setCurrentStep(1);
      
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
      
      loadJobs();
    } catch (error) {
      console.error('Error submitting job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite anunțul",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getJobTypeStyle = (type: string) => {
    const jobType = JOB_TYPES_LOCAL[type as keyof typeof JOB_TYPES_LOCAL] || JOB_TYPES_LOCAL['full-time'];
    const colorMap = {
      green: 'bg-green-500 text-white',
      blue: 'bg-blue-500 text-white',
      orange: 'bg-orange-500 text-white',
      purple: 'bg-purple-500 text-white'
    };
    
    return {
      className: colorMap[jobType.color as keyof typeof colorMap],
      label: jobType.label,
      icon: jobType.icon
    };
  };

  const getStepInfo = (step: number) => {
    switch(step) {
      case 1:
        return {
          title: 'Detalii job',
          description: 'Informații despre poziție',
          icon: <FileText className="h-5 w-5" />
        };
      case 2:
        return {
          title: 'Contact & Locație',
          description: 'Cum te pot contacta candidații',
          icon: <Phone className="h-5 w-5" />
        };
      default:
        return { title: '', description: '', icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Home Button */}
      <button
        onClick={() => window.location.href = '/'}
        className="fixed top-4 left-4 z-50 group"
      >
        <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-4 py-2.5 shadow-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2 font-medium border border-white/20">
          <Home className="h-5 w-5" />
          <span className="font-semibold">Acasă</span>
        </div>
      </button>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center pt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Locuri de Muncă
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Găsește oportunități de angajare în comunitatea noastră
          </p>
        </div>

        {/* Stats */}
        <div className="text-center mb-8">
          <Card className="bg-slate-800/50 border-slate-700 inline-flex">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-blue-400" />
                <span className="text-2xl font-bold text-white">{jobs.length}</span>
                <span className="text-gray-400 text-lg">
                  {jobs.length === 1 ? 'anunț disponibil' : 'anunțuri disponibile'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Caută joburi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>

              <div className="flex gap-2">
                {/* View mode toggle */}
                <div className="flex bg-slate-900 rounded-lg border border-slate-600 p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "rounded",
                      viewMode === 'grid' && "bg-slate-700"
                    )}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "rounded",
                      viewMode === 'list' && "bg-slate-700"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add button */}
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Publică job
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Display */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="inline-flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Se încarcă joburile...
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-full mb-4">
                <Briefcase className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg mb-2">
                Nu s-au găsit joburi
              </p>
              <p className="text-gray-500 text-sm">
                Încercă să modifici căutarea sau publică primul job
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            {filteredJobs.map((job) => {
              const typeStyle = getJobTypeStyle(job.type);
              
              return (
                <Card 
                  key={job.id} 
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all h-full flex flex-col"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-lg line-clamp-2">
                      {job.title}
                    </CardTitle>
                    
                    <div className="flex items-center gap-2 text-gray-400 mt-2">
                      <Building className="h-4 w-4" />
                      <span className="font-medium">{job.company}</span>
                    </div>
                    
                    {job.salary && (
                      <div className="mt-2">
                        <p className="text-xl font-bold text-green-400">
                          {job.salary}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-gray-300 line-clamp-3 mb-3 flex-1">
                      {job.description}
                    </p>
                    
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-700 pt-3 mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{job.contact.phone}</span>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewDetails(job)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Detalii
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog Detalii Job */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedJob && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getJobTypeStyle(selectedJob.type).className}>
                      {getJobTypeStyle(selectedJob.type).icon} {getJobTypeStyle(selectedJob.type).label}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl text-white">
                    {selectedJob.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-gray-400 mt-2">
                    <Building className="h-5 w-5" />
                    <span className="text-lg font-medium">{selectedJob.company}</span>
                  </div>
                  {selectedJob.salary && (
                    <div className="text-2xl font-bold text-green-400 mt-2">
                      {selectedJob.salary}
                    </div>
                  )}
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Descriere */}
                  <div>
                    <h3 className="font-semibold text-white mb-2">Descriere</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedJob.description}</p>
                  </div>

                  {/* Locație */}
                  {selectedJob.location && (
                    <div>
                      <h3 className="font-semibold text-white mb-2">Locație</h3>
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span>{selectedJob.location}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">Contact</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${selectedJob.contact.phone}`} className="text-blue-400 hover:text-blue-300">
                          {selectedJob.contact.phone}
                        </a>
                      </div>
                      {selectedJob.contact.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${selectedJob.contact.email}`} className="text-blue-400 hover:text-blue-300">
                            {selectedJob.contact.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailDialog(false)}
                    className="border-slate-600"
                  >
                    Închide
                  </Button>
                  <Button
                    onClick={() => window.location.href = `tel:${selectedJob.contact.phone}`}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contactează
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white mb-3">
                Job trimis cu succes!
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-base">
                Anunțul va fi verificat și aprobat în curând de echipa noastră.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setShowSuccessDialog(false)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Am înțeles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Dialog - Formular */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setCurrentStep(1);
            setErrors({});
          }
        }}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase className="h-6 w-6" />
                Publică un job nou
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează formularul pentru a publica jobul. Toate anunțurile sunt verificate înainte de publicare.
              </DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="relative mb-6">
              <div className="absolute top-5 left-0 right-0 h-1 bg-slate-700 rounded-full" />
              <div 
                className="absolute top-5 left-0 h-1 bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
              <div className="relative flex items-center justify-between">
                {[1, 2].map((step) => {
                  const stepInfo = getStepInfo(step);
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                        currentStep >= step 
                          ? "bg-blue-600 text-white" 
                          : "bg-slate-700 text-gray-400"
                      )}>
                        {currentStep > step ? <Check className="h-5 w-5" /> : stepInfo.icon}
                      </div>
                      <div className="mt-2 text-center">
                        <p className={cn(
                          "text-xs font-medium",
                          currentStep >= step ? "text-white" : "text-gray-500"
                        )}>
                          {stepInfo.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Detalii job */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="title" className="text-gray-300">Titlu poziție</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Vânzător, Mecanic, Contabil"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                      {errors.title && (
                        <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company" className="text-gray-300">Numele companiei</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Ex: SC Exemplu SRL"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                      {errors.company && (
                        <p className="text-red-400 text-sm mt-1">{errors.company}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="type" className="text-gray-300">Tip angajare</Label>
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

                    <div>
                      <Label htmlFor="salary" className="text-gray-300">Salariu (opțional)</Label>
                      <Input
                        id="salary"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        placeholder="Ex: 2500 RON net"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-gray-300">Descriere job</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrie responsabilitățile, cerințele și beneficiile poziției..."
                        className="bg-slate-900 border-slate-600 text-white min-h-[120px]"
                        maxLength={1000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.description.length}/1000 caractere
                      </p>
                      {errors.description && (
                        <p className="text-red-400 text-sm">{errors.description}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Contact & Locație */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="location" className="text-gray-300">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Locație
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ex: Centru, Zona Industrială"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                      {errors.location && (
                        <p className="text-red-400 text-sm mt-1">{errors.location}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactPhone" className="text-gray-300">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Telefon contact
                      </Label>
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="0740123456"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                      {errors.contactPhone && (
                        <p className="text-red-400 text-sm mt-1">{errors.contactPhone}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contactEmail" className="text-gray-300">
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email (opțional)
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="contact@exemplu.ro"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                      {errors.contactEmail && (
                        <p className="text-red-400 text-sm mt-1">{errors.contactEmail}</p>
                      )}
                    </div>

                    {/* Sumar job */}
                    <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Sumar anunț
                      </h4>
                      <div className="text-sm space-y-1 text-gray-300">
                        <p><span className="text-gray-500">Poziție:</span> {formData.title || 'Nu a fost completat'}</p>
                        <p><span className="text-gray-500">Companie:</span> {formData.company || 'Nu a fost completată'}</p>
                        <p><span className="text-gray-500">Tip:</span> {getJobTypeStyle(formData.type).label}</p>
                        {formData.salary && (
                          <p><span className="text-gray-500">Salariu:</span> {formData.salary}</p>
                        )}
                        <p><span className="text-gray-500">Locație:</span> {formData.location || 'Nu a fost completată'}</p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Anunțul va fi verificat de echipa noastră înainte de publicare.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <DialogFooter className="flex justify-between sm:justify-between mt-6">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="border-slate-600"
                  >
                    Înapoi
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setCurrentStep(1);
                    setErrors({});
                  }}
                  className="border-slate-600"
                >
                  Anulează
                </Button>
                {currentStep < 2 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Continuă
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Se trimite...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Publică jobul
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}