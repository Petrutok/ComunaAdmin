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
import { useToast } from '@/components/ui/use-toast';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS, Announcement } from '@/lib/firebase';
import {
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'diverse' as Announcement['category'],
    price: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newAnnouncement: Omit<Announcement, 'id'> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: formData.price ? parseFloat(formData.price) : undefined,
        contact: {
          name: formData.contactName,
          phone: formData.contactPhone,
          email: formData.contactEmail || undefined,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), newAnnouncement);

      // Închide dialogul de adăugare
      setShowAddDialog(false);
      
      // Afișează dialogul de succes
      setShowSuccessDialog(true);
      
      // Resetează formularul
      setFormData({
        title: '',
        description: '',
        category: 'diverse',
        price: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
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
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'vanzare': return 'bg-green-500';
      case 'cumparare': return 'bg-blue-500';
      case 'schimb': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Anunțuri și Oportunități
          </h1>
          <p className="text-gray-400">
            Găsește sau publică anunțuri locale din comunitatea noastră
          </p>
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută anunțuri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate categoriile</SelectItem>
                <SelectItem value="vanzare">Vânzare</SelectItem>
                <SelectItem value="cumparare">Cumpărare</SelectItem>
                <SelectItem value="schimb">Schimb</SelectItem>
                <SelectItem value="diverse">Diverse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Publică anunț
          </Button>
        </div>

        {/* Announcements Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            Se încarcă anunțurile...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <p className="text-gray-400">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Nu s-au găsit anunțuri pentru criteriile selectate.'
                  : 'Nu există anunțuri publicate încă.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getCategoryColor(announcement.category)}>
                      {announcement.category}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {new Date(announcement.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  <CardTitle className="text-white line-clamp-2">
                    {announcement.title}
                  </CardTitle>
                  {announcement.price && (
                    <p className="text-xl font-bold text-green-400">
                      {announcement.price} RON
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 line-clamp-3 mb-4">
                    {announcement.description}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{announcement.contact.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${announcement.contact.phone}`} className="hover:text-white">
                        {announcement.contact.phone}
                      </a>
                    </div>
                    {announcement.contact.email && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${announcement.contact.email}`} className="hover:text-white">
                          {announcement.contact.email}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Announcement Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Publică un anunț nou</DialogTitle>
              <DialogDescription className="text-gray-400">
                Completează formularul pentru a publica anunțul. Acesta va fi verificat înainte de publicare.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">
                  Titlu anunț *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Ex: Vând bicicletă mountainbike"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-200">
                  Categorie *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as Announcement['category'] })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vanzare">Vânzare</SelectItem>
                    <SelectItem value="cumparare">Cumpărare</SelectItem>
                    <SelectItem value="schimb">Schimb</SelectItem>
                    <SelectItem value="diverse">Diverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-gray-200">
                  Preț (RON)
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="Lasă gol dacă nu este cazul"
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
                  placeholder="Descrie detaliat produsul sau serviciul..."
                />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-white font-medium mb-3">Date de contact</h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="text-gray-200">
                      Nume *
                    </Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                      placeholder="Numele tău"
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
                      Email (opțional)
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
              {/* Icon de succes */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-2xl font-bold text-white">
                  Anunț trimis cu succes!
                </DialogTitle>
                <DialogDescription className="text-gray-300 space-y-3">
                  <p className="text-base">
                    Îți mulțumim pentru anunțul tău!
                  </p>
                  <p className="text-sm">
                    Acesta va fi verificat de echipa noastră și aprobat în cel mai scurt timp posibil, 
                    de obicei în mai puțin de 24 de ore.
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    După aprobare, anunțul va fi vizibil în secțiunea "Anunțuri" 
                    și toți utilizatorii aplicației vor primi o notificare.
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