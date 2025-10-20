'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS, Announcement, ANNOUNCEMENT_CATEGORIES } from '@/lib/firebase';
import {
  Check,
  X,
  Clock,
  Phone,
  Mail,
  User,
  Calendar,
  AlertCircle,
  Trash2,
  MapPin,
  Tag,
  Eye,
  TrendingUp,
  Newspaper,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [activeTab]);

  const loadAnnouncements = async () => {
    setLoading(true);
    
    try {
      const q = query(
        collection(db, COLLECTIONS.ANNOUNCEMENTS),
        where('status', '==', activeTab)
      );
      
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      
      // Sortare manuală pentru a evita probleme cu index
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || a.createdAt;
        const dateB = b.createdAt?.toDate?.() || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      setAnnouncements(data);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-au putut încărca anunțurile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (announcement: Announcement) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcement.id!), {
        status: 'approved',
        updatedAt: new Date(),
      });

      toast({
        title: "Anunț aprobat",
        description: "Anunțul a fost publicat cu succes.",
      });

      // Trimite notificare - comentat temporar
      /*
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Anunț nou publicat',
            message: announcement.title,
            url: `https://comuna-theta.vercel.app/anunturi/${announcement.id}`,
          }),
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
      */

      loadAnnouncements();
    } catch (error) {
      console.error('Error approving announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut aproba anunțul",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedAnnouncement || !rejectReason.trim()) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, selectedAnnouncement.id!), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: new Date(),
      });

      toast({
        title: "Anunț respins",
        description: "Anunțul a fost respins.",
      });

      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      console.error('Error rejecting announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut respinge anunțul",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementToDelete.id!));
      
      toast({
        title: "Anunț șters",
        description: "Anunțul a fost șters definitiv.",
      });
      
      setShowDeleteDialog(false);
      setAnnouncementToDelete(null);
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge anunțul",
        variant: "destructive",
      });
    }
  };

  // Funcție actualizată pentru noile categorii
  const getCategoryStyle = (category: string) => {
    const cat = ANNOUNCEMENT_CATEGORIES[category as keyof typeof ANNOUNCEMENT_CATEGORIES];
    if (!cat) {
      // Fallback pentru categorii vechi
      switch (category) {
        case 'vanzare': return { className: 'bg-green-500', icon: '💰', label: 'Vânzare' };
        case 'cumparare': return { className: 'bg-blue-500', icon: '🛒', label: 'Cumpărare' };
        case 'schimb': return { className: 'bg-orange-500', icon: '🔄', label: 'Schimb' };
        default: return { className: 'bg-gray-500', icon: '📌', label: 'Diverse' };
      }
    }
    
    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500'
    };
    
    return {
      className: colorMap[cat.color] || 'bg-gray-500',
      icon: cat.icon,
      label: cat.label
    };
  };

  const formatDate = (date: any) => {
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (announcement: Announcement) => {
    if (!announcement.price) return null;
    
    let priceStr = `${announcement.price.toLocaleString('ro-RO')} RON`;
    
    if (announcement.unit) {
      priceStr += `/${announcement.unit}`;
    }
    
    if (announcement.priceType === 'negociabil') {
      priceStr += ' (negociabil)';
    } else if (announcement.priceType === 'gratuit') {
      return 'GRATUIT';
    }
    
    return priceStr;
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-500/30 rounded-xl p-3 border border-blue-500/20">
              <Newspaper className="h-8 w-8 text-blue-500" />
            </div>
            Moderare Anunțuri
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            Total: {announcements.length} anunțuri
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {currentTime.toLocaleDateString('ro-RO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-2xl font-mono text-white">
              {currentTime.toLocaleTimeString('ro-RO')}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="pending">
            În așteptare
            {announcements.length > 0 && activeTab === 'pending' && (
              <Badge className="ml-2 bg-yellow-500 text-black">
                {announcements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Aprobate</TabsTrigger>
          <TabsTrigger value="rejected">Respinse</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Se încarcă...
            </div>
          ) : announcements.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="text-center py-8">
                <p className="text-gray-400">
                  Nu există anunțuri {activeTab === 'pending' ? 'în așteptare' : 
                    activeTab === 'approved' ? 'aprobate' : 'respinse'}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const categoryStyle = getCategoryStyle(announcement.category);
                const price = formatPrice(announcement);
                
                return (
                  <Card key={announcement.id} className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-white text-xl">
                            {announcement.title}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${categoryStyle.className} text-white`}>
                              <span className="mr-1">{categoryStyle.icon}</span>
                              {categoryStyle.label}
                            </Badge>
                            
                            {announcement.subcategory && (
                              <Badge variant="outline" className="border-slate-600 text-gray-400">
                                {announcement.subcategory}
                              </Badge>
                            )}
                            
                            {announcement.featured && (
                              <Badge className="bg-yellow-500 text-black">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Promovat
                              </Badge>
                            )}
                            
                            {price && (
                              <span className="font-semibold text-green-400 text-lg">
                                {price}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(announcement.createdAt)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-gray-300">{announcement.description}</p>
                      
                      {/* Detalii specifice pentru terenuri */}
                      {announcement.category === 'terenuri' && announcement.surfaceArea && (
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>{announcement.surfaceArea} mp</span>
                          </div>
                          {announcement.landType && (
                            <Badge variant="outline" className="text-xs">
                              {announcement.landType}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Detalii specifice pentru produse locale */}
                      {announcement.category === 'produse-locale' && announcement.isOrganic && (
                        <Badge className="bg-green-600 text-white">
                          🌿 Produs ecologic/bio
                        </Badge>
                      )}
                      
                      {/* Detalii specifice pentru servicii */}
                      {announcement.category === 'servicii' && announcement.serviceType && (
                        <div className="text-sm text-gray-400">
                          <span className="font-medium">Tip serviciu:</span> {announcement.serviceType}
                          {announcement.availability && (
                            <span className="ml-4">
                              <span className="font-medium">Disponibilitate:</span> {announcement.availability}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Locație */}
                      {announcement.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{announcement.location}</span>
                        </div>
                      )}
                      
                      {/* Contact */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{announcement.contact.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{announcement.contact.phone}</span>
                        </div>
                        {announcement.contact.email && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span>{announcement.contact.email}</span>
                          </div>
                        )}
                        {announcement.contact.preferredContact && (
                          <Badge variant="outline" className="text-xs">
                            Contact preferat: {announcement.contact.preferredContact}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Expirare */}
                      {announcement.expiresAt && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Expiră: {formatDate(announcement.expiresAt)}</span>
                        </div>
                      )}

                      {announcement.rejectionReason && activeTab === 'rejected' && (
                        <div className="flex items-start gap-2 p-3 bg-red-900/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-400">
                              Motiv respingere:
                            </p>
                            <p className="text-sm text-gray-300">
                              {announcement.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeTab === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleApprove(announcement)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Aprobă
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowRejectDialog(true);
                            }}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Respinge
                          </Button>
                        </div>
                      )}

                      {(activeTab === 'approved' || activeTab === 'rejected') && (
                        <Button
                          onClick={() => {
                            setAnnouncementToDelete(announcement);
                            setShowDeleteDialog(true);
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Șterge definitiv
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog pentru respingere */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Respinge anunțul</DialogTitle>
            <DialogDescription className="text-gray-400">
              Specifică motivul pentru care respingi acest anunț.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Anunțul conține informații incomplete sau inadecvate..."
            className="bg-slate-900 border-slate-600 text-white"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
              className="border-slate-600"
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Respinge anunțul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru ștergere */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Ești sigur că vrei să ștergi acest anunț?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Această acțiune nu poate fi anulată. Anunțul va fi șters definitiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setAnnouncementToDelete(null)}
              className="border-slate-600"
            >
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
            >
              Șterge definitiv
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}