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
import { db, COLLECTIONS, Announcement } from '@/lib/firebase';
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
  const { toast } = useToast();

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'vanzare': return 'bg-green-500';
      case 'cumparare': return 'bg-blue-500';
      case 'schimb': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Moderare Anunțuri</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="pending">
            În așteptare
            {announcements.length > 0 && activeTab === 'pending' && (
              <Badge className="ml-2" variant="secondary">
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
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-white">
                          {announcement.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Badge className={getCategoryColor(announcement.category)}>
                            {announcement.category}
                          </Badge>
                          {announcement.price && (
                            <span className="font-medium text-white">
                              {announcement.price} RON
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{announcement.description}</p>
                    
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
                    </div>

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
                          className="flex-1"
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
              ))}
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
            <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Șterge definitiv
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}