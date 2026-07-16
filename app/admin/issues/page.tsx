// app/admin/issues/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';

// Page size for the paginated issues list (same convention as Cereri)
const PAGE_SIZE = 100;
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  AlertTriangle,
  MapPin,
  Image as ImageIcon,
  Eye,
  MessageSquare,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useCollectionSnapshot } from '@/lib/hooks/useCollectionSnapshot';
import { LiveIndicator } from '@/components/admin/LiveIndicator';

interface ReportedIssue {
  id: string;
  reporterName: string;
  reporterContact: string;
  title: string;
  description: string;
  location: string;
  type: string;
  priority: string;
  status: string;
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
  reportId: string;
  assignedTo?: string;
  resolvedAt?: any;
  resolution?: string;
  internalNotes?: Array<{
    text: string;
    addedAt: any;
    addedBy: string;
  }>;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export default function AdminIssuesPage() {
  const [filteredIssues, setFilteredIssues] = useState<ReportedIssue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [olderIssues, setOlderIssues] = useState<ReportedIssue[]>([]);
  const [moreOlder, setMoreOlder] = useState(true);
  // Counts come from server-side aggregations so they stay exact even
  // though the list itself is paginated
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
  });

  // --- Realtime live window: newest PAGE_SIZE issues via one listener.
  // Older pages are appended one-shot below.
  const mapIssue = (id: string, data: Record<string, any>) =>
    ({ id, ...data }) as ReportedIssue;

  const liveQuery = useMemo(
    () => query(collection(db, 'reported_issues'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)),
    []
  );
  const { data: liveIssues, loading, fromCache } = useCollectionSnapshot<ReportedIssue>(
    liveQuery,
    mapIssue,
    [],
    'issues'
  );

  const issues = useMemo(() => {
    const seen = new Set<string>();
    const out: ReportedIssue[] = [];
    for (const it of [...liveIssues, ...olderIssues]) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        out.push(it);
      }
    }
    return out;
  }, [liveIssues, olderIssues]);

  const hasMore = liveIssues.length === PAGE_SIZE && moreOlder;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    filterIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, searchTerm, statusFilter, typeFilter]);

  // Aggregate counts: cheap, exact, no documents downloaded
  const loadStats = async () => {
    try {
      const issuesCollection = collection(db, 'reported_issues');
      const countByStatus = async (status: string) =>
        (await getCountFromServer(query(issuesCollection, where('status', '==', status)))).data().count;
      const [total, nou, inLucru, rezolvate, respinse] = await Promise.all([
        getCountFromServer(issuesCollection).then((s) => s.data().count),
        countByStatus('noua'),
        countByStatus('in_lucru'),
        countByStatus('rezolvata'),
        countByStatus('respinsa'),
      ]);
      setStats({ total, new: nou, inProgress: inLucru, resolved: rezolvate, rejected: respinse });
    } catch (error) {
      console.error('Error loading issue stats:', error);
    }
  };

  // Append the next older page (one-shot). Cursor is the createdAt of the
  // last loaded issue.
  const loadMoreOlder = async (): Promise<boolean> => {
    const last = issues[issues.length - 1];
    if (!last?.createdAt) return false;
    setLoadingMore(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'reported_issues'),
          orderBy('createdAt', 'desc'),
          startAfter(last.createdAt),
          limit(PAGE_SIZE)
        )
      );
      setOlderIssues((prev) => [...prev, ...snapshot.docs.map((d) => mapIssue(d.id, d.data()))]);
      const more = snapshot.docs.length === PAGE_SIZE;
      setMoreOlder(more);
      return more;
    } catch (error) {
      console.error('Error loading older issues:', error);
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  // Honest search: pull all remaining pages so the client-side filter
  // sees the full dataset instead of silently truncating matches.
  const loadAllRemaining = async () => {
    setLoadingAll(true);
    try {
      let more = hasMore;
      let guard = 0;
      while (more && guard < 50) {
        more = await loadMoreOlder();
        guard++;
      }
    } finally {
      setLoadingAll(false);
    }
  };

  const filterIssues = () => {
    let filtered = [...issues];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.reportId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(issue => issue.type === typeFilter);
    }

    setFilteredIssues(filtered);
  };

  // Status change goes through /api/schimba-status: update + citizen
  // notification happen server-side in one persistent event, so delivery
  // no longer depends on this browser tab staying open.
  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/schimba-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          collection: 'reported_issues',
          docId: issueId,
          newStatus,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Actualizarea a eșuat');
      }

      // The list updates itself via the realtime listener; only the
      // aggregate counts and the open dialog need a manual nudge.
      loadStats();
      if (selectedIssue?.id === issueId) {
        const updateData: Partial<ReportedIssue> = { status: newStatus, updatedAt: new Date() };
        if (newStatus === 'rezolvata') updateData.resolvedAt = new Date();
        setSelectedIssue({ ...selectedIssue, ...updateData });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const addInternalNote = async () => {
    if (!selectedIssue || !newNote.trim()) return;

    try {
      const issueRef = doc(db, 'reported_issues', selectedIssue.id);
      const newNoteObj = {
        text: newNote,
        addedAt: new Date(),
        addedBy: 'Admin' // Înlocuiește cu user-ul actual
      };

      const updatedNotes = [...(selectedIssue.internalNotes || []), newNoteObj];

      await updateDoc(issueRef, {
        internalNotes: updatedNotes,
        updatedAt: new Date()
      });

      setSelectedIssue({
        ...selectedIssue,
        internalNotes: updatedNotes
      });

      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Compact, outline-tinted badges to match the Cereri page
  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    noua: { label: 'Nouă', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    in_lucru: { label: 'În lucru', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    rezolvata: { label: 'Rezolvată', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    respinsa: { label: 'Respinsă', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    };
    return (
      <Badge
        variant="outline"
        className={`${config.className} inline-flex items-center px-2 py-0.5 text-xs font-medium whitespace-nowrap`}
      >
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Scăzută', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
      medium: { label: 'Medie', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
      high: { label: 'Ridicată', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
      urgent: { label: 'Urgentă', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    };
    // Only surface non-default priorities as a badge to reduce clutter
    if (!priority || priority === 'medium') return null;
    const config = priorityConfig[priority] || {
      label: priority,
      className: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    };
    return (
      <Badge
        variant="outline"
        className={`${config.className} inline-flex items-center px-2 py-0.5 text-xs font-medium whitespace-nowrap`}
      >
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'infrastructura': '🏗️',
      'iluminat': '💡',
      'gunoi': '🗑️',
      'vandalism': '⚠️',
      'general': '📌',
      'altele': '📋'
    };
    return icons[type] || '📌';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Se încarcă problemele raportate...</div>
      </div>
    );
  }

  const STATUS_FILTERS: { value: string; label: string; count: number }[] = [
    { value: 'all', label: 'Toate', count: stats.total },
    { value: 'noua', label: 'Noi', count: stats.new },
    { value: 'in_lucru', label: 'În lucru', count: stats.inProgress },
    { value: 'rezolvata', label: 'Rezolvate', count: stats.resolved },
    { value: 'respinsa', label: 'Respinse', count: stats.rejected },
  ];

  return (
    <div className="space-y-4 p-6 bg-slate-900 min-h-screen">
      {/* Header + toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="bg-red-500/15 rounded-lg p-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            Probleme Raportate
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-semibold text-gray-200">{stats.total}</span> probleme ·{' '}
            <span className="font-semibold text-blue-300">{stats.new}</span> noi ·{' '}
            <span className="font-semibold text-amber-300">{stats.inProgress}</span> în lucru
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Caută nume, locație, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-64 bg-slate-800 border-slate-600 text-white text-sm placeholder:text-gray-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[150px] bg-slate-800 border-slate-600 text-gray-300 text-sm">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">Toate tipurile</SelectItem>
              <SelectItem value="infrastructura">Infrastructură</SelectItem>
              <SelectItem value="iluminat">Iluminat</SelectItem>
              <SelectItem value="gunoi">Gunoi</SelectItem>
              <SelectItem value="vandalism">Vandalism</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="altele">Altele</SelectItem>
            </SelectContent>
          </Select>
          <LiveIndicator fromCache={fromCache} />
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter(filter.value)}
            className={`h-8 shrink-0 text-xs font-medium ${
              statusFilter === filter.value
                ? 'bg-slate-600 text-white border-slate-500 hover:bg-slate-600 hover:text-white'
                : 'bg-slate-800/60 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {filter.label}
            {filter.count > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0 text-[11px] font-semibold ${
                  statusFilter === filter.value ? 'bg-white/20' : 'bg-slate-500/40'
                }`}
              >
                {filter.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Honest-search banner: filtering only what's loaded would hide matches */}
      {hasMore &&
        (searchTerm.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all') && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <p className="text-sm text-amber-200">
              Cauți doar în problemele încărcate ({issues.length}). Pot exista potriviri neîncărcate.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadAllRemaining}
              disabled={loadingAll}
              className="shrink-0 border-amber-500/40 text-amber-200 hover:bg-amber-500/15 h-8"
            >
              {loadingAll && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Caută în toate
            </Button>
          </div>
        )}

      {/* Issues list */}
      {filteredIssues.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nu există probleme care să corespundă filtrelor selectate.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/60 border-slate-700/60 overflow-hidden">
          <div className="divide-y divide-slate-700/60">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 shrink-0">
                        #{issue.reportId}
                      </span>
                      <span className="text-base leading-none">{getTypeIcon(issue.type)}</span>
                      <span className="text-sm font-semibold text-white truncate">
                        {issue.title || `Problemă ${issue.reportId}`}
                      </span>
                      {getStatusBadge(issue.status)}
                      {getPriorityBadge(issue.priority)}
                      {issue.imageUrl && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-300/90">
                          <ImageIcon className="h-3 w-3" />
                          1
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 min-w-0">
                      <span className="text-gray-400 font-medium shrink-0">{issue.reporterName}</span>
                      {issue.location && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {issue.location}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="shrink-0">
                        {new Date(
                          issue.createdAt?.seconds ? issue.createdAt.seconds * 1000 : issue.createdAt
                        ).toLocaleDateString('ro-RO')}
                      </span>
                      {issue.description && (
                        <>
                          <span className="hidden md:inline">·</span>
                          <span className="hidden md:inline truncate italic">{issue.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setShowDetailsDialog(true);
                      }}
                      className="h-8 w-8 p-0 text-gray-400 hover:bg-blue-600/20 hover:text-blue-300"
                      title="Vezi detalii"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Select
                      value={issue.status}
                      onValueChange={(value) => updateIssueStatus(issue.id, value)}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="h-8 w-[128px] bg-slate-700 border-slate-600 text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        <SelectItem value="noua">Nouă</SelectItem>
                        <SelectItem value="in_lucru">În lucru</SelectItem>
                        <SelectItem value="rezolvata">Rezolvată</SelectItem>
                        <SelectItem value="respinsa">Respinsă</SelectItem>
                      </SelectContent>
                    </Select>
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
            {loadingMore && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Încarcă mai multe probleme
          </Button>
        </div>
      )}

      {/* Dialog detalii */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-white">
                  Detalii Problemă #{selectedIssue.reportId}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Raportată la {new Date(selectedIssue.createdAt.seconds ? selectedIssue.createdAt.seconds * 1000 : selectedIssue.createdAt).toLocaleString('ro-RO')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Status și prioritate */}
                <div className="flex gap-2">
                  {getStatusBadge(selectedIssue.status)}
                  {getPriorityBadge(selectedIssue.priority)}
                  <Badge className="bg-slate-600 text-white">
                    {getTypeIcon(selectedIssue.type)} {selectedIssue.type}
                  </Badge>
                </div>

                {/* Informații reporter */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Informații Reporter</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Nume:</span> {selectedIssue.reporterName}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Contact:</span> {selectedIssue.reporterContact}
                    </p>
                  </div>
                </div>

                {/* Locație */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Locație</h4>
                  <p className="text-gray-300">{selectedIssue.location}</p>
                  {selectedIssue.coordinates && (
                    <p className="text-sm text-gray-400 mt-1">
                      Coordonate: {selectedIssue.coordinates.lat}, {selectedIssue.coordinates.lng}
                    </p>
                  )}
                </div>

                {/* Descriere */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Descriere Problemă</h4>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedIssue.description}</p>
                </div>

                {/* Imagine */}
                {selectedIssue.imageUrl && (
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Imagine Atașată</h4>
                    <img 
                      src={selectedIssue.imageUrl} 
                      alt="Problemă raportată" 
                      className="rounded-lg max-w-full h-auto"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 bg-slate-600 hover:bg-slate-500 text-white border-slate-500"
                      onClick={() => window.open(selectedIssue.imageUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Deschide în tab nou
                    </Button>
                  </div>
                )}

                {/* Note interne */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Note Interne</h4>
                  
                  {selectedIssue.internalNotes && selectedIssue.internalNotes.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {selectedIssue.internalNotes.map((note, index) => (
                        <div key={index} className="bg-slate-600 rounded p-3">
                          <p className="text-gray-300 text-sm">{note.text}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {note.addedBy} - {new Date(note.addedAt.seconds ? note.addedAt.seconds * 1000 : note.addedAt).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mb-4">Nu există note adăugate.</p>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Adaugă o notă internă..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white placeholder:text-gray-400"
                      rows={2}
                    />
                    <Button
                      onClick={addInternalNote}
                      disabled={!newNote.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Istoric */}
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Istoric</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Creat la:</span>{' '}
                      {new Date(selectedIssue.createdAt.seconds ? selectedIssue.createdAt.seconds * 1000 : selectedIssue.createdAt).toLocaleString('ro-RO')}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Ultima actualizare:</span>{' '}
                      {new Date(selectedIssue.updatedAt.seconds ? selectedIssue.updatedAt.seconds * 1000 : selectedIssue.updatedAt).toLocaleString('ro-RO')}
                    </p>
                    {selectedIssue.resolvedAt && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Rezolvat la:</span>{' '}
                        {new Date(selectedIssue.resolvedAt.seconds ? selectedIssue.resolvedAt.seconds * 1000 : selectedIssue.resolvedAt).toLocaleString('ro-RO')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                >
                  Închide
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}