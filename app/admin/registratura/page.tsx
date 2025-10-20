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
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { RegistraturaEmail, EmailStatus } from '@/types/registratura';
import { syncEmailsAction } from '@/app/actions/sync-emails';
import { formatFileSize, getFileIcon, getFileTypeColor } from '@/lib/utils/formatFileSize';
import {
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  Download,
  Paperclip,
  User,
  FileText,
  ArrowUpDown,
  File,
  Image,
  Video,
  Music,
  Archive,
  Sheet,
  ExternalLink,
  Inbox,
  CheckCheck,
  Ban,
  Loader2,
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

const statusConfig = {
  'nou': {
    label: 'Nou',
    icon: Mail,
    color: 'bg-blue-600',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
    hoverColor: 'hover:bg-blue-500/30',
  },
  'in_lucru': {
    label: 'În lucru',
    icon: Loader2,
    color: 'bg-amber-500',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/30',
    hoverColor: 'hover:bg-amber-500/30',
  },
  'rezolvat': {
    label: 'Rezolvat',
    icon: CheckCircle,
    color: 'bg-emerald-600',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/30',
    hoverColor: 'hover:bg-emerald-500/30',
  },
  'respins': {
    label: 'Respins',
    icon: XCircle,
    color: 'bg-rose-600',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-400/30',
    hoverColor: 'hover:bg-rose-500/30',
  },
};

// Helper function to get the appropriate icon component
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    FileText,
    Sheet,
    Image,
    Video,
    Music,
    Archive,
    File,
  };
  return icons[iconName] || File;
};

