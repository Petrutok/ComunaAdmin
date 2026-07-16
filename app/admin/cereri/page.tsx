'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useCollectionSnapshot } from '@/lib/hooks/useCollectionSnapshot';
import { LiveIndicator } from '@/components/admin/LiveIndicator';

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
} from 'firebase/firestore';
import { db, auth, storage, COLLECTIONS } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Department, User as UserType } from '@/types/departments';
import {
  Mail,
  Trash2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  User,
  Paperclip,
  Loader2,
  UserPlus,
  Zap,
  ArrowUpDown,
  BadgeCheck,
  Send,
  FilePlus,
  CalendarClock,
  CornerUpRight,
  Archive,
  FileSignature,
} from 'lucide-react';
import { isAdeverintaType, buildAdeverintaBody, ADEVERINTA_LABELS } from '@/lib/adeverinte';
import type { AdeverintaType } from '@/lib/adeverinte';
import { buildRaspunsBody, RASPUNS_STATUS_LABELS, DEFAULT_RASPUNS_CORPURI } from '@/lib/raspuns';
import type { RaspunsStatus } from '@/lib/raspuns';
import { REQUEST_CONFIGS } from '@/lib/request-configs';
import { logIstoric, fetchIstoric } from '@/lib/cereri-audit';
import type { IstoricEntry } from '@/lib/cereri-audit';
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
} from '@/components/ui/table';

