'use client';

import { useEffect, useState, useMemo } from 'react';

// Page size for the paginated registry table
const REGISTRU_PAGE_SIZE = 200;
import { useRouter } from 'next/navigation';
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
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, storage, COLLECTIONS, RegistruDocument, StatusRegistru } from '@/lib/firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { TIP_DOCUMENT_CONFIG, STATUS_CONFIG, DEPARTMENTS_LIST } from '@/types/registru';
import { TENANT } from '@/lib/tenant';
import { buildRaspunsBody, DEFAULT_RASPUNS_CORPURI } from '@/lib/raspuns';
import {
  AlertCircle,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  Package,
  Paperclip,
  Plus,
  Printer,
  ScrollText,
  Send,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
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
} from '@/components/ui/alert-dialog';
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
import { exportToCSV, exportToExcel } from '@/lib/utils/exportRegistruData';
import { useCollectionSnapshot } from '@/lib/hooks/useCollectionSnapshot';
import { LiveIndicator } from '@/components/admin/LiveIndicator';

export default function AdminRegistruPage() {
  const router = useRouter();
  const [olderDocuments, setOlderDocuments] = useState<RegistruDocument[]>([]);
  const [moreOlder, setMoreOlder] = useState(true);
  const [filteredDocuments, setFilteredDocuments] = useState<RegistruDocument[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusRegistru | 'toate'>('toate');
  const [selectedDocument, setSelectedDocument] = useState<RegistruDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<RegistruDocument | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newStatus, setNewStatus] = useState<StatusRegistru>('nou');
  const [observatii, setObservatii] = useState('');
  const [showRaspunsDialog, setShowRaspunsDialog] = useState(false);
  const [raspunsText, setRaspunsText] = useState('');
  const [sendingRaspuns, setSendingRaspuns] = useState(false);
  const [sendingAvizare, setSendingAvizare] = useState(false);
  const { isAdmin } = useAdminAuth();
  const [showExportAnDialog, setShowExportAnDialog] = useState(false);
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // --- Realtime live window: newest REGISTRU_PAGE_SIZE entries via one
  // listener (IMAP/manual/online docs arrive on their own). Older pages
  // appended one-shot below. Bounded query only (limit).
  const mapDocument = (id: string, data: Record<string, any>) =>
    ({ id, ...data }) as RegistruDocument;

  const liveQuery = useMemo(
    () =>
      query(
        collection(db, COLLECTIONS.REGISTRU_GENERAL),
        orderBy('dataInregistrare', 'desc'),
        limit(REGISTRU_PAGE_SIZE)
      ),
    []
  );
  const { data: liveDocuments, loading, fromCache } = useCollectionSnapshot<RegistruDocument>(
    liveQuery,
    mapDocument,
    []
  );

  const documents = useMemo(() => {
    const seen = new Set<string>();
    const out: RegistruDocument[] = [];
    for (const d of [...liveDocuments, ...olderDocuments]) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        out.push(d);
      }
    }
    return out;
  }, [liveDocuments, olderDocuments]);

  const hasMore = liveDocuments.length === REGISTRU_PAGE_SIZE && moreOlder;

  useEffect(() => {
    filterDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, activeFilter, searchTerm, sortOrder]);

  // Append the next older page (one-shot); cursor is the last doc's date.
  const loadMoreOlder = async (): Promise<boolean> => {
    const last = documents[documents.length - 1];
    if (!last?.dataInregistrare) return false;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.REGISTRU_GENERAL),
          orderBy('dataInregistrare', 'desc'),
          startAfter(last.dataInregistrare),
          limit(REGISTRU_PAGE_SIZE)
        )
      );
      setOlderDocuments((prev) => [...prev, ...snapshot.docs.map((d) => mapDocument(d.id, d.data()))]);
      const more = snapshot.docs.length === REGISTRU_PAGE_SIZE;
      setMoreOlder(more);
      return more;
    } catch (error) {
      console.error('Error loading older documents:', error);
      toast({ title: 'Eroare', description: 'Nu s-au putut încărca mai multe documente', variant: 'destructive' });
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (activeFilter !== 'toate') {
      filtered = filtered.filter(d => d.status === activeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.numarInregistrare.toLowerCase().includes(search) ||
        d.emitent.toLowerCase().includes(search) ||
        d.emailEmitent?.toLowerCase().includes(search) ||
        d.continut.toLowerCase().includes(search) ||
        d.destinatar.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const dateA = a.dataInregistrare?.toMillis?.() || 0;
      const dateB = b.dataInregistrare?.toMillis?.() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredDocuments(filtered);
  };

  const handleStatusChange = async () => {
    if (!selectedDocument || !newStatus) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.REGISTRU_GENERAL, selectedDocument.id), {
        status: newStatus,
        observatii: observatii.trim() || selectedDocument.observatii || '',
        updatedAt: Timestamp.now(),
      });

      toast({
        title: 'Status actualizat',
        description: `Documentul a fost marcat ca ${STATUS_CONFIG[newStatus].label}`,
      });

      setShowStatusDialog(false);
      setNewStatus('nou');
      setObservatii('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza statusul',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.REGISTRU_GENERAL, selectedDocument.id));

      toast({
        title: 'Document șters',
        description: 'Documentul a fost șters definitiv.',
      });

      setShowDeleteDialog(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge documentul',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Printable fisa de inregistrare: opens a minimal print window with the
  // entry's data (used for physical dosare that need a paper cover sheet)
  const handlePrint = (documentReg: RegistruDocument) => {
    const esc = (value?: string | null) =>
      (value || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tipLabel = TIP_DOCUMENT_CONFIG[documentReg.tipDocument]?.label || documentReg.tipDocument;
    const statusLabel = STATUS_CONFIG[documentReg.status]?.label || documentReg.status;
    const directie = (documentReg.directie || 'intrare') === 'intrare' ? 'Intrare' : 'Ieșire';

    const row = (label: string, value?: string | null) =>
      `<tr><td class="label">${label}</td><td>${esc(value)}</td></tr>`;

    const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<title>Fișă înregistrare ${esc(documentReg.numarInregistrare)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 40px; }
  .antet { text-align: center; margin-bottom: 6px; }
  .antet h1 { font-size: 15px; margin: 0; } .antet p { font-size: 12px; margin: 2px 0; }
  hr { border: none; border-top: 1.5px solid #111; margin: 10px 0 18px; }
  h2 { text-align: center; font-size: 16px; margin: 0 0 4px; }
  .nr { text-align: center; font-size: 13px; margin-bottom: 22px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { border: 1px solid #444; padding: 7px 10px; vertical-align: top; }
  td.label { width: 200px; font-weight: bold; background: #f2f2f2; }
  .footer { margin-top: 28px; font-size: 11px; color: #555; text-align: center; }
  @media print { body { margin: 15mm; } }
</style></head><body>
<div class="antet"><h1>${esc(TENANT.antetOficial)}</h1><p>${esc(TENANT.judet)}</p></div>
<hr>
<h2>FIȘĂ DE ÎNREGISTRARE — REGISTRU GENERAL</h2>
<p class="nr">Nr. <strong>${esc(documentReg.numarInregistrare)}</strong> din ${esc(formatDate(documentReg.dataInregistrare))}</p>
<table>
${row('Direcție', directie)}
${row('Tip document', tipLabel)}
${row('Emitent', documentReg.emitent)}
${row('Nr. / data emitent', [documentReg.numarExtern, documentReg.dataExterna].filter(Boolean).join(' / ') || null)}
${row('Destinatar', documentReg.destinatar)}
${row('Conținut pe scurt', documentReg.continut)}
${row('Departament', documentReg.departament)}
${row('Status', statusLabel)}
${row('Termen legal de răspuns', documentReg.termen ? formatDate(documentReg.termen) : null)}
${row('Observații', documentReg.observatii)}
</table>
<div class="footer">Generat electronic din ${esc(TENANT.numePrimarie)} — Primăria Digitală, ${new Date().toLocaleString('ro-RO')}</div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast({
        title: 'Pop-up blocat',
        description: 'Permite ferestrele pop-up pentru a printa fișa.',
        variant: 'destructive',
      });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Scans of physical documents (uploaded at manual registration): staff
  // read access via storage.rules; opens each file in a new tab
  const handleOpenFisiere = async (document: RegistruDocument) => {
    for (const fisier of document.fisiere || []) {
      try {
        const url = await getDownloadURL(storageRef(storage, fisier.storagePath));
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error opening attachment:', fisier.name, error);
        toast({
          title: 'Eroare',
          description: `Nu s-a putut deschide ${fisier.name}`,
          variant: 'destructive',
        });
      }
    }
  };

  // Official response to an email/manual intrare: outgoing number, signed
  // PDF and delivery by email to the sender (server-side, /api/emite-raspuns)
  const openRaspunsDialog = (document: RegistruDocument) => {
    setSelectedDocument(document);
    setRaspunsText(
      buildRaspunsBody(
        {
          numeComplet: document.emitent,
          adresa: document.adresaEmitent,
          numarCerere: document.numarInregistrare,
          dataCerere: formatDate(document.dataInregistrare),
        },
        DEFAULT_RASPUNS_CORPURI.general
      )
    );
    setShowRaspunsDialog(true);
  };

  // Sends the drafted response into the avizare circuit
  // (responsabil -> secretar -> primar) instead of issuing it directly
  const handleTrimiteLaAvizare = async () => {
    if (!selectedDocument || !raspunsText.trim()) return;
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
          tipDocument: 'raspuns',
          registruDocId: selectedDocument.id,
          continut: raspunsText.trim(),
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
      setShowRaspunsDialog(false);
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

  const handleEmiteRaspuns = async () => {
    if (!selectedDocument || !raspunsText.trim()) return;
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
          registruDocId: selectedDocument.id,
          continut: raspunsText.trim(),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Emiterea răspunsului a eșuat');
      }

      toast({
        title: 'Răspuns emis',
        description: result.emailSent
          ? `Nr. ieșire ${result.numarIesire} — trimis pe email către ${selectedDocument.emailEmitent}.`
          : `Nr. ieșire ${result.numarIesire}. Emitentul nu are email — descarcă PDF-ul și transmite-l manual.`,
      });
      if (!result.emailSent && result.downloadURL) {
        window.open(result.downloadURL, '_blank');
      }
      setShowRaspunsDialog(false);
      setRaspunsText('');
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

  const getStatusCount = (status: StatusRegistru) => {
    return documents.filter(d => d.status === status).length;
  };

  // Full-year export for the official archive: fetches ALL entries of the
  // year in batches (the table itself stays paginated), oldest first, the
  // order a printed registry uses
  const handleExportAn = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      const year = parseInt(exportYear, 10);
      const start = Timestamp.fromDate(new Date(year, 0, 1));
      const end = Timestamp.fromDate(new Date(year + 1, 0, 1));

      const yearDocs: RegistruDocument[] = [];
      let cursor: any = null;
      for (;;) {
        const q = cursor
          ? query(
              collection(db, COLLECTIONS.REGISTRU_GENERAL),
              where('dataInregistrare', '>=', start),
              where('dataInregistrare', '<', end),
              orderBy('dataInregistrare', 'asc'),
              startAfter(cursor),
              limit(500)
            )
          : query(
              collection(db, COLLECTIONS.REGISTRU_GENERAL),
              where('dataInregistrare', '>=', start),
              where('dataInregistrare', '<', end),
              orderBy('dataInregistrare', 'asc'),
              limit(500)
            );
        const snap = await getDocs(q);
        yearDocs.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as RegistruDocument)));
        if (snap.docs.length < 500) break;
        cursor = snap.docs[snap.docs.length - 1];
      }

      if (yearDocs.length === 0) {
        toast({
          title: 'Registru gol',
          description: `Nu există înregistrări în anul ${year}`,
          variant: 'destructive',
        });
        return;
      }

      const filename = `registru_general_${year}`;
      if (format === 'csv') {
        exportToCSV(yearDocs, filename);
      } else {
        exportToExcel(yearDocs, filename);
      }
      toast({
        title: 'Export finalizat',
        description: `${yearDocs.length} înregistrări din ${year} exportate pentru arhivare.`,
      });
      setShowExportAnDialog(false);
    } catch (error) {
      console.error('Error exporting year:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut exporta registrul',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Left Sidebar */}
      <div className="w-48 bg-slate-800 border-r border-slate-700 p-3 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          📋 Registratură
        </h2>
        <nav className="space-y-1">
          <div
            onClick={() => setActiveFilter('toate')}
            className={`px-3 py-2 rounded cursor-pointer font-medium text-sm transition-colors ${
              activeFilter === 'toate'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Toate
              <Badge className="ml-auto bg-slate-600 text-white text-xs px-2 py-0.5">
                {documents.length}
              </Badge>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('nou')}
            className={`px-3 py-2 rounded cursor-pointer font-medium text-sm transition-colors ${
              activeFilter === 'nou'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3" />
              Noi
              <Badge className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5">
                {getStatusCount('nou')}
              </Badge>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('in_lucru')}
            className={`px-3 py-2 rounded cursor-pointer font-medium text-sm transition-colors ${
              activeFilter === 'in_lucru'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              În Lucru
              <Badge className="ml-auto bg-amber-600 text-white text-xs px-2 py-0.5">
                {getStatusCount('in_lucru')}
              </Badge>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('finalizat')}
            className={`px-3 py-2 rounded cursor-pointer font-medium text-sm transition-colors ${
              activeFilter === 'finalizat'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              Finalizate
              <Badge className="ml-auto bg-emerald-600 text-white text-xs px-2 py-0.5">
                {getStatusCount('finalizat')}
              </Badge>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">📄 Înregistrări</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/admin/registru/intrare-noua')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Intrare Nouă
              </Button>
              <Button
                onClick={() => setShowBulkDeleteDialog(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Iesire Nouă
              </Button>
              <Button
                onClick={() => setShowExportAnDialog(true)}
                className="bg-blue-700 hover:bg-blue-600 text-white font-medium inline-flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Export an
              </Button>
              <LiveIndicator fromCache={fromCache} />
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Editează coloane tabel
          </p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter Row - REGIT Style with Input Fields */}
              <div className="bg-slate-800 border border-slate-700 rounded overflow-x-auto">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-700/50 border-b border-slate-700">
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-20">Nr. Înregistrare</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-24">Data Înregistrării</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-20">Număr extern</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-20">Data externă</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs flex-1 min-w-32">Emitent</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs flex-1 min-w-32">Destinatar</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs flex-1 min-w-40">Conținut</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-24">Departament</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-20">Stare</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-28">Data intern de rezolvare</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-28">Data limită răspuns</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-24">Creatã de</TableHead>
                        <TableHead className="text-gray-300 font-semibold px-2 py-2 text-xs w-28">Acțiuni</TableHead>
                      </TableRow>
                      <TableRow className="bg-slate-800 border-b border-slate-700">
                        <TableHead className="px-2 py-2 text-xs w-20">
                          <Input
                            placeholder="Interv..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs"
                          />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-24">
                          <Input placeholder="Int..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-20">
                          <Input placeholder="Nu..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-20">
                          <Input placeholder="I..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs flex-1 min-w-32">
                          <Input placeholder="Emitent" className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs flex-1 min-w-32">
                          <Input placeholder="Desti..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs flex-1 min-w-40">
                          <Input placeholder="Conținut" className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-24">
                          <Select>
                            <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-white text-xs">
                              <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="all">Tot/Toate</SelectItem>
                              {DEPARTMENTS_LIST.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-20">
                          <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)}>
                            <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="toate">Tot/Toate</SelectItem>
                              <SelectItem value="nou">Nou</SelectItem>
                              <SelectItem value="in_lucru">Lucru</SelectItem>
                              <SelectItem value="finalizat">Finalizat</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-28">
                          <Input placeholder="I..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-28">
                          <Input placeholder="I..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-24">
                          <Input placeholder="Cre..." className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 text-xs" />
                        </TableHead>
                        <TableHead className="px-2 py-2 text-xs w-28 flex gap-1 justify-center">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-slate-700 border-slate-600" onClick={() => exportToCSV(filteredDocuments)}>📥</Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-slate-700 border-slate-600" onClick={() => exportToExcel(filteredDocuments)}>🔄</Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => {
                        const statusConfig = STATUS_CONFIG[doc.status];
                        // Legal deadline exceeded and still unresolved
                        const isOverdue =
                          doc.status !== 'finalizat' &&
                          !!doc.termen &&
                          doc.termen.toMillis() < Date.now();
                        const SursaIcon =
                          doc.sursa === 'email' ? Mail :
                          doc.sursa === 'cerere_online' ? Globe :
                          doc.sursa === 'adeverinta' ? ScrollText :
                          doc.sursa === 'raspuns' ? Send : null;

                        return (
                          <TableRow
                            key={doc.id}
                            className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${
                              isOverdue ? 'bg-red-900/15 border-l-2 border-l-red-500' : ''
                            }`}
                          >
                            <TableCell className="font-mono font-bold whitespace-nowrap px-2 py-2 text-sm w-20">
                              <Badge className={`${statusConfig.color} text-white text-xs px-2 py-1`}>
                                {doc.numarInregistrare.split('-').pop()}
                              </Badge>
                              {isOverdue && (
                                <Badge className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0.5" title="Termen legal depășit">
                                  ⏰
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm text-center w-24">
                              {formatDate(doc.dataInregistrare)}
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm w-20">
                              {doc.numarExtern?.substring(0, 10) || '-'}
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm w-20">
                              {doc.dataExterna?.substring(0, 10) || '-'}
                            </TableCell>
                            <TableCell className="text-gray-300 truncate px-2 py-2 text-sm flex-1 min-w-32">
                              <span className="inline-flex items-center gap-1.5">
                                {SursaIcon && <SursaIcon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />}
                                {doc.emitent}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300 truncate px-2 py-2 text-sm flex-1 min-w-32">
                              {doc.destinatar}
                            </TableCell>
                            <TableCell className="text-gray-300 truncate px-2 py-2 text-sm flex-1 min-w-40">
                              {doc.continut.substring(0, 25)}...
                            </TableCell>
                            <TableCell className="text-gray-300 truncate px-2 py-2 text-sm w-24">
                              {doc.departament || '-'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 py-2 w-20">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded text-white ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm w-28">
                              {doc.dataExterna || '-'}
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm w-28">
                              {formatDate(doc.createdAt)}
                            </TableCell>
                            <TableCell className="text-gray-300 whitespace-nowrap px-2 py-2 text-sm w-24">
                              {doc.creatDeNume || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-2 py-2 flex gap-1 w-28 justify-center">
                              {doc.fisiere && doc.fisiere.length > 0 && (
                                <Button
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-blue-800 hover:bg-blue-700"
                                  title={`${doc.fisiere.length} document(e) scanat(e) — deschide`}
                                  onClick={() => handleOpenFisiere(doc)}
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-slate-700 hover:bg-slate-600"
                                title="Printează fișa de înregistrare"
                                onClick={() => handlePrint(doc)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-slate-700 hover:bg-slate-600"
                                title="Vezi / actualizează status"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setNewStatus(doc.status);
                                  setObservatii(doc.observatii || '');
                                  setShowStatusDialog(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {(doc.directie || 'intrare') === 'intrare' && !doc.raspunsNumar && !doc.cerereId && (
                                <Button
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-sky-800 hover:bg-sky-700"
                                  title="Trimite răspuns oficial"
                                  onClick={() => openRaspunsDialog(doc)}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {doc.status === 'finalizat' && (
                                <Button
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-red-700 hover:bg-red-600"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => loadMoreOlder()}
                    disabled={loadingMore}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Încarcă mai multe documente
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    Nu există documente în categoria selectată
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export an complet Dialog */}
      <Dialog open={showExportAnDialog} onOpenChange={setShowExportAnDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Export registru pentru arhivare
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-400">
            Exportă toate înregistrările unui an, în ordinea numerelor, pentru arhivarea anuală a
            registrului general de intrări-ieșiri.
          </p>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Anul</label>
            <Select value={exportYear} onValueChange={setExportYear}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportAnDialog(false)}
              className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
            >
              Anulează
            </Button>
            <Button
              onClick={() => handleExportAn('csv')}
              disabled={exporting}
              className="bg-slate-600 hover:bg-slate-500"
            >
              {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              CSV
            </Button>
            <Button
              onClick={() => handleExportAn('excel')}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emite raspuns oficial Dialog */}
      <Dialog open={showRaspunsDialog} onOpenChange={setShowRaspunsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              Trimite răspuns oficial
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-400">
            Răspuns la documentul{' '}
            <span className="font-mono text-green-400">{selectedDocument?.numarInregistrare}</span> de la{' '}
            <span className="text-white">{selectedDocument?.emitent}</span>. Primește număr de ieșire,
            semnătura primarului și QR de verificare.{' '}
            {selectedDocument?.emailEmitent ? (
              <>PDF-ul va fi trimis pe email la{' '}
                <span className="text-sky-300">{selectedDocument.emailEmitent}</span>.</>
            ) : (
              <span className="text-amber-400">
                Emitentul nu are email înregistrat — PDF-ul se va deschide pentru descărcare și transmitere manuală.
              </span>
            )}
          </p>

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
              onClick={handleTrimiteLaAvizare}
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

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizare Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Status nou</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as StatusRegistru)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {(['nou', 'in_lucru', 'finalizat'] as StatusRegistru[]).map((status) => {
                    const config = STATUS_CONFIG[status];
                    return (
                      <SelectItem key={status} value={status} className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Observații</label>
              <Textarea
                value={observatii}
                onChange={(e) => setObservatii(e.target.value)}
                placeholder="Adaugă observații..."
                className="bg-slate-900 border-slate-600 text-white"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
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
            <AlertDialogTitle className="text-white">Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Sigur vrei să ștergi definitiv documentul {selectedDocument?.numarInregistrare}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete / Export Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Iesire Nouă</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Selectați acțiunea dorită pentru documentele finalizate:
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => {
                  const finalized = documents.filter(d => d.status === 'finalizat');
                  if (finalized.length === 0) {
                    toast({
                      title: 'Nu sunt documente',
                      description: 'Nu există documente finalizate de șters',
                      variant: 'destructive',
                    });
                    return;
                  }
                  exportToCSV(finalized);
                  toast({
                    title: 'Export finalizat',
                    description: 'Documentele finalizate au fost exportate ca CSV',
                  });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Exportă Finalizate (CSV)
              </Button>

              <Button
                onClick={() => {
                  const finalized = documents.filter(d => d.status === 'finalizat');
                  if (finalized.length === 0) {
                    toast({
                      title: 'Nu sunt documente',
                      description: 'Nu există documente finalizate de șters',
                      variant: 'destructive',
                    });
                    return;
                  }
                  exportToExcel(finalized);
                  toast({
                    title: 'Export finalizat',
                    description: 'Documentele finalizate au fost exportate ca Excel',
                  });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Exportă Finalizate (Excel)
              </Button>

              <Button
                onClick={async () => {
                  const finalized = documents.filter(d => d.status === 'finalizat');
                  if (finalized.length === 0) {
                    toast({
                      title: 'Nu sunt documente',
                      description: 'Nu există documente finalizate de șters',
                      variant: 'destructive',
                    });
                    return;
                  }

                  try {
                    for (const docItem of finalized) {
                      await deleteDoc(doc(db, COLLECTIONS.REGISTRU_GENERAL, docItem.id));
                    }
                    toast({
                      title: 'Șters',
                      description: `${finalized.length} documente finalizate au fost șterse.`,
                    });
                    setShowBulkDeleteDialog(false);
                  } catch (error) {
                    console.error('Error deleting documents:', error);
                    toast({
                      title: 'Eroare',
                      description: 'Nu s-au putut șterge documentele',
                      variant: 'destructive',
                    });
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Șterge Finalizate
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
