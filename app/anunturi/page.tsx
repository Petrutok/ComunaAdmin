'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { db, COLLECTIONS, Announcement, ANNOUNCEMENT_CATEGORIES } from '@/lib/firebase';
import {
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  Search,
  Filter,
  Check,
  MapPin,
  Eye,
  ChevronRight,
  TrendingUp,
  Clock,
  Home,
  Sparkles,
  Tag,
  Grid3x3,
  List,
  X,
  Info,
  AlertCircle,
  Leaf,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Form state extins
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'diverse' as keyof typeof ANNOUNCEMENT_CATEGORIES,
    subcategory: '',
    price: '',
    priceType: 'fix' as 'fix' | 'negociabil' | 'gratuit',
    unit: '',
    location: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    preferredContact: 'phone' as 'phone' | 'email' | 'whatsapp',
    // Câmpuri specifice
    surfaceArea: '',
    landType: 'intravilan',
    isOrganic: false,
    serviceType: '',
    availability: '',
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.ANNOUNCEMENTS),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.category) newErrors.category = 'Selectează o categorie';
      if (!formData.title) newErrors.title = 'Titlul este obligatoriu';
      if (!formData.description) newErrors.description = 'Descrierea este obligatorie';
      if (formData.description.length < 20) newErrors.description = 'Descrierea trebuie să aibă minim 20 caractere';
    }
    
    if (step === 2) {
      if (formData.category === 'terenuri' && !formData.surfaceArea) {
        newErrors.surfaceArea = 'Suprafața este obligatorie pentru terenuri';
      }
      if (formData.priceType !== 'gratuit' && !formData.price) {
        newErrors.price = 'Prețul este obligatoriu';
      }
      if (!formData.location) newErrors.location = 'Locația este obligatorie';
    }
    
    if (step === 3) {
      if (!formData.contactName) newErrors.contactName = 'Numele este obligatoriu';
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
    
    if (!validateStep(3)) return;

    try {
      const newAnnouncement: Omit<Announcement, 'id'> = {
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        subcategory: formData.subcategory,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceType: formData.priceType as any,
        unit: formData.unit,
        location: formData.location,
        contact: {
          name: formData.contactName,
          phone: formData.contactPhone,
          email: formData.contactEmail || undefined,
          preferredContact: formData.preferredContact as any,
        },
        status: 'pending',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 zile
        
        // Câmpuri specifice
        ...(formData.category === 'terenuri' && {
          surfaceArea: formData.surfaceArea ? parseFloat(formData.surfaceArea) : undefined,
          landType: formData.landType as any,
        }),
        ...(formData.category === 'produse-locale' && {
          isOrganic: formData.isOrganic,
        }),
        ...(formData.category === 'servicii' && {
          serviceType: formData.serviceType,
          availability: formData.availability,
        }),
      };

      await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), newAnnouncement);

      setShowAddDialog(false);
      setShowSuccessDialog(true);
      setCurrentStep(1);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'diverse',
        subcategory: '',
        price: '',
        priceType: 'fix',
        unit: '',
        location: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        preferredContact: 'phone',
        surfaceArea: '',
        landType: 'intravilan',
        isOrganic: false,
        serviceType: '',
        availability: '',
      });
    } catch (error) {
      console.error('Error submitting announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite anunțul. Încearcă din nou.",
        variant: "destructive",
      });
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || announcement.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'all' || announcement.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const getCategoryStyle = (category: string) => {
    const cat = ANNOUNCEMENT_CATEGORIES[category as keyof typeof ANNOUNCEMENT_CATEGORIES];
    if (!cat) return { color: 'gray', icon: '📌' };
    
    const colorMap = {
      emerald: 'bg-emerald-500 text-white border-emerald-600',
      green: 'bg-green-500 text-white border-green-600',
      blue: 'bg-blue-500 text-white border-blue-600',
      purple: 'bg-purple-500 text-white border-purple-600',
      orange: 'bg-orange-500 text-white border-orange-600',
      yellow: 'bg-yellow-500 text-black border-yellow-600',
      gray: 'bg-gray-500 text-white border-gray-600'
    };
    
    return {
      className: colorMap[cat.color as keyof typeof colorMap] || colorMap.gray,
      icon: cat.icon,
      label: cat.label
    };
  };

  const formatPrice = (price?: number, priceType?: string, unit?: string) => {
    if (!price) return 'Preț nedefinit';
    if (priceType === 'gratuit') return 'GRATUIT';
    
    let priceStr = `${price.toLocaleString('ro-RO')} RON`;
    if (unit && unit !== 'total') priceStr += `/${unit}`;
    if (priceType === 'negociabil') priceStr += ' (negociabil)';
    
    return priceStr;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header îmbunătățit */}
        <div className="mb-8 text-center pt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full mb-4">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">Piața locală digitală</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Anunțuri Locale
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Cumpără sau vinde în comunitatea noastră. Găsește servicii locale de încredere.
          </p>
        </div>

        {/* Statistici rapide */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(ANNOUNCEMENT_CATEGORIES).map(([key, cat]) => {
            const count = announcements.filter(a => a.category === key).length;
            return (
              <Card 
                key={key}
                className={cn(
                  "bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all cursor-pointer",
                  selectedCategory === key && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedCategory(key)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <p className="text-2xl mb-1">{cat.icon}</p>
                    <p className="text-xs text-gray-400">{cat.label}</p>
                    <p className="text-xl font-bold text-white mt-1">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Toolbar îmbunătățit */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Caută în anunțuri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px] bg-slate-900 border-slate-600 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {Object.entries(ANNOUNCEMENT_CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View mode toggle */}
                <div className="flex bg-slate-900 rounded-lg border border-slate-600">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "rounded-r-none",
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
                      "rounded-l-none",
                      viewMode === 'list' && "bg-slate-700"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add button */}
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Publică anunț
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Announcements Display */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="inline-flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Se încarcă anunțurile...
            </div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700 rounded-full mb-4">
                <Search className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg mb-2">
                Nu s-au găsit anunțuri
              </p>
              <p className="text-gray-500 text-sm">
                Încearcă să modifici filtrele sau publică primul anunț din această categorie
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            {filteredAnnouncements.map((announcement) => {
              const categoryStyle = getCategoryStyle(announcement.category);
              
              return (
                <Card 
                  key={announcement.id} 
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={categoryStyle.className}>
                        <span className="mr-1">{categoryStyle.icon}</span>
                        {categoryStyle.label}
                      </Badge>
                      {announcement.featured && (
                        <Badge className="bg-yellow-500 text-black">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Promovat
                        </Badge>
                      )}
                    </div>
                    
                    <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors line-clamp-2">
                      {announcement.title}
                    </CardTitle>
                    
                    {announcement.subcategory && (
                      <Badge variant="outline" className="border-slate-600 text-gray-400 text-xs">
                        {announcement.subcategory}
                      </Badge>
                    )}
                    
                    <div className="mt-2">
                      <p className="text-2xl font-bold text-green-400">
                        {formatPrice(announcement.price, announcement.priceType, announcement.unit)}
                      </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-300 line-clamp-3 mb-4">
                      {announcement.description}
                    </p>
                    
                    {/* Detalii specifice */}
                    {announcement.category === 'terenuri' && announcement.surfaceArea && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Tag className="h-4 w-4" />
                        <span>{announcement.surfaceArea} mp • {announcement.landType}</span>
                      </div>
                    )}
                    
                    {announcement.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>{announcement.location}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-700 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{announcement.contact.name}</span>
                        </div>
                        {announcement.views && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Eye className="h-3 w-3" />
                            {announcement.views}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone className="h-4 w-4" />
                          <a 
                            href={`tel:${announcement.contact.phone}`} 
                            className="hover:text-white transition-colors"
                          >
                            {announcement.contact.phone}
                          </a>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Detalii
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Publicat {new Date(announcement.createdAt).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Anunț trimis cu succes!</DialogTitle>
              <DialogDescription className="text-gray-400">
                Anunțul tău a fost trimis și va fi verificat de echipa noastră.
                Vei fi notificat când va fi aprobat.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowSuccessDialog(false)}>
                Am înțeles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Dialog - Formular complet */}
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
                <Sparkles className="h-6 w-6 text-yellow-400" />
                Publică un anunț nou
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează formularul pentru a publica anunțul. Toate anunțurile sunt verificate înainte de publicare.
              </DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    currentStep >= step 
                      ? "bg-blue-500 text-white" 
                      : "bg-slate-700 text-gray-400"
                  )}>
                    {currentStep > step ? <Check className="h-5 w-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={cn(
                      "flex-1 h-1 mx-2 transition-all",
                      currentStep > step ? "bg-blue-500" : "bg-slate-700"
                    )} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Informații generale */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Informații generale</h3>
                  
                  {/* Selector categorii */}
                  <div>
                    <Label className="text-gray-300 mb-3 block">Selectează categoria</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(ANNOUNCEMENT_CATEGORIES).map(([key, cat]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: key as any, subcategory: '' })}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-left",
                            formData.category === key
                              ? "border-blue-500 bg-blue-500/20"
                              : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{cat.icon}</span>
                            {formData.category === key && (
                              <Check className="h-4 w-4 text-blue-400 ml-auto" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-white">{cat.label}</p>
                        </button>
                      ))}
                    </div>
                    {errors.category && (
                      <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                    )}
                  </div>

                  {/* Subcategorie */}
                  {formData.category && ANNOUNCEMENT_CATEGORIES[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES].subcategories.length > 0 && (
                    <div>
                      <Label htmlFor="subcategory" className="text-gray-300">Subcategorie</Label>
                      <Select 
                        value={formData.subcategory} 
                        onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                          <SelectValue placeholder="Selectează subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {ANNOUNCEMENT_CATEGORIES[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES].subcategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Titlu */}
                  <div>
                    <Label htmlFor="title" className="text-gray-300">Titlu anunț</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Vând teren intravilan 500mp"
                      className="bg-slate-900 border-slate-600 text-white"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.title.length}/100 caractere
                    </p>
                    {errors.title && (
                      <p className="text-red-400 text-sm">{errors.title}</p>
                    )}
                  </div>

                  {/* Descriere */}
                  <div>
                    <Label htmlFor="description" className="text-gray-300">Descriere</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrie în detaliu ce oferi sau cauți..."
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
                </div>
              )}

              {/* Step 2: Detalii și preț */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Detalii și preț</h3>

                  {/* Câmpuri specifice pentru terenuri */}
                  {formData.category === 'terenuri' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="surfaceArea" className="text-gray-300">Suprafață (mp)</Label>
                          <Input
                            id="surfaceArea"
                            type="number"
                            value={formData.surfaceArea}
                            onChange={(e) => setFormData({ ...formData, surfaceArea: e.target.value })}
                            placeholder="500"
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                          {errors.surfaceArea && (
                            <p className="text-red-400 text-sm mt-1">{errors.surfaceArea}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="landType" className="text-gray-300">Tip teren</Label>
                          <Select 
                            value={formData.landType} 
                            onValueChange={(value) => setFormData({ ...formData, landType: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="intravilan">Intravilan</SelectItem>
                              <SelectItem value="extravilan">Extravilan</SelectItem>
                              <SelectItem value="agricol">Agricol</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Câmpuri specifice pentru produse locale */}
                  {formData.category === 'produse-locale' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="organic"
                          checked={formData.isOrganic}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, isOrganic: checked as boolean })
                          }
                        />
                        <Label 
                          htmlFor="organic" 
                          className="text-gray-300 cursor-pointer flex items-center gap-2"
                        >
                          <Leaf className="h-4 w-4 text-green-400" />
                          Produs ecologic/bio
                        </Label>
                      </div>
                    </>
                  )}

                  {/* Câmpuri specifice pentru servicii */}
                  {formData.category === 'servicii' && (
                    <>
                      <div>
                        <Label htmlFor="serviceType" className="text-gray-300">Tip serviciu</Label>
                        <Input
                          id="serviceType"
                          value={formData.serviceType}
                          onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                          placeholder="Ex: Instalații sanitare"
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="availability" className="text-gray-300">Disponibilitate</Label>
                        <Input
                          id="availability"
                          value={formData.availability}
                          onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                          placeholder="Ex: Luni-Vineri, 8:00-18:00"
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Preț */}
                  <div className="space-y-3">
                    <Label className="text-gray-300">Preț</Label>
                    <div className="flex gap-2">
                      {['fix', 'negociabil', 'gratuit'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, priceType: type as any })}
                          className={cn(
                            "px-4 py-2 rounded-lg border transition-all capitalize",
                            formData.priceType === type
                              ? "border-blue-500 bg-blue-500/20 text-blue-400"
                              : "border-slate-600 text-gray-400 hover:border-slate-500"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    
                    {formData.priceType !== 'gratuit' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="Introdu prețul"
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Select 
                            value={formData.unit} 
                            onValueChange={(value) => setFormData({ ...formData, unit: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                              <SelectValue placeholder="Unitate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="total">RON (total)</SelectItem>
                              <SelectItem value="mp">RON/mp</SelectItem>
                              <SelectItem value="kg">RON/kg</SelectItem>
                              <SelectItem value="buc">RON/buc</SelectItem>
                              <SelectItem value="ora">RON/oră</SelectItem>
                              <SelectItem value="zi">RON/zi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {errors.price && (
                      <p className="text-red-400 text-sm">{errors.price}</p>
                    )}
                  </div>

                  {/* Locație */}
                  <div>
                    <Label htmlFor="location" className="text-gray-300">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Locație în comună
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: Centru, Strada Principală"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                    {errors.location && (
                      <p className="text-red-400 text-sm mt-1">{errors.location}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Date de contact */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Date de contact</h3>

                  <div>
                    <Label htmlFor="contactName" className="text-gray-300">
                      <User className="inline h-4 w-4 mr-1" />
                      Nume complet
                    </Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Ion Popescu"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                    {errors.contactName && (
                      <p className="text-red-400 text-sm mt-1">{errors.contactName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="contactPhone" className="text-gray-300">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Număr de telefon
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
                      placeholder="ion.popescu@email.com"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                    {errors.contactEmail && (
                      <p className="text-red-400 text-sm mt-1">{errors.contactEmail}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Metoda preferată de contact</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'phone', label: 'Telefon', icon: Phone },
                        { value: 'email', label: 'Email', icon: Mail },
                        { value: 'whatsapp', label: 'WhatsApp', icon: Phone }
                      ].map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, preferredContact: method.value as any })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                            formData.preferredContact === method.value
                              ? "border-blue-500 bg-blue-500/20 text-blue-400"
                              : "border-slate-600 text-gray-400 hover:border-slate-500"
                          )}
                        >
                          <method.icon className="h-4 w-4" />
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sumar anunț */}
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Sumar anunț
                    </h4>
                    <div className="text-sm space-y-1 text-gray-300">
                      <p><span className="text-gray-500">Categorie:</span> {ANNOUNCEMENT_CATEGORIES[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES]?.label}</p>
                      <p><span className="text-gray-500">Titlu:</span> {formData.title}</p>
                      {formData.price && (
                        <p><span className="text-gray-500">Preț:</span> {formData.price} RON {formData.unit && `/ ${formData.unit}`}</p>
                      )}
                      <p><span className="text-gray-500">Locație:</span> {formData.location}</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-400 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Anunțul va fi verificat de echipa noastră înainte de publicare. 
                      Vei fi notificat când va fi aprobat.
                    </p>
                  </div>
                </div>
              )}
            </form>

            <DialogFooter className="flex justify-between sm:justify-between">
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
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Continuă
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Publică anunțul
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