// Beyond the basic flow, OG 27/2002 statuses:
// - necesita_completare: missing documents requested from the citizen
//   (the legal deadline is suspended until they arrive)
// - prelungit: deadline extended by max 15 days (art. 9)
// - redirectionat: forwarded to the competent institution (art. 6^1)
// - clasat: filed without response - anonymous/duplicate petition (art. 7)
type CerereStatus =
  | 'noua'
  | 'repartizata'
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
  // Avizare circuit marker (draft in the `avizari` collection)
  avizare?: {
    id: string;
    stadiu: 'la_secretar' | 'la_primar' | 'returnat' | 'emis';
    motiv?: string;
  };
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
  'repartizata': {
    label: 'Repartizată',
    icon: UserPlus,
    color: 'bg-violet-600',
    textColor: 'text-violet-300',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-400/30',
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
  // Older pages appended one-shot on "Încarcă mai multe" (older docs
  // don't change; only the live first window is realtime)
  const [olderCereri, setOlderCereri] = useState<Cerere[]>([]);
  const [filteredCereri, setFilteredCereri] = useState<Cerere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [activeFilter, setActiveFilter] = useState<CerereStatus | 'toate'>('toate');
  const [mineOnly, setMineOnly] = useState(false);
  const [mineCount, setMineCount] = useState<number | null>(null);
  const [istoric, setIstoric] = useState<IstoricEntry[]>([]);
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
  const { user: adminUser, isAdmin } = useAdminAuth();
  const [sendingAvizare, setSendingAvizare] = useState(false);

  // Sends the drafted document into the avizare circuit
  // (responsabil -> secretar -> primar) instead of issuing it directly
  const handleTrimiteLaAvizare = async (
    tipDocument: 'adeverinta' | 'raspuns',
    continut: string,
    raspunsStatus?: RaspunsStatus
  ) => {
    if (!selectedCerere || !continut.trim()) return;
    setSendingAvizare(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/avizare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          action: 'creeaza',
          tipDocument,
          cerereId: selectedCerere.id,
          continut: continut.trim(),
          ...(raspunsStatus ? { raspunsStatus } : {}),
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Trimiterea la avizare a eșuat');

      toast({
        title: 'Trimis la avizare',
        description:
          result.stadiu === 'la_secretar'
            ? 'Documentul așteaptă avizul secretarului general.'
            : 'Documentul așteaptă semnătura primarului.',
      });
      setShowEmiteDialog(false);
      setShowRaspunsDialog(false);
      setAdeverintaText('');
      setRaspunsText('');
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Trimiterea la avizare a eșuat',
        variant: 'destructive',
      });
    } finally {
      setSendingAvizare(false);
    }
  };

  // A returned draft keeps its text in the avizari doc - prefill it so
  // the responsabil corrects instead of retyping
  const loadReturnedDraft = async (cerere: Cerere): Promise<string | null> => {
    if (cerere.avizare?.stadiu !== 'returnat' || !cerere.avizare.id) return null;
    try {
      const snap = await getDoc(doc(db, 'avizari', cerere.avizare.id));
      return (snap.data()?.continut as string) || null;
    } catch {
      return null;
    }
  };

  // Shared mapper: raw Firestore doc -> Cerere (used by the live listener
  // and by the one-shot "load more" fetch)
  const mapCerere = (id: string, docData: Record<string, any>): Cerere =>
    ({
      id,
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
      dataInregistrare:
        docData.createdAt?.toDate?.()?.toLocaleDateString('ro-RO') ||
        new Date().toLocaleDateString('ro-RO'),
      ...docData,
    }) as Cerere;

  // --- Realtime live window ---------------------------------------------
  // The first page (or, in "Ale mele" mode, the whole small assigned set)
  // is a live Firestore listener; older pages are appended one-shot below.
  // Bounded queries only (limit) so a listener never scans the collection.
  const liveQuery = useMemo(() => {
    if (!adminUser?.uid) return null;
    return mineOnly
      ? query(
          collection(db, 'form_submissions'),
          where('assignedToUserId', '==', adminUser.uid),
          limit(300)
        )
      : query(collection(db, 'form_submissions'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
  }, [mineOnly, adminUser?.uid]);

  const {
    data: liveCereri,
    loading,
    fromCache,
  } = useCollectionSnapshot<Cerere>(liveQuery, mapCerere, [mineOnly, adminUser?.uid]);

  // Older pages reset whenever the live query changes (mode switch)
  useEffect(() => {
    setOlderCereri([]);
    setMoreOlder(true);
  }, [mineOnly, adminUser?.uid]);

  // Combined dataset = live window + appended older pages, de-duped by id
  // (a doc could briefly appear in both if the window boundary shifted)
  const cereri = useMemo(() => {
    const seen = new Set<string>();
    const out: Cerere[] = [];
    for (const c of [...liveCereri, ...olderCereri]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  }, [liveCereri, olderCereri]);

  // In "Ale mele" mode the whole set is loaded; otherwise there may be
  // older pages while the live window is full and we haven't hit the end
  const [moreOlder, setMoreOlder] = useState(true);
  const hasMore = !mineOnly && liveCereri.length === PAGE_SIZE && moreOlder;

  // Append the next older page (one-shot). Cursor is the createdAt of the
  // last loaded doc - avoids needing the raw DocumentSnapshot.
  const loadMoreOlder = async (): Promise<boolean> => {
    const last = cereri[cereri.length - 1];
    if (mineOnly || !last?.createdAt) return false;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'form_submissions'),
          orderBy('createdAt', 'desc'),
          startAfter(last.createdAt),
          limit(PAGE_SIZE)
        )
      );
      const older = snapshot.docs.map((d) => mapCerere(d.id, d.data()));
      setOlderCereri((prev) => [...prev, ...older]);
      const more = snapshot.docs.length === PAGE_SIZE;
      setMoreOlder(more);
      return more;
    } catch (error) {
      console.error('Error loading older cereri:', error);
      toast({ title: 'Eroare', description: 'Nu s-au putut încărca mai multe cereri', variant: 'destructive' });
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  // Honest search: pull all older pages so client-side filtering sees the
  // full dataset instead of silently truncating matches.
  const [loadingAll, setLoadingAll] = useState(false);
  const loadAllRemaining = async () => {
    setLoadingAll(true);
    try {
      let more = hasMore;
      let guard = 0; // safety cap; commune volume is in the hundreds
      while (more && guard < 50) {
        more = await loadMoreOlder();
        guard++;
      }
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadDepartmentsAndUsers();
  }, []);

  useEffect(() => {
    filterCereri();
  }, [cereri, activeFilter, searchTerm, filterType, sortOrder]);

  // Audit trail shown in the details dialog
  useEffect(() => {
    if (!showDetailsDialog || !selectedCerere) {
      setIstoric([]);
      return;
    }
    fetchIstoric(selectedCerere.id).then(setIstoric).catch(() => setIstoric([]));
  }, [showDetailsDialog, selectedCerere?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actor identity for audit entries
  const actorInfo = () => ({
    autorId: adminUser?.uid || 'necunoscut',
    autorNume: adminUser?.displayName || adminUser?.email || 'Staff',
  });

  // Statuses that still need action from the assignee
  const OPEN_STATUSES: CerereStatus[] = ['noua', 'repartizata', 'in_lucru', 'necesita_completare', 'prelungit'];

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

      logIstoric({
        cerereId: selectedCerere.id,
        tip: 'atribuire',
        mesaj: `Repartizat: ${[department?.name, user?.fullName].filter(Boolean).join(' / ') || 'nimeni'} · prioritate ${priority}`,
        ...actorInfo(),
      });

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
    } catch (error) {
      console.error('Error assigning cerere:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut atribui cererea",
        variant: "destructive",
      });
    }
  };
  // Status change goes through /api/schimba-status: the update, the
  // registry sync (OG 27/2002 deadlines), the audit entry and the citizen
  // notification happen server-side in one persistent event - delivery no
  // longer depends on this browser tab staying open.
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
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/schimba-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          collection: 'form_submissions',
          docId: selectedCerere.id,
          newStatus,
          observatii: observatii.trim() || undefined,
          redirectionatCatre:
            newStatus === 'redirectionat' ? redirectionatCatre.trim() : undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Actualizarea a eșuat');
      }

      toast({
        title: "Status actualizat",
        description: `Cererea a fost marcată ca ${statusConfig[newStatus].label}`,
      });

      setShowStatusDialog(false);
      setNewStatus('noua');
      setObservatii('');
      setRedirectionatCatre('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut actualiza statusul",
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

      // Citizen notification is sent server-side by /api/emite-adeverinta

      toast({
        title: 'Adeverință emisă',
        description: `Nr. ieșire ${result.numarIesire} — cetățeanul o poate descărca din Dosarul meu.`,
      });
      setShowEmiteDialog(false);
      setAdeverintaText('');
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

  // Per-category templates for the response body (config/raspuns_templates,
  // edited in Admin -> Sabloane raspuns), loaded once per session
  const raspunsTemplatesRef = useRef<Record<string, string> | null>(null);

  const openRaspunsDialog = async (cerere: Cerere) => {
    setSelectedCerere(cerere);
    setRaspunsStatus('rezolvat');

    // Returned draft: correct the existing text instead of starting over
    const returnedDraft = await loadReturnedDraft(cerere);
    if (returnedDraft) {
      setRaspunsText(returnedDraft);
      setShowRaspunsDialog(true);
      return;
    }

    if (raspunsTemplatesRef.current === null) {
      try {
        const snap = await getDoc(doc(db, 'config', 'raspuns_templates'));
        raspunsTemplatesRef.current = (snap.data() as Record<string, string>) || {};
      } catch {
        raspunsTemplatesRef.current = {};
      }
    }
    const category = REQUEST_CONFIGS[cerere.tipCerere]?.category as string | undefined;
    // Firestore template first (Admin -> Sabloane raspuns), then the
    // professional per-category default
    const corp =
      (category ? raspunsTemplatesRef.current[category] : undefined) ||
      (category ? DEFAULT_RASPUNS_CORPURI[category] : undefined) ||
      DEFAULT_RASPUNS_CORPURI.general;

    setRaspunsText(
      buildRaspunsBody(
        {
          numeComplet: cerere.numeComplet,
          adresa: `${cerere.adresa || ''}, ${cerere.localitate || ''}`.replace(/^, /, ''),
          numarCerere: cerere.numarInregistrare,
          dataCerere: cerere.createdAt?.toDate?.()?.toLocaleDateString('ro-RO'),
          tipCerere: tipuriCereri[cerere.tipCerere] || cerere.tipCerere,
        },
        corp
      )
    );
    setShowRaspunsDialog(true);
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

      // Citizen notification is sent server-side by /api/emite-raspuns

      toast({
        title: 'Răspuns emis',
        description: `Nr. ieșire ${result.numarIesire} — cetățeanul îl poate descărca din Dosarul meu.`,
      });
      setShowRaspunsDialog(false);
      setRaspunsText('');
      setRaspunsStatus('rezolvat');
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
    const config = statusConfig[status] || statusConfig['noua'];
    const Icon = config.icon;
    return (
      <Badge
        variant="outline"
        className={`${config.bgColor} ${config.textColor} ${config.borderColor} inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium whitespace-nowrap`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCount = (status: CerereStatus) => {
    return cereri.filter(c => c.status === status).length;
  };

  // Draft in the avizare circuit: block a second emit until it resolves
  const isAvizareActiva = (cerere: Cerere) =>
    cerere.avizare?.stadiu === 'la_secretar' || cerere.avizare?.stadiu === 'la_primar';

  const getAvizareBadge = (cerere: Cerere) => {
    const stadiu = cerere.avizare?.stadiu;
    if (stadiu === 'la_secretar' || stadiu === 'la_primar') {
      return (
        <Badge
          variant="outline"
          className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium whitespace-nowrap"
          title="Documentul este în circuitul de avizare"
        >
          <FileSignature className="h-3 w-3" />
          {stadiu === 'la_secretar' ? 'La secretar' : 'La primar'}
        </Badge>
      );
    }
    if (stadiu === 'returnat') {
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-300 border-amber-500/30 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium whitespace-nowrap"
          title={cerere.avizare?.motiv ? `Motiv: ${cerere.avizare.motiv}` : 'Returnat pentru corecturi'}
        >
          <FileSignature className="h-3 w-3" />
          Returnat
        </Badge>
      );
    }
    return null;
  };

  const getTipCerereBadge = (tip: string) => {
    return (
      <Badge variant="outline" className="text-gray-300">
        {tipuriCereri[tip] || tip}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 p-6 bg-slate-900 min-h-screen">
      {/* Header + toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="bg-purple-500/15 rounded-lg p-2">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            Gestiune Cereri
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-semibold text-gray-200">{cereri.length}</span> cereri ·{' '}
            <span className="font-semibold text-blue-300">{getStatusCount('noua')}</span> noi ·{' '}
            <span className="font-semibold text-amber-300">{getStatusCount('in_lucru')}</span> în lucru
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Caută nume, CNP, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-64 bg-slate-800 border-slate-600 text-white text-sm placeholder:text-gray-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="h-9 bg-slate-800 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            {sortOrder === 'desc' ? 'Nou → Vechi' : 'Vechi → Nou'}
          </Button>
          <LiveIndicator fromCache={fromCache} />
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMineOnly((v) => !v)}
          className={`h-8 shrink-0 text-xs font-medium ${
            mineOnly
              ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 hover:text-white'
              : 'bg-slate-800/60 border-slate-600 text-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-200'
          }`}
        >
          <User className="h-3.5 w-3.5 mr-1.5" />
          Ale mele
          {mineCount !== null && mineCount > 0 && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0 text-[11px] font-semibold ${mineOnly ? 'bg-white/20' : 'bg-indigo-500/20'}`}>
              {mineCount}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveFilter('toate')}
          className={`h-8 shrink-0 text-xs font-medium ${
            activeFilter === 'toate'
              ? 'bg-slate-600 text-white border-slate-500 hover:bg-slate-600 hover:text-white'
              : 'bg-slate-800/60 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Toate
          <span className="ml-1.5 rounded-full bg-slate-500/40 px-1.5 py-0 text-[11px] font-semibold">
            {cereri.length}
          </span>
        </Button>
        {(Object.keys(statusConfig) as CerereStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = getStatusCount(status);

          return (
            <Button
              key={status}
              size="sm"
              variant="outline"
              onClick={() => setActiveFilter(status)}
              className={`h-8 shrink-0 text-xs font-medium ${
                activeFilter === status
                  ? `${config.color} text-white border-transparent hover:${config.color} hover:text-white`
                  : `bg-slate-800/60 border-slate-600 ${config.textColor} hover:bg-slate-700`
              }`}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {config.label}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0 text-[11px] font-semibold ${activeFilter === status ? 'bg-white/20' : config.bgColor}`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Honest-search banner: filtering only what's loaded would hide matches */}
      {!loading && hasMore && !mineOnly &&
        (searchTerm.trim() !== '' || activeFilter !== 'toate' || filterType !== 'toate') && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <p className="text-sm text-amber-200">
              Cauți doar în cererile încărcate ({cereri.length}). Pot exista potriviri neîncărcate.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadAllRemaining}
              disabled={loadingAll}
              className="shrink-0 border-amber-500/40 text-amber-200 hover:bg-amber-500/15 h-8"
            >
              {loadingAll && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Caută în toate
            </Button>
          </div>
        )}

      {/* Cereri List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : filteredCereri.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Nu există cereri {activeFilter !== 'toate' ? `cu statusul "${statusConfig[activeFilter as CerereStatus].label}"` : ''}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/60 border-slate-700/60 overflow-hidden">
          <div className="divide-y divide-slate-700/60">
            {filteredCereri.map((cerere) => (
              <div
                key={cerere.id}
                className="px-4 py-3 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 shrink-0">
                        {cerere.numarInregistrare || `${cerere.id.slice(0, 8)}…`}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">
                        {tipuriCereri[cerere.tipCerere] || cerere.tipCerere}
                      </span>
                      {getStatusBadge(cerere.status)}
                      {getAvizareBadge(cerere)}
                      {cerere.priority === 'urgent' && (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/15 text-rose-300 border-rose-500/30 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                        >
                          <Zap className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      {cerere.fisiere && cerere.fisiere.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-300/90">
                          <Paperclip className="h-3 w-3" />
                          {cerere.fisiere.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 min-w-0">
                      <span className="text-gray-400 font-medium shrink-0">{cerere.numeComplet}</span>
                      {cerere.email && (
                        <>
                          <span>·</span>
                          <span className="truncate">{cerere.email}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="shrink-0">{formatShortDate(cerere.createdAt)}</span>
                      {(cerere.departmentName || cerere.assignedToUserName) && (
                        <>
                          <span>·</span>
                          <span className="text-purple-300/80 truncate shrink-0">
                            {[cerere.departmentName, cerere.assignedToUserName].filter(Boolean).join(' / ')}
                          </span>
                        </>
                      )}
                      {cerere.scopulCererii && (
                        <>
                          <span className="hidden md:inline">·</span>
                          <span className="hidden md:inline truncate italic">{cerere.scopulCererii}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedCerere(cerere);
                        setShowAssignDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-gray-400 hover:bg-purple-600/20 hover:text-purple-300"
                      title="Atribuie"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedCerere(cerere);
                        setShowDetailsDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-gray-400 hover:bg-blue-600/20 hover:text-blue-300"
                      title="Vezi detalii"
                    >
                      <Eye className="h-4 w-4" />
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
                      className="h-8 w-8 p-0 text-gray-400 hover:bg-amber-600/20 hover:text-amber-300"
                      title="Modifică status"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadPDF(cerere)}
                      className="h-8 w-8 p-0 text-gray-400 hover:bg-green-600/20 hover:text-green-300"
                      title="Descarcă PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {isAdeverintaType(cerere.tipCerere) &&
                      !cerere.adeverinta &&
                      !isAvizareActiva(cerere) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          setSelectedCerere(cerere);
                          const returnedDraft = await loadReturnedDraft(cerere);
                          setAdeverintaText(
                            returnedDraft ||
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
                        className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300"
                        title="Emite adeverința"
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {cerere.adeverinta?.downloadURL && (
                      <a href={cerere.adeverinta.downloadURL} target="_blank" rel="noreferrer">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-300 hover:bg-emerald-600/20"
                          title={`Adeverință emisă: ${cerere.adeverinta.numarIesire}`}
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {!cerere.raspuns && !cerere.adeverinta && !isAvizareActiva(cerere) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRaspunsDialog(cerere)}
                        className="h-8 w-8 p-0 text-sky-400 hover:bg-sky-600/20 hover:text-sky-300"
                        title="Trimite răspuns oficial"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {cerere.raspuns?.downloadURL && (
                      <a href={cerere.raspuns.downloadURL} target="_blank" rel="noreferrer">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-sky-300 hover:bg-sky-600/20"
                          title={`Răspuns emis: ${cerere.raspuns.numarIesire}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {(cerere.status === 'rezolvat' || cerere.status === 'respins') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-rose-300 hover:bg-rose-600/20"
                        onClick={() => {
                          setSelectedCerere(cerere);
                          setShowDeleteDialog(true);
                        }}
                        title="Șterge cerere"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => loadMoreOlder()}
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
            <p className="text-amber-400 text-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Textul mai conține câmpuri necompletate [ ... ]
            </p>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => handleTrimiteLaAvizare('adeverinta', adeverintaText)}
              disabled={sendingAvizare || emitting || !adeverintaText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {sendingAvizare && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Trimite la avizare (secretar → primar)
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEmiteDialog(false)}
                className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
              >
                Anulează
              </Button>
              {isAdmin && (
                <Button
                  onClick={handleEmiteAdeverinta}
                  disabled={emitting || sendingAvizare || !adeverintaText.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {emitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Emitere rapidă (toate semnăturile)
                </Button>
              )}
            </div>
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
            <p className="text-amber-400 text-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Textul mai conține câmpuri necompletate [ ... ]
            </p>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => handleTrimiteLaAvizare('raspuns', raspunsText, raspunsStatus)}
              disabled={sendingAvizare || sendingRaspuns || !raspunsText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {sendingAvizare && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Trimite la avizare (secretar → primar)
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRaspunsDialog(false)}
                className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
              >
                Anulează
              </Button>
              {isAdmin && (
                <Button
                  onClick={handleEmiteRaspuns}
                  disabled={sendingRaspuns || sendingAvizare || !raspunsText.trim()}
                  className="flex-1 bg-sky-600 hover:bg-sky-700"
                >
                  {sendingRaspuns && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Emitere rapidă (toate semnăturile)
                </Button>
              )}
            </div>
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

                {istoric.length > 0 && (
                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-400" />
                        Istoric ({istoric.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {istoric.map((entry) => (
                          <div key={entry.id} className="flex gap-3 text-sm border-l-2 border-slate-700 pl-3">
                            <div className="min-w-0">
                              <p className="text-gray-200 break-words">{entry.mesaj}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {entry.autorNume} · {formatDate(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
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
                  {/* 'repartizata' is set by the system (auto-repartizare), not
                      chosen manually - the schimba-status API rejects it. */}
                  {(Object.keys(statusConfig) as CerereStatus[])
                    .filter((status) => status !== 'repartizata')
                    .map((status) => {
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