export default function AdminRegistraturaPage() {
  // Force reload - modern styling update
  const [emails, setEmails] = useState<RegistraturaEmail[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<RegistraturaEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EmailStatus | 'toate'>('toate');
  const [selectedEmail, setSelectedEmail] = useState<RegistraturaEmail | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<EmailStatus>('nou');
  const [observatii, setObservatii] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadEmails();
  }, []);

  useEffect(() => {
    filterEmails();
  }, [emails, activeFilter, searchTerm, sortOrder]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.REGISTRATURA_EMAILS),
        orderBy('dateReceived', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as RegistraturaEmail[];

      setEmails(data);
    } catch (error: any) {
      console.error('Error loading emails:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca documentele",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEmails = () => {
    let filtered = [...emails];

    if (activeFilter !== 'toate') {
      filtered = filtered.filter(email => email.status === activeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(email =>
        email.from.toLowerCase().includes(search) ||
        email.subject.toLowerCase().includes(search) ||
        email.body?.toLowerCase().includes(search) ||
        email.numarInregistrare.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const dateA = a.dateReceived?.toMillis?.() || 0;
      const dateB = b.dateReceived?.toMillis?.() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredEmails(filtered);
  };

  const handleStatusChange = async () => {
    if (!selectedEmail || !newStatus) return;

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      const finalObservatii = observatii.trim() || selectedEmail.observatii || '';
      if (finalObservatii) {
        updateData.observatii = finalObservatii;
      }

      await updateDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, selectedEmail.id), updateData);

      toast({
        title: "Status actualizat",
        description: `Documentul a fost marcat ca ${statusConfig[newStatus].label}`,
      });

      setShowStatusDialog(false);
      setNewStatus('nou');
      setObservatii('');
      loadEmails();
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
    if (!selectedEmail) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, selectedEmail.id));

      toast({
        title: "Document șters",
        description: "Documentul a fost șters definitiv.",
      });

      setShowDeleteDialog(false);
      setSelectedEmail(null);
      loadEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge documentul",
        variant: "destructive",
      });
    }
  };

  const handleRefreshEmails = async () => {
    try {
      setRefreshing(true);
      const result = await syncEmailsAction();

      if (result.success) {
        toast({
          title: 'Succes',
          description: `${result.processed} email-uri noi procesate${
            result.spamFiltered > 0 ? ` (${result.spamFiltered} spam filtrat)` : ''
          }`
        });
        await loadEmails();
      } else {
        throw new Error(result.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error refreshing emails:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Nu s-au putut prelua email-urile noi';

      toast({
        title: 'Eroare',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
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
    });
  };

  const getStatusBadge = (status: EmailStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-2 px-4 py-2 text-sm font-semibold shadow-sm`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCount = (status: EmailStatus) => {
    return emails.filter(e => e.status === status).length;
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-500/30 rounded-xl p-3 border border-blue-400/20">
              <Inbox className="h-8 w-8 text-blue-300" />
            </div>
            Registratură Electronică
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            <span className="font-semibold text-white">{emails.length}</span> documente totale •
            <span className="font-semibold text-blue-300"> {getStatusCount('nou')}</span> noi •
            <span className="font-semibold text-amber-300"> {getStatusCount('in_lucru')}</span> în lucru
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefreshEmails}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Verifică Email-uri
          </Button>
          <Button
            onClick={loadEmails}
            variant="outline"
            className="border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-white font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800/80 border-slate-600/50 shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <Input
                  placeholder="Caută după expeditor, subiect, număr înregistrare..."
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
          <Badge className="ml-2 bg-slate-600 text-white font-semibold px-2 py-0.5">{emails.length}</Badge>
        </Button>
        {(Object.keys(statusConfig) as EmailStatus[]).map((status) => {
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
                  : `border-slate-500 ${config.textColor} bg-slate-800/50 hover:${config.bgColor} hover:border-${status === 'nou' ? 'blue' : status === 'in_lucru' ? 'amber' : status === 'rezolvat' ? 'emerald' : 'rose'}-400/50`
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

      {/* Email List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <Inbox className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Nu există documente {activeFilter !== 'toate' ? `cu statusul "${statusConfig[activeFilter as EmailStatus].label}"` : ''}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmails.map((email) => {
            const config = statusConfig[email.status];
            const Icon = config.icon;

            return (
              <Card key={email.id} className={`bg-slate-800/90 border-slate-600/50 hover:border-slate-500 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <code className="text-sm font-mono bg-slate-700/70 px-3 py-1.5 rounded-md text-blue-300 border border-slate-600 font-semibold">
                          {email.numarInregistrare}
                        </code>
                        {getStatusBadge(email.status)}
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-slate-700/50 px-3 py-1 rounded-md">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatShortDate(email.dateReceived)}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-3 line-clamp-1">
                        {email.subject}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-xs">{email.from}</span>
                        </div>
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                            <Paperclip className="h-4 w-4" />
                            <span className="font-medium">
                              {email.attachments.length} fișier{email.attachments.length !== 1 ? 'e' : ''}
                            </span>
                            <span className="text-gray-400">
                              ({formatFileSize(email.attachments.reduce((sum, att) => sum + att.fileSize, 0))})
                            </span>
                          </div>
                        )}
                      </div>

                      {email.body && (
                        <p className="text-gray-300 text-sm line-clamp-2 bg-slate-700/30 p-3 rounded-md border border-slate-600/30">
                          {email.body}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEmail(email);
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
                          setSelectedEmail(email);
                          setNewStatus(email.status);
                          setObservatii(email.observatii || '');
                          setShowStatusDialog(true);
                        }}
                        className="hover:bg-amber-600/20 hover:text-amber-300 text-gray-300 border border-transparent hover:border-amber-400/30"
                        title="Modifică status"
                      >
                        <AlertCircle className="h-5 w-5" />
                      </Button>
                      {(email.status === 'rezolvat' || email.status === 'respins') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-300 hover:text-rose-200 hover:bg-rose-600/20 border border-transparent hover:border-rose-400/30"
                          onClick={() => {
                            setSelectedEmail(email);
                            setShowDeleteDialog(true);
                          }}
                          title="Șterge document"
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
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-2xl flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-400" />
                  Detalii Document
                </DialogTitle>
                <DialogDescription className="text-gray-400 flex items-center gap-2">
                  <code className="bg-slate-900 px-2 py-1 rounded text-blue-400">
                    {selectedEmail.numarInregistrare}
                  </code>
                  •
                  {formatDate(selectedEmail.dateReceived)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedEmail.status)}
                </div>

                {/* Email Info */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Informații Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">De la:</span>
                      <p className="text-white font-medium">{selectedEmail.from}</p>
                    </div>
                    {selectedEmail.to && (
                      <div>
                        <span className="text-gray-400 text-sm">Către:</span>
                        <p className="text-white font-medium">{selectedEmail.to}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 text-sm">Subiect:</span>
                      <p className="text-white font-medium">{selectedEmail.subject}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Body */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Conținut Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-950 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {selectedEmail.bodyHtml ? (
                        <div
                          className="text-gray-300 prose prose-invert max-w-none prose-sm"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                        />
                      ) : (
                        <p className="text-gray-300 whitespace-pre-wrap text-sm">
                          {selectedEmail.body}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Atașamente ({selectedEmail.attachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedEmail.attachments.map((attachment, idx) => {
                          const IconComponent = getIconComponent(getFileIcon(attachment.fileType, attachment.fileName));
                          const iconColor = getFileTypeColor(attachment.fileType);

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-950 rounded-lg p-4 hover:bg-slate-900 transition-colors group"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`${iconColor}`}>
                                  <IconComponent className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">
                                    {attachment.fileName}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{formatFileSize(attachment.fileSize)}</span>
                                    <span>•</span>
                                    <span className="uppercase">
                                      {attachment.fileType.split('/')[1] || 'FILE'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <a
                                href={attachment.downloadURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4" />
                                Descarcă
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {selectedEmail.observatii && (
                  <Card className="bg-yellow-950/20 border-yellow-800/30">
                    <CardHeader>
                      <CardTitle className="text-yellow-400 text-lg">Observații</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-yellow-200">{selectedEmail.observatii}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Închide
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setNewStatus(selectedEmail.status);
                    setObservatii(selectedEmail.observatii || '');
                    setShowStatusDialog(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Modifică Status
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizare Status</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedEmail?.numarInregistrare}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Status nou</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as EmailStatus)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {(Object.keys(statusConfig) as EmailStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={status} value={status} className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
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
                placeholder="Adaugă observații despre procesarea acestui document..."
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
                setNewStatus('nou');
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
              Sigur vrei să ștergi definitiv documentul {selectedEmail?.numarInregistrare}?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEmail(null)}>
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
