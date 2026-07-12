'use client';

import { useEffect, useState, useRef } from 'react';

// Page size for the paginated cereri list
const PAGE_SIZE = 100;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, storage, COLLECTIONS } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Department, User as UserType } from '@/types/departments';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Check,
  X,
  Trash2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  User,
  CreditCard,
  Home,
  Paperclip,
  RefreshCw,
  Loader2,
  UserPlus,
  Building2,
  Zap,
  ArrowUpDown,
  BadgeCheck,
  Send,
  FilePlus,
  CalendarClock,
  CornerUpRight,
  Archive,
} from 'lucide-react';
import { isAdeverintaType, buildAdeverintaBody, ADEVERINTA_LABELS } from '@/lib/adeverinte';
import type { AdeverintaType } from '@/lib/adeverinte';
import { buildRaspunsBody, RASPUNS_STATUS_LABELS } from '@/lib/raspuns';
import type { RaspunsStatus } from '@/lib/raspuns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Beyond the basic flow, OG 27/2002 statuses:
// - necesita_completare: missing documents requested from the citizen
//   (the legal deadline is suspended until they arrive)
// - prelungit: deadline extended by max 15 days (art. 9)
// - redirectionat: forwarded to the competent institution (art. 6^1)
// - clasat: filed without response - anonymous/duplicate petition (art. 7)
type CerereStatus =
  | 'noua'
  | 'in_lucru'
  | 'necesita_completare'
  | 'prelungit'
  | 'redirectionat'
  | 'rezolvat'
  | 'respins'
  | 'clasat';
type CererePriority = 'urgent' | 'normal' | 'low';

interface Cerere {
  id: string;
  numeComplet: string;
  cnp: string;
  email: string;
  telefon: string;
  localitate: string;
  adresa: string;
  tipCerere: string;
  scopulCererii: string;
  strada?: string;
  numarInregistrare?: string;
  adeverinta?: {
    numarIesire: string;
    downloadURL: string;
    emisLa?: any;
  };
  raspuns?: {
    numarIesire: string;
    downloadURL: string;
    emisLa?: any;
  };
  status: CerereStatus;
  redirectionatCatre?: string;
  registruDocId?: string;
  priority?: CererePriority;
  departmentId?: string;
  departmentName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  deadline?: any;
  createdAt: any;
  updatedAt?: any;
  dataInregistrare?: string;
  timestamp?: any;
  observatii?: string;
  fisiere?: { name: string; type?: string; size?: number; storagePath?: string }[];
  // Câmpuri adiționale opționale
  numeFirma?: string;
  cui?: string;
  reprezentantLegal?: string;
  suprafataTeren?: string;
  nrCadastral?: string;
  marcaAuto?: string;
  nrInmatriculare?: string;
}

const statusConfig = {
  'noua': {
    label: 'Nou',
    icon: Mail,
    color: 'bg-blue-600',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
  },
  'in_lucru': {
    label: 'În lucru',
    icon: Loader2,
    color: 'bg-amber-500',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/30',
  },
  'necesita_completare': {
    label: 'Necesită completare',
    icon: FilePlus,
    color: 'bg-orange-600',
    textColor: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-400/30',
  },
  'prelungit': {
    label: 'Termen prelungit',
    icon: CalendarClock,
    color: 'bg-purple-600',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-400/30',
  },
  'redirectionat': {
    label: 'Redirecționată',
    icon: CornerUpRight,
    color: 'bg-cyan-600',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-400/30',
  },
  'rezolvat': {
    label: 'Rezolvat',
    icon: CheckCircle,
    color: 'bg-emerald-600',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/30',
  },
  'respins': {
    label: 'Respins',
    icon: XCircle,
    color: 'bg-rose-600',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-400/30',
  },
  'clasat': {
    label: 'Clasată',
    icon: Archive,
    color: 'bg-gray-600',
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400/30',
  },
};

