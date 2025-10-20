'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS, Job } from '@/lib/firebase';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Check,
  X,
  Trash2,
  AlertCircle,
  Briefcase,
  Building,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);  const { toast } = useToast();
  useEffect(() => {
    loadJobs();
  }, [activeTab]);

  const loadJobs = async () => {
    setLoading(true);
    
    try {
      const q = query(
        collection(db, COLLECTIONS.JOBS),
        where('status', '==', activeTab)
      );
      
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];
      
      // Sortare manuală
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setJobs(data);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca job-urile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (job: Job) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.JOBS, job.id!), {
        status: 'approved',
        updatedAt: new Date(),
      });

      toast({
        title: "Job aprobat",
        description: "Job-ul a fost publicat cu succes.",
      });

      loadJobs();
    } catch (error) {
      console.error('Error approving job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut aproba job-ul",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedJob || !rejectReason.trim()) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.JOBS, selectedJob.id!), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: new Date(),
      });

      toast({
        title: "Job respins",
        description: "Job-ul a fost respins.",
      });

      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedJob(null);
      loadJobs();
    } catch (error) {
      console.error('Error rejecting job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut respinge job-ul",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.JOBS, jobToDelete.id!));
      
      toast({
        title: "Job șters",
        description: "Job-ul a fost șters definitiv.",
      });
      
      setShowDeleteDialog(false);
      setJobToDelete(null);
      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge job-ul",
        variant: "destructive",
      });
    }
  };

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
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-amber-500/30 rounded-xl p-3 border border-amber-500/20">
              <Briefcase className="h-8 w-8 text-amber-500" />
            </div>
            Moderare Joburi
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            Gestionează ofertele de muncă publicate
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="pending">
            În așteptare
            {jobs.filter(j => j.status === 'pending').length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {jobs.filter(j => j.status === 'pending').length}
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
          ) : jobs.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="text-center py-8">
                <p className="text-gray-400">
                  Nu există job-uri {activeTab === 'pending' ? 'în așteptare' : 
                    activeTab === 'approved' ? 'aprobate' : 'respinse'}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-white">
                          {job.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge className={getJobTypeColor(job.type)}>
                            {getJobTypeLabel(job.type)}
                          </Badge>
                          <span className="text-gray-400">la</span>
                          <span className="font-medium text-white">
                            {job.company}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {formatDate(job.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Briefcase className="h-4 w-4" />
                          <span>{job.salary}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-2">Contact:</h4>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{job.contact.phone}</span>
                        </div>
                        {job.contact.email && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span>{job.contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {job.rejectionReason && activeTab === 'rejected' && (
                      <div className="flex items-start gap-2 p-3 bg-red-900/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-400">
                            Motiv respingere:
                          </p>
                          <p className="text-sm text-gray-300">
                            {job.rejectionReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleApprove(job)}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprobă
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedJob(job);
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
                          setJobToDelete(job);
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
            <DialogTitle className="text-white">Respinge job-ul</DialogTitle>
            <DialogDescription className="text-gray-400">
              Specifică motivul pentru care respingi acest job.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Informații de contact incomplete..."
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
              Respinge job-ul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru ștergere */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Ești sigur că vrei să ștergi acest job?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Această acțiune nu poate fi anulată. Job-ul va fi șters definitiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>
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