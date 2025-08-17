'use client';

import { useEffect, useState, useRef } from 'react';
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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage, COLLECTIONS, Announcement, ANNOUNCEMENT_CATEGORIES } from '@/lib/firebase';
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
  Upload,
  Image as ImageIcon,
  FileText,
  Building,
  Package,
  Wrench,
  ShoppingCart,
  ArrowRight,
  CheckCircle,
  Star,
  ArrowLeft
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

// Categorii actualizate FĂRĂ SCHIMBURI
const ANNOUNCEMENT_CATEGORIES_LOCAL = {
  toate: {
    label: 'Toate anunțurile',
    icon: '📋',
    color: 'slate',
    subcategories: []
  },
  terenuri: {
    label: 'Vânzări Terenuri',
    icon: '🏞️',
    color: 'emerald',
    subcategories: ['Intravilan', 'Extravilan', 'Agricol', 'Pădure']
  },
  'produse-locale': {
    label: 'Produse Locale',
    icon: '🥬',
    color: 'green',
    subcategories: ['Legume', 'Fructe', 'Lactate', 'Carne', 'Miere', 'Tradiționale']
  },
  diverse: {
    label: 'Vânzări Diverse',
    icon: '📦',
    color: 'blue',
    subcategories: ['Electrocasnice', 'Mobilier', 'Unelte', 'Îmbrăcăminte', 'Altele']
  },
  servicii: {
    label: 'Servicii',
    icon: '🔧',
    color: 'indigo',
    subcategories: ['Construcții', 'Reparații', 'Transport', 'Grădinărit', 'Curățenie', 'Altele']
  },
  cumparare: {
    label: 'Cumpărări',
    icon: '🛒',
    color: 'orange',
    subcategories: []
  }
} as const;

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('toate');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // State pentru imagine (DOAR UNA)
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'diverse' as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL,
    subcategory: '',
    price: '',
    priceType: 'fix' as 'fix' | 'negociabil' | 'gratuit',
    unit: '',
    location: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    preferredContact: 'phone' as 'phone' | 'email' | 'whatsapp',
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

  // Funcții pentru gestionarea imaginii (DOAR UNA)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validare dimensiune fișier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Imagine prea mare",
        description: "Imaginea trebuie să fie mai mică de 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    // Creează URL pentru preview
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setSelectedImage(null);
    setImageUrl('');
  };

  const uploadImage = async (): Promise<string> => {
    if (!selectedImage) return '';

    setUploadingImage(true);

    try {
      const timestamp = Date.now();
      const fileName = `announcements/${timestamp}_${selectedImage.name}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, selectedImage);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca imaginea",
        variant: "destructive",
      });
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler pentru detalii anunț - FĂRĂ incrementare views
  const handleViewDetails = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.category || formData.category === 'toate') {
        newErrors.category = 'Selectează o categorie validă';
      }
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

    setIsSubmitting(true);

    try {
      // Încarcă imaginea (dacă există)
      const uploadedImageUrl = await uploadImage();

      const newAnnouncement: Omit<Announcement, 'id'> = {
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        subcategory: formData.subcategory,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceType: formData.priceType as any,
        unit: formData.unit,
        location: formData.location,
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
        contact: {
          name: formData.contactName,
          phone: formData.contactPhone,
          email: formData.contactEmail || undefined,
          preferredContact: formData.preferredContact as any,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        
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
      
      // Reset imagine
      removeImage();
      
      // Reîncarcă anunțurile
      loadAnnouncements();
      
    } catch (error) {
      console.error('Error submitting announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite anunțul. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'toate' || announcement.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'all' || announcement.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const getCategoryStyle = (category: string) => {
    const cat = ANNOUNCEMENT_CATEGORIES_LOCAL[category as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL];
    if (!cat) return { color: 'gray', icon: '📌' };
    
    const colorMap = {
      slate: 'bg-slate-500 text-white border-slate-600',
      emerald: 'bg-emerald-500 text-white border-emerald-600',
      green: 'bg-green-500 text-white border-green-600',
      blue: 'bg-blue-500 text-white border-blue-600',
      indigo: 'bg-indigo-500 text-white border-indigo-600',
      orange: 'bg-orange-500 text-white border-orange-600',
      gray: 'bg-gray-500 text-white border-gray-600'
    };
    
    return {
      className: colorMap[cat.color as keyof typeof colorMap] || colorMap.gray,
      icon: cat.icon,
      label: cat.label
    };
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'terenuri': return <Home className="h-5 w-5" />;
      case 'produse-locale': return <Leaf className="h-5 w-5" />;
      case 'diverse': return <Package className="h-5 w-5" />;
      case 'servicii': return <Wrench className="h-5 w-5" />;
      case 'cumparare': return <ShoppingCart className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const formatPrice = (price?: number, priceType?: string, unit?: string) => {
    if (!price) return 'Preț nedefinit';
    if (priceType === 'gratuit') return 'GRATUIT';
    
    let priceStr = `${price.toLocaleString('ro-RO')} RON`;
    if (unit && unit !== 'total') priceStr += `/${unit}`;
    if (priceType === 'negociabil') priceStr += ' (negociabil)';
    
    return priceStr;
  };

  const getStepInfo = (step: number) => {
    switch(step) {
      case 1:
        return {
          title: 'Informații generale',
          description: 'Descrie ce vrei să anunți',
          icon: <FileText className="h-5 w-5" />
        };
      case 2:
        return {
          title: 'Detalii și imagine',
          description: 'Adaugă detalii specifice și o fotografie',
          icon: <ImageIcon className="h-5 w-5" />
        };
      case 3:
        return {
          title: 'Date de contact',
          description: 'Cum te pot contacta cumpărătorii',
          icon: <Phone className="h-5 w-5" />
        };
      default:
        return { title: '', description: '', icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Home Button - mai mic pe mobil */}
      <button
        onClick={() => window.location.href = '/'}
        className="fixed top-3 left-3 z-50 group"
      >
        <div className="bg-white/10 backdrop-blur-md text-white rounded-lg px-3 py-2 shadow-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-1.5 font-medium border border-white/20">
          <Home className="h-4 w-4" />
          <span className="font-semibold text-sm">Acasă</span>
        </div>
      </button>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header simplificat - responsive */}
        <div className="mb-6 sm:mb-8 text-center pt-12 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3">
            Anunțuri Locale
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
            Cumpără sau vinde în comunitatea noastră. Găsește servicii locale de încredere.
          </p>
        </div>

        {/* Statistici categorii - grid optimizat pentru mobil */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {Object.entries(ANNOUNCEMENT_CATEGORIES_LOCAL).map(([key, cat]) => {
            const count = key === 'toate' 
              ? announcements.length 
              : announcements.filter(a => a.category === key).length;
            
            return (
              <Card 
                key={key}
                className={cn(
                  "bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all cursor-pointer",
                  selectedCategory === key && "ring-2 ring-blue-500 bg-slate-800"
                )}
                onClick={() => setSelectedCategory(key)}
              >
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex flex-col items-center text-center space-y-0.5 sm:space-y-1">
                    <div className="text-xl sm:text-2xl">{cat.icon}</div>
                    <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1">{cat.label}</p>
                    <p className="text-base sm:text-lg font-bold text-white">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Toolbar - stack pe mobil */}
        <Card className="bg-slate-800/50 border-slate-700 mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row">
              {/* Search - full width pe mobil */}
              <div className="relative flex-1 order-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Caută în anunțuri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white text-sm sm:text-base"
                />
              </div>

              {/* Filters row - pe mobil sub search */}
              <div className="flex gap-2 order-2 lg:order-2">
                {/* Filter dropdown - mai mic pe mobil */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1 lg:w-[180px] bg-slate-900 border-slate-600 text-white text-sm">
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="truncate">
                      {ANNOUNCEMENT_CATEGORIES_LOCAL[selectedCategory as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL]?.label || 'Toate'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ANNOUNCEMENT_CATEGORIES_LOCAL).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2 text-sm">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View mode toggle - ascuns pe mobil mic */}
                <div className="hidden sm:flex bg-slate-900 rounded-lg border border-slate-600 p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "rounded px-2",
                      viewMode === 'grid' && "bg-slate-700"
                    )}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "rounded px-2",
                      viewMode === 'list' && "bg-slate-700"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Add button - full width pe mobil */}
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white order-3 lg:order-3 w-full lg:w-auto text-sm sm:text-base"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Publică anunț
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Announcements Display - o singură coloană pe mobil */}
        {loading ? (
          <div className="text-center text-gray-400 py-8 sm:py-12">
            <div className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="text-sm sm:text-base">Se încarcă anunțurile...</span>
            </div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="text-center py-12 sm:py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-slate-700 rounded-full mb-3 sm:mb-4">
                <Search className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
              </div>
              <p className="text-gray-400 text-base sm:text-lg mb-2">
                Nu s-au găsit anunțuri
              </p>
              <p className="text-gray-500 text-xs sm:text-sm px-4">
                Încearcă să modifici filtrele sau publică primul anunț din această categorie
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              : "space-y-3 sm:space-y-4"
          )}>
            {filteredAnnouncements.map((announcement) => {
              const categoryStyle = getCategoryStyle(announcement.category);
              
              return (
                <Card 
                  key={announcement.id} 
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all h-full flex flex-col"
                >
                  {/* Imagine preview - mai mică pe mobil */}
                  {announcement.images && announcement.images.length > 0 && (
                    <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={announcement.images[0]} 
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                      <Badge className={`${categoryStyle.className} text-xs`}>
                        <span className="mr-0.5 sm:mr-1 text-xs">{categoryStyle.icon}</span>
                        <span className="text-[10px] sm:text-xs">{categoryStyle.label}</span>
                      </Badge>
                      {announcement.featured && (
                        <Badge className="bg-yellow-500 text-black text-xs">
                          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 fill-current" />
                          <span className="text-[10px] sm:text-xs">Promovat</span>
                        </Badge>
                      )}
                    </div>
                    
                    <CardTitle className="text-white text-base sm:text-lg line-clamp-2">
                      {announcement.title}
                    </CardTitle>
                    
                    <div className="mt-1.5 sm:mt-2">
                      <p className="text-xl sm:text-2xl font-bold text-green-400">
                        {formatPrice(announcement.price, announcement.priceType, announcement.unit)}
                      </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col p-3 sm:p-4 pt-0 sm:pt-0">
                    <p className="text-gray-300 text-sm sm:text-base line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3 flex-1">
                      {announcement.description}
                    </p>
                    
                    {announcement.location && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{announcement.location}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-700 pt-2 sm:pt-3 mt-auto">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate max-w-[120px] sm:max-w-none">{announcement.contact.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{announcement.contact.phone}</span>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewDetails(announcement)}
                          className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                        >
                          Detalii
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog Detalii Anunț */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedAnnouncement && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryStyle(selectedAnnouncement.category).className}>
                      {getCategoryStyle(selectedAnnouncement.category).icon} {getCategoryStyle(selectedAnnouncement.category).label}
                    </Badge>
                    {selectedAnnouncement.featured && (
                      <Badge className="bg-yellow-500 text-black">
                        <Star className="h-3 w-3 mr-1" />
                        Promovat
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-2xl text-white">
                    {selectedAnnouncement.title}
                  </DialogTitle>
                  <div className="text-3xl font-bold text-green-400 mt-2">
                    {formatPrice(selectedAnnouncement.price, selectedAnnouncement.priceType, selectedAnnouncement.unit)}
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Imagine */}
                  {selectedAnnouncement.images && selectedAnnouncement.images.length > 0 && (
                    <div className="relative h-64 overflow-hidden rounded-lg">
                      <img 
                        src={selectedAnnouncement.images[0]} 
                        alt={selectedAnnouncement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Descriere */}
                  <div>
                    <h3 className="font-semibold text-white mb-2">Descriere</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedAnnouncement.description}</p>
                  </div>

                  {/* Detalii specifice */}
                  {selectedAnnouncement.category === 'terenuri' && selectedAnnouncement.surfaceArea && (
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-2">Detalii teren</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Suprafață:</span>
                          <span className="text-gray-300 ml-2">{selectedAnnouncement.surfaceArea} mp</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tip teren:</span>
                          <span className="text-gray-300 ml-2">{selectedAnnouncement.landType}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAnnouncement.category === 'produse-locale' && selectedAnnouncement.isOrganic && (
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <Leaf className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-medium">Produs ecologic/bio certificat</span>
                    </div>
                  )}

                  {selectedAnnouncement.category === 'servicii' && (selectedAnnouncement.serviceType || selectedAnnouncement.availability) && (
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-2">Detalii serviciu</h3>
                      <div className="space-y-2 text-sm">
                        {selectedAnnouncement.serviceType && (
                          <div>
                            <span className="text-gray-500">Tip serviciu:</span>
                            <span className="text-gray-300 ml-2">{selectedAnnouncement.serviceType}</span>
                          </div>
                        )}
                        {selectedAnnouncement.availability && (
                          <div>
                            <span className="text-gray-500">Disponibilitate:</span>
                            <span className="text-gray-300 ml-2">{selectedAnnouncement.availability}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Locație */}
                  {selectedAnnouncement.location && (
                    <div>
                      <h3 className="font-semibold text-white mb-2">Locație</h3>
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span>{selectedAnnouncement.location}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">Date de contact</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{selectedAnnouncement.contact.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${selectedAnnouncement.contact.phone}`} className="text-blue-400 hover:text-blue-300">
                          {selectedAnnouncement.contact.phone}
                        </a>
                      </div>
                      {selectedAnnouncement.contact.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${selectedAnnouncement.contact.email}`} className="text-blue-400 hover:text-blue-300">
                            {selectedAnnouncement.contact.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailDialog(false)}
                    className="border-slate-600"
                  >
                    Închide
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Success Dialog - MESAJ ACTUALIZAT */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white mb-3">
                Anunț trimis cu succes!
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-base">
                Anunțul tău a fost trimis și va fi verificat de echipa noastră.
                Anunțul tău va fi vizibil în următoarele 24 de ore.
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
            removeImage();
          }
        }}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Plus className="h-6 w-6" />
                Publică un anunț nou
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează formularul pentru a publica anunțul. Toate anunțurile sunt verificate înainte de publicare.
              </DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
            <div className="relative mb-6">
              <div className="absolute top-5 left-0 right-0 h-1 bg-slate-700 rounded-full" />
              <div 
                className="absolute top-5 left-0 h-1 bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
              <div className="relative flex items-center justify-between">
                {[1, 2, 3].map((step) => {
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
                {/* Step 1: Informații generale */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Selector categorii */}
                    <div>
                      <Label className="text-gray-300 mb-3 block">Selectează categoria</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(ANNOUNCEMENT_CATEGORIES_LOCAL).filter(([key]) => key !== 'toate').map(([key, cat]) => (
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
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{cat.icon}</span>
                              <div>
                                <p className="text-sm font-medium text-white">{cat.label}</p>
                              </div>
                              {formData.category === key && (
                                <Check className="h-4 w-4 text-blue-400 ml-auto" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {errors.category && (
                        <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                      )}
                    </div>

                    {/* Subcategorie */}
                    {formData.category && ANNOUNCEMENT_CATEGORIES_LOCAL[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL].subcategories.length > 0 && (
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
                            {ANNOUNCEMENT_CATEGORIES_LOCAL[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL].subcategories.map((sub) => (
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
                        placeholder={
                          formData.category === 'cumparare' 
                            ? "Ex: Cumpăr teren intravilan 500mp"
                            : formData.category === 'servicii'
                            ? "Ex: Ofer servicii instalații sanitare"
                            : formData.category === 'produse-locale'
                            ? "Ex: Vând miere de albine naturală"
                            : formData.category === 'terenuri'
                            ? "Ex: Vând teren intravilan 500mp"
                            : "Ex: Vând mobilă second-hand"
                        }
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
                  </motion.div>
                )}

                {/* Step 2: Detalii și imagine */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Upload imagine (DOAR UNA) */}
                    <div>
                      <Label className="text-gray-300 mb-2 block">
                        Adaugă o fotografie (opțional)
                      </Label>
                      
                      <div className="flex items-center gap-4">
                        {imageUrl ? (
                          <div className="relative">
                            <img 
                              src={imageUrl} 
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded-lg border-2 border-slate-600"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-slate-700/50 transition-all"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-400">Adaugă imagine</span>
                          </button>
                        )}
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      
                      <p className="text-xs text-gray-500 mt-2">
                        O imagine clară crește șansele de vizualizare
                      </p>
                    </div>

                    {/* Câmpuri specifice pentru terenuri */}
                    {formData.category === 'terenuri' && (
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
                    )}

                    {/* Câmpuri specifice pentru produse locale */}
                    {formData.category === 'produse-locale' && (
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
                          Produs ecologic/bio certificat
                        </Label>
                      </div>
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
                                <SelectValue placeholder="RON" />
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
                  </motion.div>
                )}

                {/* Step 3: Date de contact */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
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
                        <p><span className="text-gray-500">Categorie:</span> {ANNOUNCEMENT_CATEGORIES_LOCAL[formData.category as keyof typeof ANNOUNCEMENT_CATEGORIES_LOCAL]?.label}</p>
                        <p><span className="text-gray-500">Titlu:</span> {formData.title}</p>
                        {formData.price && (
                          <p><span className="text-gray-500">Preț:</span> {formData.price} RON {formData.unit && formData.unit !== 'total' && `/ ${formData.unit}`}</p>
                        )}
                        <p><span className="text-gray-500">Locație:</span> {formData.location}</p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Anunțul va fi verificat de echipa noastră înainte de publicare.
                        Anunțul tău va fi vizibil în următoarele 24 de ore.
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
                    removeImage();
                  }}
                  className="border-slate-600"
                >
                  Anulează
                </Button>
                {currentStep < 3 ? (
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
                    disabled={isSubmitting || uploadingImage}
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
                        Publică anunțul
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