const priorityConfig = {
  'urgent': {
    label: 'Urgent',
    icon: Zap,
    color: 'bg-rose-600',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-500/20',
  },
  'normal': {
    label: 'Normal',
    icon: Clock,
    color: 'bg-amber-600',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
  },
  'low': {
    label: 'Scăzută',
    icon: ArrowUpDown,
    color: 'bg-gray-600',
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

// Map pentru tipurile de cereri
const tipuriCereri: { [key: string]: string } = {
  'cerere-generala': 'Cerere Generală',
  'autorizatie-construire': 'Autorizație Construire',
  'certificat-urbanism': 'Certificat Urbanism',
  'lemne-foc': 'Cerere Lemne Foc',
  'indemnizatie-copil': 'Indemnizație Copil',
  'consiliere': 'Consiliere Socială',
  'alocatie-copii': 'Alocație Copii',
  'adeverinta-rol': 'Adeverință Rol',
  'apia-pf': 'APIA Persoană Fizică',
  'apia-pj': 'APIA Persoană Juridică',
  'certificat-fiscal-pf': 'Certificat Fiscal PF',
  'certificat-fiscal-pj': 'Certificat Fiscal PJ',
  'radiere-auto': 'Radiere Auto',
  'act-identitate': 'Act Identitate',
  'certificat-nastere': 'Certificat Naștere',
};

export default function AdminCereriPage() {
  const [cereri, setCereri] = useState<Cerere[]>([]);
  const [filteredCereri, setFilteredCereri] = useState<Cerere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CerereStatus | 'toate'>('toate');
  const [mineOnly, setMineOnly] = useState(false);
  const [mineCount, setMineCount] = useState<number | null>(null);
  const [selectedCerere, setSelectedCerere] = useState<Cerere | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showEmiteDialog, setShowEmiteDialog] = useState(false);
  const [adeverintaText, setAdeverintaText] = useState('');
  const [emitting, setEmitting] = useState(false);
  const [showRaspunsDialog, setShowRaspunsDialog] = useState(false);
  const [raspunsText, setRaspunsText] = useState('');
  const [raspunsStatus, setRaspunsStatus] = useState<RaspunsStatus>('rezolvat');
  const [sendingRaspuns, setSendingRaspuns] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<CerereStatus>('noua');
  const [redirectionatCatre, setRedirectionatCatre] = useState('');
  const [observatii, setObservatii] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('toate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [assignmentData, setAssignmentData] = useState({
    departmentId: null as string | null,
    userId: null as string | null,
    priority: 'normal' as CererePriority,
  });
  const { toast } = useToast();
  const { user: adminUser } = useAdminAuth();

  useEffect(() => {
    loadCereri();
    loadDepartmentsAndUsers();
  }, []);

  useEffect(() => {
    filterCereri();
  }, [cereri, activeFilter, searchTerm, filterType, sortOrder]);

  // Statuses that still need action from the assignee
  const OPEN_STATUSES: CerereStatus[] = ['noua', 'in_lucru', 'necesita_completare', 'prelungit'];

  // Badge count for "Ale mele": my assigned cereri still needing action
  useEffect(() => {
    if (!adminUser?.uid) return;
    const fetchMineCount = async () => {
      try {
        // Equality filter only, no orderBy: avoids a composite index
        const snap = await getDocs(
          query(collection(db, 'form_submissions'), where('assignedToUserId', '==', adminUser.uid))
        );
        const open = snap.docs.filter((d) =>
          OPEN_STATUSES.includes((d.data().status || 'noua') as CerereStatus)
        );
        setMineCount(open.length);
      } catch {
        setMineCount(null);
      }
    };
    fetchMineCount();
  }, [adminUser?.uid, cereri]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCereri = async (loadMore = false, mineOverride?: boolean) => {
    const mine = mineOverride ?? mineOnly;
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Paginated: collections grow monthly, never load them whole.
      // "Ale mele" is a dedicated equality query (no orderBy - avoids a
      // composite index; my open workload is small, sorted client-side)
      const q = mine
        ? query(
            collection(db, 'form_submissions'),
            where('assignedToUserId', '==', adminUser?.uid || '__none__'),
            limit(300)
          )
        : loadMore && lastDocRef.current
        ? query(
            collection(db, 'form_submissions'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDocRef.current),
            limit(PAGE_SIZE)
          )
        : query(
            collection(db, 'form_submissions'),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          );

      const snapshot = await getDocs(q);
      if (!mine) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || lastDocRef.current;
      }
      setHasMore(mine ? false : snapshot.docs.length === PAGE_SIZE);

      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          numeComplet: docData.numeComplet || '',
          cnp: docData.cnp || '',
          email: docData.email || '',
          telefon: docData.telefon || '',
          localitate: docData.localitate || '',
          adresa: docData.adresa || '',
          tipCerere: docData.tipCerere || '',
          scopulCererii: docData.scopulCererii || '',
          status: (docData.status || 'noua') as CerereStatus,
          priority: docData.priority || 'normal',
          departmentId: docData.departmentId,
          departmentName: docData.departmentName,
          assignedToUserId: docData.assignedToUserId,
          assignedToUserName: docData.assignedToUserName,
          deadline: docData.deadline,
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt,
          fisiere: docData.fisiere,
          observatii: docData.observatii,
          dataInregistrare: docData.createdAt?.toDate?.()?.toLocaleDateString('ro-RO') || new Date().toLocaleDateString('ro-RO'),
          ...docData
        };
      }) as Cerere[];

      if (mine) {
        data.sort(
          (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
      }

      setCereri(prev => (loadMore ? [...prev, ...data] : data));
    } catch (error: any) {
      console.error('Error loading cereri:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca cererile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadDepartmentsAndUsers = async () => {
    try {
      // Load departments
      const deptQuery = query(
        collection(db, COLLECTIONS.DEPARTMENTS),
        orderBy('name', 'asc')
      );
      const deptSnapshot = await getDocs(deptQuery);
      const deptData = deptSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Department[];

      // Load users
      const usersQuery = query(
        collection(db, COLLECTIONS.USERS),
        orderBy('fullName', 'asc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserType[];

      setDepartments(deptData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading departments and users:', error);
    }
  };

  const filterCereri = () => {
    let filtered = [...cereri];

    // Filter by status
    if (activeFilter !== 'toate') {
      filtered = filtered.filter(c => c.status === activeFilter);
    }

    // Filter by request type
    if (filterType !== 'toate') {
      filtered = filtered.filter(c => c.tipCerere === filterType);
    }

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.numeComplet.toLowerCase().includes(search) ||
        c.cnp.includes(searchTerm) ||
        c.email.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredCereri(filtered);
  };

  const handleAssignment = async (
    departmentId: string | null,
    userId: string | null,
    priority: CererePriority
  ) => {
    if (!selectedCerere) return;

    try {
      const department = departments.find(d => d.id === departmentId);
      const user = users.find(u => u.id === userId);

      const updateData: any = {
        assignedToUserId: userId,
        assignedToUserName: user?.fullName || null,
        departmentId: departmentId,
        departmentName: department?.name || null,
        priority: priority,
        updatedAt: new Date(),
      };

      // If assigning for first time, change status to in_lucru
      if (!selectedCerere.assignedToUserId && (userId || departmentId)) {
        updateData.status = 'in_lucru';
      }

      await updateDoc(doc(db, 'form_submissions', selectedCerere.id), updateData);

      // Push to the assigned employee (best effort, never blocks the assignment)
      if (userId && userId !== selectedCerere.assignedToUserId) {
        try {
          const idToken = await auth.currentUser?.getIdToken();
          fetch('/api/notify-assignment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
              collection: 'form_submissions',
              docId: selectedCerere.id,
              assignedToUserId: userId,
            }),
          }).catch(() => {});
        } catch {}
      }

      toast({
        title: "Cerere atribuită",
        description: `Cererea a fost atribuită ${department?.name ? `departamentului ${department.name}` : ''} ${user ? `utilizatorului ${user.fullName}` : ''}`,
      });

      setShowAssignDialog(false);
      loadCereri();
    } catch (error) {
      console.error('Error assigning cerere:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut atribui cererea",
        variant: "destructive",
      });
    }
  };
  // Keep the registry entry in sync with the cerere status:
  // - prelungit: +15 days on the legal deadline (OG 27/2002 art. 9)
  // - necesita_completare: deadline suspended until the citizen completes
  //   (restarted by /api/completeaza-cerere)
  // - closed statuses: finalize the registry entry
  const syncRegistruWithStatus = async (cerere: Cerere, status: CerereStatus) => {
    if (!cerere.registruDocId) return;
    const registruRef = doc(db, 'registru_general', cerere.registruDocId);
    try {
      if (status === 'prelungit') {
        const snap = await getDoc(registruRef);
        const termenActual: Timestamp | null = snap.exists() ? snap.data().termen || null : null;
        const baza = termenActual?.toMillis?.() || Date.now() + 30 * 24 * 60 * 60 * 1000;
        await updateDoc(registruRef, {
          termen: Timestamp.fromMillis(baza + 15 * 24 * 60 * 60 * 1000),
          status: 'in_lucru',
          updatedAt: Timestamp.now(),
        });
      } else if (status === 'necesita_completare') {
        await updateDoc(registruRef, {
          termen: null,
          status: 'in_lucru',
          updatedAt: Timestamp.now(),
        });
      } else if (['rezolvat', 'respins', 'redirectionat', 'clasat'].includes(status)) {
        await updateDoc(registruRef, { status: 'finalizat', updatedAt: Timestamp.now() });
      } else if (status === 'in_lucru') {
        await updateDoc(registruRef, { status: 'in_lucru', updatedAt: Timestamp.now() });
      }
    } catch (error) {
      // best effort: the cerere status change must not fail because of the registry
      console.error('Error syncing registru entry:', error);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedCerere || !newStatus) return;

    if (newStatus === 'redirectionat' && !redirectionatCatre.trim()) {
      toast({
        title: "Instituție lipsă",
        description: "Completează către ce instituție a fost redirecționată cererea.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'redirectionat') {
        updateData.redirectionatCatre = redirectionatCatre.trim();
      }

      const finalObservatii = observatii.trim() || selectedCerere.observatii || '';
      if (finalObservatii) {
        updateData.observatii = finalObservatii;
      }

      await updateDoc(doc(db, 'form_submissions', selectedCerere.id), updateData);

      await syncRegistruWithStatus(selectedCerere, newStatus);

      // Notify the citizen (push + email) - best effort, never blocks the update
      try {
        const idToken = await auth.currentUser?.getIdToken();
        fetch('/api/notify-status-change', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            collection: 'form_submissions',
            docId: selectedCerere.id,
            newStatus,
          }),
        }).catch(() => {});
      } catch {}

      toast({
        title: "Status actualizat",
        description: `Cererea a fost marcată ca ${statusConfig[newStatus].label}`,
      });

      setShowStatusDialog(false);
      setNewStatus('noua');
      setObservatii('');
      setRedirectionatCatre('');
      loadCereri();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza statusul",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCerere) return;

    try {
      await deleteDoc(doc(db, 'form_submissions', selectedCerere.id));

      toast({
        title: "Cerere ștearsă",
        description: "Cererea a fost ștearsă definitiv.",
      });

      setShowDeleteDialog(false);
      setSelectedCerere(null);
      loadCereri();
    } catch (error) {
      console.error('Error deleting cerere:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge cererea",
        variant: "destructive",
      });
    }
  };

  const handleEmiteAdeverinta = async () => {
    if (!selectedCerere || !adeverintaText.trim()) return;
    setEmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/emite-adeverinta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          cerereId: selectedCerere.id,
          continut: adeverintaText.trim(),
        }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Emiterea a eșuat');
      }

      // Notify the citizen that the request was resolved (best effort)
      fetch('/api/notify-status-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          collection: 'form_submissions',
          docId: selectedCerere.id,
          newStatus: 'rezolvat',
        }),
      }).catch(() => {});

      toast({
        title: 'Adeverință emisă',
        description: `Nr. ieșire ${result.numarIesire} — cetățeanul o poate descărca din Dosarul meu.`,
      });
      setShowEmiteDialog(false);
      setAdeverintaText('');
      loadCereri();
    } catch (error) {
      console.error('Error issuing adeverinta:', error);
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Nu s-a putut emite adeverința',
        variant: 'destructive',
      });
    } finally {
      setEmitting(false);
    }
  };

  const handleEmiteRaspuns = async () => {
    if (!selectedCerere || !raspunsText.trim()) return;
    setSendingRaspuns(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/emite-raspuns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          cerereId: selectedCerere.id,
          continut: raspunsText.trim(),
          status: raspunsStatus,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Emiterea răspunsului a eșuat');
      }

      // Notify the citizen (push + email) about the outcome - best effort
      fetch('/api/notify-status-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          collection: 'form_submissions',
          docId: selectedCerere.id,
          newStatus: raspunsStatus,
        }),
      }).catch(() => {});

      toast({
        title: 'Răspuns emis',
        description: `Nr. ieșire ${result.numarIesire} — cetățeanul îl poate descărca din Dosarul meu.`,
      });
      setShowRaspunsDialog(false);
      setRaspunsText('');
      setRaspunsStatus('rezolvat');
      loadCereri();
    } catch (error) {
      console.error('Error issuing raspuns:', error);
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Nu s-a putut emite răspunsul',
        variant: 'destructive',
      });
    } finally {
      setSendingRaspuns(false);
    }
  };

  const handleDownloadPDF = async (cerere: Cerere) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/download-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ cerereId: cerere.id }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cerere_${cerere.tipCerere}_${cerere.id}.pdf`;
        a.click();
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut descărca PDF-ul",
        variant: "destructive",
      });
    }
  };

  // Citizen attachments live in Storage under cereri/{id}/; staff have
  // read access via storage.rules
  const handleDownloadAtasament = async (fisier: { name: string; storagePath?: string }) => {
    if (!fisier.storagePath) return;
    try {
      const url = await getDownloadURL(ref(storage, fisier.storagePath));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        title: "Eroare",
        description: `Nu s-a putut descărca ${fisier.name}`,
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: CerereStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-2 px-4 py-2 text-sm font-semibold shadow-sm`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCount = (status: CerereStatus) => {
    return cereri.filter(c => c.status === status).length;
  };

  const getTipCerereBadge = (tip: string) => {
    return (
      <Badge variant="outline" className="text-gray-300">
        {tipuriCereri[tip] || tip}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-purple-500/30 rounded-xl p-3 border border-purple-400/20">
              <FileText className="h-8 w-8 text-purple-300" />
            </div>
            Gestiune Cereri
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            <span className="font-semibold text-white">{cereri.length}</span> cereri totale •
            <span className="font-semibold text-blue-300"> {getStatusCount('noua')}</span> noi •
            <span className="font-semibold text-amber-300"> {getStatusCount('in_lucru')}</span> în lucru
          </p>
        </div>
        <Button onClick={() => loadCereri()} className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800/80 border-slate-600/50 shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input
                  placeholder="Caută după nume, CNP, email, tip cerere..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 bg-slate-700/50 border-slate-500 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-11"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600 font-medium h-11"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? 'Nou → Vechi' : 'Vechi → Nou'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Button
          variant={mineOnly ? 'default' : 'outline'}
          onClick={() => {
            const next = !mineOnly;
            setMineOnly(next);
            loadCereri(false, next);
          }}
          className={`${
            mineOnly
              ? 'bg-indigo-600 text-white border-transparent shadow-md'
              : 'border-indigo-400/50 text-indigo-300 bg-slate-800/50 hover:bg-indigo-500/20'
          } font-medium px-5 py-2.5 shadow-sm`}
        >
          <User className="h-4 w-4 mr-2" />
          Ale mele
          {mineCount !== null && mineCount > 0 && (
            <Badge className={`ml-2 ${mineOnly ? 'bg-white/20' : 'bg-indigo-500/20'} font-semibold px-2 py-0.5`}>
              {mineCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeFilter === 'toate' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('toate')}
          className={`${
            activeFilter === 'toate'
              ? 'bg-slate-700 text-white border-slate-600'
              : 'border-slate-500 text-gray-300 bg-slate-800/50 hover:bg-slate-700/50'
          } font-medium px-5 py-2.5 shadow-sm`}
        >
          Toate
          <Badge className="ml-2 bg-slate-600 text-white font-semibold px-2 py-0.5">{cereri.length}</Badge>
        </Button>
        {(Object.keys(statusConfig) as CerereStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = getStatusCount(status);

          return (
            <Button
              key={status}
              variant={activeFilter === status ? 'default' : 'outline'}
              onClick={() => setActiveFilter(status)}
              className={`${
                activeFilter === status
                  ? `${config.color} text-white border-transparent shadow-md`
                  : `border-slate-500 ${config.textColor} bg-slate-800/50 hover:${config.bgColor}`
              } font-medium px-5 py-2.5`}
            >
              <Icon className={`h-4 w-4 mr-2 ${activeFilter === status ? 'animate-pulse' : ''}`} />
              {config.label}
              {count > 0 && (
                <Badge className={`ml-2 ${activeFilter === status ? 'bg-white/20' : config.bgColor} font-semibold px-2 py-0.5`}>
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Cereri Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : filteredCereri.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Nu există cereri {activeFilter !== 'toate' ? `cu statusul "${statusConfig[activeFilter as CerereStatus].label}"` : ''}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCereri.map((cerere) => {
            const config = statusConfig[cerere.status];
            const Icon = config.icon;

            return (
              <Card key={cerere.id} className={`bg-slate-800/90 border-slate-600/50 hover:border-slate-500 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <code className="text-sm font-mono bg-slate-700/70 px-3 py-1.5 rounded-md text-blue-300 border border-slate-600 font-semibold">
                          {cerere.id.slice(0, 12)}...
                        </code>
                        {getStatusBadge(cerere.status)}

                        {/* Priority Badge */}
                        {cerere.priority && (
                          <Badge className={`${priorityConfig[cerere.priority].color} text-white flex items-center gap-1.5`}>
                            {(() => {
                              const PriorityIcon = priorityConfig[cerere.priority].icon;
                              return <PriorityIcon className="h-3.5 w-3.5" />;
                            })()}
                            {priorityConfig[cerere.priority].label}
                          </Badge>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-slate-700/50 px-3 py-1 rounded-md">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatShortDate(cerere.createdAt)}
                        </div>
                      </div>

                      {/* Assignment Info */}
                      {(cerere.departmentName || cerere.assignedToUserName) && (
                        <div className="flex items-center gap-3 mb-3 text-sm">
                          {cerere.departmentName && (
                            <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                              <Building2 className="h-3.5 w-3.5 text-purple-400" />
                              <span className="text-purple-300">{cerere.departmentName}</span>
                            </div>
                          )}
                          {cerere.assignedToUserName && (
                            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                              <User className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-blue-300">{cerere.assignedToUserName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <h3 className="text-lg font-semibold text-white mb-3 line-clamp-1 overflow-hidden break-words">
                        {cerere.numarInregistrare && (
                          <span className="mr-2 rounded bg-green-500/15 px-2 py-0.5 text-sm font-mono text-green-400 align-middle">
                            {cerere.numarInregistrare}
                          </span>
                        )}
                        {tipuriCereri[cerere.tipCerere] || cerere.tipCerere}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-3 overflow-hidden flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="truncate">{cerere.numeComplet}</span>
                        </div>
                        {cerere.email && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate">{cerere.email}</span>
                          </div>
                        )}
                        {cerere.fisiere && cerere.fisiere.length > 0 && (
                          <div className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                            <Paperclip className="h-4 w-4" />
                            <span className="font-medium">
                              {cerere.fisiere.length} fișier{cerere.fisiere.length !== 1 ? 'e' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {cerere.scopulCererii && (
                        <p className="text-gray-300 text-sm line-clamp-2 bg-slate-700/30 p-3 rounded-md border border-slate-600/30 overflow-hidden break-all">
                          {cerere.scopulCererii}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCerere(cerere);
                          setShowAssignDialog(true);
                        }}
                        className="hover:bg-purple-600/20 hover:text-purple-300 text-gray-300 border border-transparent hover:border-purple-400/30"
                        title="Atribuie"
                      >
                        <UserPlus className="h-5 w-5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCerere(cerere);
                          setShowDetailsDialog(true);
                        }}
                        className="hover:bg-blue-600/20 hover:text-blue-300 text-gray-300 border border-transparent hover:border-blue-400/30"
                        title="Vezi detalii"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCerere(cerere);
                          setNewStatus(cerere.status);
                          setObservatii(cerere.observatii || '');
                          setRedirectionatCatre(cerere.redirectionatCatre || '');
                          setShowStatusDialog(true);
                        }}
                        className="hover:bg-amber-600/20 hover:text-amber-300 text-gray-300 border border-transparent hover:border-amber-400/30"
                        title="Modifică status"
                      >
                        <AlertCircle className="h-5 w-5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadPDF(cerere)}
                        className="hover:bg-green-600/20 hover:text-green-300 text-gray-300 border border-transparent hover:border-green-400/30"
                        title="Descarcă PDF"
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                      {isAdeverintaType(cerere.tipCerere) && !cerere.adeverinta && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCerere(cerere);
                            setAdeverintaText(
                              buildAdeverintaBody(cerere.tipCerere as AdeverintaType, {
                                numeComplet: cerere.numeComplet,
                                cnp: cerere.cnp,
                                adresa: `${cerere.adresa || ''}, ${cerere.localitate || ''}`.replace(/^, /, ''),
                                scopulCererii: cerere.scopulCererii,
                                numarCerere: cerere.numarInregistrare,
                                dataCerere: cerere.createdAt?.toDate?.()?.toLocaleDateString('ro-RO'),
                              })
                            );
                            setShowEmiteDialog(true);
                          }}
                          className="hover:bg-emerald-600/20 hover:text-emerald-300 text-emerald-400 border border-transparent hover:border-emerald-400/30"
                          title="Emite adeverința"
                        >
                          <BadgeCheck className="h-5 w-5" />
                        </Button>
                      )}
                      {cerere.adeverinta?.downloadURL && (
                        <a href={cerere.adeverinta.downloadURL} target="_blank" rel="noreferrer">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-300 hover:bg-emerald-600/20 border border-transparent hover:border-emerald-400/30"
                            title={`Adeverință emisă: ${cerere.adeverinta.numarIesire}`}
                          >
                            <BadgeCheck className="h-5 w-5" />
                          </Button>
                        </a>
                      )}
                      {!cerere.raspuns && !cerere.adeverinta && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCerere(cerere);
                            setRaspunsStatus('rezolvat');
                            setRaspunsText(
                              buildRaspunsBody({
                                numeComplet: cerere.numeComplet,
                                adresa: `${cerere.adresa || ''}, ${cerere.localitate || ''}`.replace(/^, /, ''),
                                numarCerere: cerere.numarInregistrare,
                                dataCerere: cerere.createdAt?.toDate?.()?.toLocaleDateString('ro-RO'),
                                tipCerere: tipuriCereri[cerere.tipCerere] || cerere.tipCerere,
                              })
                            );
                            setShowRaspunsDialog(true);
                          }}
                          className="hover:bg-sky-600/20 hover:text-sky-300 text-sky-400 border border-transparent hover:border-sky-400/30"
                          title="Trimite răspuns oficial"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      )}
                      {cerere.raspuns?.downloadURL && (
                        <a href={cerere.raspuns.downloadURL} target="_blank" rel="noreferrer">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-sky-300 hover:bg-sky-600/20 border border-transparent hover:border-sky-400/30"
                            title={`Răspuns emis: ${cerere.raspuns.numarIesire}`}
                          >
                            <Send className="h-5 w-5" />
                          </Button>
                        </a>
                      )}
                      {(cerere.status === 'rezolvat' || cerere.status === 'respins') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-300 hover:text-rose-200 hover:bg-rose-600/20 border border-transparent hover:border-rose-400/30"
                          onClick={() => {
                            setSelectedCerere(cerere);
                            setShowDeleteDialog(true);
                          }}
                          title="Șterge cerere"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => loadCereri(true)}
            disabled={loadingMore}
            className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
          >
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Încarcă mai multe cereri
          </Button>
        </div>
      )}

      {/* Emite adeverinta Dialog */}
      <Dialog open={showEmiteDialog} onOpenChange={setShowEmiteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-400" />
              Emite adeverința
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCerere && isAdeverintaType(selectedCerere.tipCerere)
                ? ADEVERINTA_LABELS[selectedCerere.tipCerere as AdeverintaType]
                : ''}
              {' '}pentru <span className="text-white">{selectedCerere?.numeComplet}</span>.
              Completează câmpurile marcate cu [ ... ] cu datele din evidențe, apoi emite.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={adeverintaText}
            onChange={(e) => setAdeverintaText(e.target.value)}
            rows={12}
            className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
          />
          {adeverintaText.includes('[ ') && (
            <p className="text-amber-400 text-sm">
              ⚠️ Textul mai conține câmpuri necompletate [ ... ]
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEmiteDialog(false)}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
            >
              Anulează
            </Button>
            <Button
              onClick={handleEmiteAdeverinta}
              disabled={emitting || !adeverintaText.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {emitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emite cu număr de ieșire
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emite raspuns oficial Dialog */}
      <Dialog open={showRaspunsDialog} onOpenChange={setShowRaspunsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Send className="h-5 w-5 text-sky-400" />
              Trimite răspuns oficial
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Răspuns scris pentru <span className="text-white">{selectedCerere?.numeComplet}</span>
              {selectedCerere?.numarInregistrare && (
                <> la cererea <span className="font-mono text-green-400">{selectedCerere.numarInregistrare}</span></>
              )}
              . Primește număr de ieșire, semnătura primarului și QR de verificare, apoi apare în Dosarul meu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <label className="text-sm text-gray-300">Soluția cererii</label>
            <Select value={raspunsStatus} onValueChange={(v) => setRaspunsStatus(v as RaspunsStatus)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                {(Object.keys(RASPUNS_STATUS_LABELS) as RaspunsStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {RASPUNS_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={raspunsText}
            onChange={(e) => setRaspunsText(e.target.value)}
            rows={12}
            className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
          />
          {raspunsText.includes('[ ') && (
            <p className="text-amber-400 text-sm">
              ⚠️ Textul mai conține câmpuri necompletate [ ... ]
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRaspunsDialog(false)}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
            >
              Anulează
            </Button>
            <Button
              onClick={handleEmiteRaspuns}
              disabled={sendingRaspuns || !raspunsText.trim()}
              className="flex-1 bg-sky-600 hover:bg-sky-700"
            >
              {sendingRaspuns && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emite cu număr de ieșire
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCerere && (
            <>
              <DialogHeader className="sticky top-0 bg-slate-800 z-10">
                <DialogTitle className="text-white text-2xl flex items-center gap-3">
                  <FileText className="h-6 w-6 text-purple-400" />
                  Detalii Cerere
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {selectedCerere.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4 pb-4">
                {getStatusBadge(selectedCerere.status)}

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Informații Solicitant</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Nume complet:</span>
                      <p className="text-white font-medium">{selectedCerere.numeComplet}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">CNP:</span>
                      <p className="text-white font-medium">{selectedCerere.cnp}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Email:</span>
                      <p className="text-white font-medium">{selectedCerere.email}</p>
                    </div>
                    {selectedCerere.telefon && (
                      <div>
                        <span className="text-gray-400 text-sm">Telefon:</span>
                        <p className="text-white font-medium">{selectedCerere.telefon}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Adresă</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Localitate:</span>
                      <p className="text-white font-medium">{selectedCerere.localitate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Stradă:</span>
                      <p className="text-white font-medium">{selectedCerere.strada || 'N/A'}</p>
                    </div>
                    {selectedCerere.adresa && (
                      <div>
                        <span className="text-gray-400 text-sm">Adresa completă:</span>
                        <p className="text-white font-medium">{selectedCerere.adresa}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Detalii Cerere</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Tip cerere:</span>
                      <p className="text-white font-medium">{tipuriCereri[selectedCerere.tipCerere] || selectedCerere.tipCerere}</p>
                    </div>
                    {selectedCerere.scopulCererii && (
                      <div>
                        <span className="text-gray-400 text-sm">Scop:</span>
                        <p className="text-white font-medium">{selectedCerere.scopulCererii}</p>
                      </div>
                    )}
                    {selectedCerere.redirectionatCatre && (
                      <div>
                        <span className="text-gray-400 text-sm">Redirecționată către:</span>
                        <p className="text-cyan-300 font-medium">{selectedCerere.redirectionatCatre}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedCerere.fisiere && selectedCerere.fisiere.length > 0 && (
                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-blue-400" />
                        Documente atașate ({selectedCerere.fisiere.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedCerere.fisiere.map((fisier, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{fisier.name}</p>
                            {typeof fisier.size === 'number' && (
                              <p className="text-xs text-gray-400">
                                {(fisier.size / 1024 / 1024).toFixed(1)}MB
                              </p>
                            )}
                          </div>
                          {fisier.storagePath ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadAtasament(fisier)}
                              className="shrink-0 border-blue-500/40 text-blue-300 hover:bg-blue-600/20"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Descarcă
                            </Button>
                          ) : (
                            <span className="shrink-0 text-xs text-gray-500 italic">
                              indisponibil (cerere veche)
                            </span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {selectedCerere.raspuns?.downloadURL && (
                  <Card className="bg-sky-950/20 border-sky-800/30">
                    <CardHeader>
                      <CardTitle className="text-sky-300 text-lg flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Răspuns oficial emis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-3">
                      <span className="font-mono text-green-400">{selectedCerere.raspuns.numarIesire}</span>
                      <a href={selectedCerere.raspuns.downloadURL} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="border-sky-500/40 text-sky-300 hover:bg-sky-600/20">
                          <Download className="h-4 w-4 mr-1" />
                          Descarcă
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                )}

                {selectedCerere.observatii && (
                  <Card className="bg-yellow-950/20 border-yellow-800/30">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-lg">Observații</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-yellow-200">{selectedCerere.observatii}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Închide
                </Button>
                <Button onClick={() => handleDownloadPDF(selectedCerere)} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Descarcă PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog - Simple Version */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Atribuire Cerere</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCerere?.tipCerere}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Departament</label>
              <Select
                value={assignmentData.departmentId || ''}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, departmentId: value || null })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Selectează departament" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="text-gray-300">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Utilizator</label>
              <Select
                value={assignmentData.userId || ''}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, userId: value || null })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Selectează utilizator" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-gray-300">
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Prioritate</label>
              <Select
                value={assignmentData.priority}
                onValueChange={(value) => setAssignmentData({ ...assignmentData, priority: value as CererePriority })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {(Object.keys(priorityConfig) as CererePriority[]).map((priority) => {
                    const config = priorityConfig[priority];
                    const PriorityIcon = config.icon;
                    return (
                      <SelectItem key={priority} value={priority} className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <PriorityIcon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setAssignmentData({ departmentId: null, userId: null, priority: 'normal' });
              }}
            >
              Anulează
            </Button>
            <Button
              onClick={() => handleAssignment(assignmentData.departmentId, assignmentData.userId, assignmentData.priority)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Atribuie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizare Status</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCerere?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Status nou</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as CerereStatus)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {(Object.keys(statusConfig) as CerereStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    return (
                      <SelectItem key={status} value={status} className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {newStatus === 'redirectionat' && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Redirecționată către (instituția competentă) *
                </label>
                <Input
                  value={redirectionatCatre}
                  onChange={(e) => setRedirectionatCatre(e.target.value)}
                  placeholder="ex: Consiliul Județean Bacău, Direcția de Sănătate Publică..."
                  className="bg-slate-900 border-slate-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  OG 27/2002 art. 6¹: petițiile greșit îndreptate se trimit în 5 zile autorității competente, cu înștiințarea petentului.
                </p>
              </div>
            )}

            {newStatus === 'necesita_completare' && (
              <p className="text-xs text-orange-300/80 bg-orange-500/10 border border-orange-400/20 rounded-md p-2">
                Termenul legal se suspendă. Cetățeanul va putea încărca documentele lipsă din „Dosarul meu" — descrie în observații ce trebuie completat; observațiile îi sunt afișate.
              </p>
            )}
            {newStatus === 'prelungit' && (
              <p className="text-xs text-purple-300/80 bg-purple-500/10 border border-purple-400/20 rounded-md p-2">
                OG 27/2002 art. 9: termenul se prelungește cu cel mult 15 zile. Termenul din registru se actualizează automat.
              </p>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Observații (opțional)</label>
              <Textarea
                value={observatii}
                onChange={(e) => setObservatii(e.target.value)}
                placeholder="Adaugă observații despre procesarea acestei cereri..."
                className="bg-slate-900 border-slate-600 text-white"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setNewStatus('noua');
                setObservatii('');
                setRedirectionatCatre('');
              }}
            >
              Anulează
            </Button>
            <Button onClick={handleStatusChange} className="bg-blue-600 hover:bg-blue-700">
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Confirmare ștergere
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Sigur vrei să ștergi definitiv cererea {selectedCerere?.id}?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCerere(null)}>
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
