'use client';

import { useEffect, useState } from 'react';
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
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
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

type CerereStatus = 'noua' | 'in_lucru' | 'rezolvat' | 'respins';
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
  status: CerereStatus;
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
  fisiere?: any[];
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
  const [selectedCerere, setSelectedCerere] = useState<Cerere | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<CerereStatus>('noua');
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

  useEffect(() => {
    loadCereri();
    loadDepartmentsAndUsers();
  }, []);

  useEffect(() => {
    filterCereri();
  }, [cereri, activeFilter, searchTerm, filterType, sortOrder]);

  const loadCereri = async () => {
    setLoading(true);

    try {
      const q = query(
        collection(db, 'form_submissions'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

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

      setCereri(data);
    } catch (error: any) {
      console.error('Error loading cereri:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca cererile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
  const handleStatusChange = async () => {
    if (!selectedCerere || !newStatus) return;

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      const finalObservatii = observatii.trim() || selectedCerere.observatii || '';
      if (finalObservatii) {
        updateData.observatii = finalObservatii;
      }

      await updateDoc(doc(db, 'form_submissions', selectedCerere.id), updateData);

      toast({
        title: "Status actualizat",
        description: `Cererea a fost marcată ca ${statusConfig[newStatus].label}`,
      });

      setShowStatusDialog(false);
      setNewStatus('noua');
      setObservatii('');
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

  const handleDownloadPDF = async (cerere: Cerere) => {
    try {
      const response = await fetch('/api/download-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        <Button onClick={loadCereri} className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all">
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
                  </CardContent>
                </Card>

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
