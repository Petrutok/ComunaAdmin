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
import { db } from '@/lib/firebase';
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
  attachmentNames?: string[];
  status: 'în așteptare' | 'în lucru' | 'rezolvat' | 'respins';
  dataInregistrare: string;
  timestamp: any;
  observatii?: string;
  // Câmpuri adiționale opționale
  numeFirma?: string;
  cui?: string;
  reprezentantLegal?: string;
  suprafataTeren?: string;
  nrCadastral?: string;
  marcaAuto?: string;
  nrInmatriculare?: string;
}

const statusColors = {
  'în așteptare': 'bg-yellow-500',
  'în lucru': 'bg-blue-500',
  'rezolvat': 'bg-green-500',
  'respins': 'bg-red-500'
};

const statusIcons = {
  'în așteptare': Clock,
  'în lucru': AlertCircle,
  'rezolvat': CheckCircle,
  'respins': XCircle
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('toate');
  const [selectedCerere, setSelectedCerere] = useState<Cerere | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [observatii, setObservatii] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('toate');
  const { toast } = useToast();

  useEffect(() => {
    loadCereri();
  }, []);

  useEffect(() => {
    filterCereri();
  }, [cereri, activeTab, searchTerm, filterType]);

  const loadCereri = async () => {
    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'cereri'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Cerere[];
      
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

  const filterCereri = () => {
    let filtered = [...cereri];

    // Filtrare după status (tab)
    if (activeTab !== 'toate') {
      filtered = filtered.filter(c => c.status === activeTab);
    }

    // Filtrare după tip cerere
    if (filterType !== 'toate') {
      filtered = filtered.filter(c => c.tipCerere === filterType);
    }

    // Căutare
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.numeComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnp.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCereri(filtered);
  };
        const handleStatusChange = async () => {
        if (!selectedCerere || !newStatus) return;

         try {
      // Construiește obiectul de actualizare dinamic
      
    const updateData: any = {
     status: newStatus,
    dataActualizare: new Date().toISOString(),
      };

      // Adaugă observații doar dacă există text
      const finalObservatii = observatii.trim() || selectedCerere.observatii || '';
      if (finalObservatii) {
        updateData.observatii = finalObservatii;
      }

      await updateDoc(doc(db, 'cereri', selectedCerere.id), updateData);

      toast({
        title: "Status actualizat",
        description: `Cererea a fost marcată ca ${newStatus}`,
      });

      setShowStatusDialog(false);
      setNewStatus('');
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
      await deleteDoc(doc(db, 'cereri', selectedCerere.id));
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons];
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors]} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTipCerereBadge = (tip: string) => {
    return (
      <Badge variant="outline" className="text-gray-300">
        {tipuriCereri[tip] || tip}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestiune Cereri</h1>
          <p className="text-gray-400 mt-1">
            Total: {cereri.length} cereri | {cereri.filter(c => c.status === 'în așteptare').length} în așteptare
          </p>
        </div>
        <Button onClick={loadCereri} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Filtre și căutare */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Caută după nume, CNP, email sau ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px] bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Tip cerere" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="toate">Toate tipurile</SelectItem>
                {Object.entries(tipuriCereri).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-gray-300">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs pentru status */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="toate">
            Toate
            <Badge className="ml-2" variant="secondary">
              {cereri.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="în așteptare">
            În așteptare
            {cereri.filter(c => c.status === 'în așteptare').length > 0 && (
              <Badge className="ml-2 bg-yellow-500">
                {cereri.filter(c => c.status === 'în așteptare').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="în lucru">
            În lucru
            {cereri.filter(c => c.status === 'în lucru').length > 0 && (
              <Badge className="ml-2 bg-blue-500">
                {cereri.filter(c => c.status === 'în lucru').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rezolvat">
            Rezolvate
            <Badge className="ml-2" variant="secondary">
              {cereri.filter(c => c.status === 'rezolvat').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="respins">
            Respinse
            <Badge className="ml-2" variant="secondary">
              {cereri.filter(c => c.status === 'respins').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Se încarcă...
            </div>
          ) : filteredCereri.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="text-center py-8">
                <p className="text-gray-400">
                  Nu există cereri {activeTab !== 'toate' ? `cu statusul "${activeTab}"` : ''}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">ID</TableHead>
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Solicitant</TableHead>
                    <TableHead className="text-gray-400">Tip cerere</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCereri.map((cerere) => (
                    <TableRow key={cerere.id} className="border-slate-700">
                      <TableCell className="text-gray-300 font-mono text-xs">
                        {cerere.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {formatDate(cerere.dataInregistrare)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-white font-medium">
                              {cerere.numeComplet}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <CreditCard className="h-3 w-3" />
                            <span>{cerere.cnp}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTipCerereBadge(cerere.tipCerere)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(cerere.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCerere(cerere);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPDF(cerere)}
                          >
                            <Download className="h-4 w-4" />
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
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                          {cerere.status === 'rezolvat' || cerere.status === 'respins' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => {
                                setSelectedCerere(cerere);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

 {/* Dialog pentru detalii cerere */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedCerere && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-xl">
                  Detalii Cerere
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  ID: {selectedCerere.id} • {formatDate(selectedCerere.dataInregistrare)}
                </DialogDescription>
              </DialogHeader>
              
              {/* Badges pentru tip și status */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-700">
                {getTipCerereBadge(selectedCerere.tipCerere)}
                {getStatusBadge(selectedCerere.status)}
              </div>
              
              <div className="space-y-6 mt-4">
                {/* Date personale */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Date personale
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Nume complet:</span>
                      <p className="text-white font-medium">{selectedCerere.numeComplet}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">CNP:</span>
                      <p className="text-white font-medium">{selectedCerere.cnp}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {selectedCerere.email}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Telefon:</span>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedCerere.telefon}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adresă */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Adresă
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Localitate:</span>
                      <p className="text-white font-medium">{selectedCerere.localitate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Adresă completă:</span>
                      <p className="text-white font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedCerere.adresa}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date specifice cererii */}
                {(selectedCerere.numeFirma || selectedCerere.cui || selectedCerere.marcaAuto) && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Date specifice
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedCerere.numeFirma && (
                        <div>
                          <span className="text-gray-400">Nume firmă:</span>
                          <p className="text-white font-medium">{selectedCerere.numeFirma}</p>
                        </div>
                      )}
                      {selectedCerere.cui && (
                        <div>
                          <span className="text-gray-400">CUI:</span>
                          <p className="text-white font-medium">{selectedCerere.cui}</p>
                        </div>
                      )}
                      {selectedCerere.marcaAuto && (
                        <div>
                          <span className="text-gray-400">Marcă auto:</span>
                          <p className="text-white font-medium">{selectedCerere.marcaAuto}</p>
                        </div>
                      )}
                      {selectedCerere.nrInmatriculare && (
                        <div>
                          <span className="text-gray-400">Nr. înmatriculare:</span>
                          <p className="text-white font-medium">{selectedCerere.nrInmatriculare}</p>
                        </div>
                      )}
                      {selectedCerere.suprafataTeren && (
                        <div>
                          <span className="text-gray-400">Suprafață teren:</span>
                          <p className="text-white font-medium">{selectedCerere.suprafataTeren}</p>
                        </div>
                      )}
                      {selectedCerere.nrCadastral && (
                        <div>
                          <span className="text-gray-400">Nr. cadastral:</span>
                          <p className="text-white font-medium">{selectedCerere.nrCadastral}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conținut cerere */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Conținut cerere</h3>
                  <div className="bg-slate-900 rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedCerere.scopulCererii}
                    </p>
                  </div>
                </div>

                {/* Documente atașate */}
                {selectedCerere.attachmentNames && selectedCerere.attachmentNames.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Paperclip className="h-5 w-5" />
                      Documente atașate
                    </h3>
                    <div className="space-y-2">
                      {selectedCerere.attachmentNames.map((fileName, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>{fileName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observații */}
                {selectedCerere.observatii && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Observații admin</h3>
                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                      <p className="text-yellow-200">
                        {selectedCerere.observatii}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Istoric</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Înregistrată: {formatDate(selectedCerere.dataInregistrare)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <AlertCircle className="h-4 w-4" />
                      <span>Status curent: {selectedCerere.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Închide
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedCerere)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descarcă PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog pentru schimbare status */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizare Status Cerere</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modifică statusul și adaugă observații pentru cererea #{selectedCerere?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Status nou</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="în așteptare" className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      În așteptare
                    </div>
                  </SelectItem>
                  <SelectItem value="în lucru" className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      În lucru
                    </div>
                  </SelectItem>
                  <SelectItem value="rezolvat" className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Rezolvat
                    </div>
                  </SelectItem>
                  <SelectItem value="respins" className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Respins
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400">Observații (opțional)</label>
              <Textarea
                value={observatii}
                onChange={(e) => setObservatii(e.target.value)}
                placeholder="Ex: Cerere procesată, documentele sunt în regulă..."
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
                setNewStatus('');
                setObservatii('');
              }}
            >
              Anulează
            </Button>
            <Button onClick={handleStatusChange}>
              Salvează modificările
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru ștergere */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Ești sigur că vrei să ștergi această cerere?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Această acțiune nu poate fi anulată. Cererea #{selectedCerere?.id.slice(0, 8)} va fi ștearsă definitiv din sistem.
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