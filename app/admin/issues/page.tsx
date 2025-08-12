// app/admin/issues/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Image as ImageIcon,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Download,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [issues, setIssues] = useState<ReportedIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<ReportedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Statistici
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0
  });

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    filterIssues();
    updateStats();
  }, [issues, searchTerm, statusFilter, typeFilter]);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const issuesCollection = collection(db, 'reported_issues');
      const q = query(issuesCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReportedIssue[];
      
      setIssues(issuesData);
      setFilteredIssues(issuesData);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
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

  const updateStats = () => {
    setStats({
      total: issues.length,
      new: issues.filter(i => i.status === 'noua').length,
      inProgress: issues.filter(i => i.status === 'in_lucru').length,
      resolved: issues.filter(i => i.status === 'rezolvata').length
    });
  };

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const issueRef = doc(db, 'reported_issues', issueId);
      
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (newStatus === 'rezolvata') {
        updateData.resolvedAt = new Date();
      }

      await updateDoc(issueRef, updateData);

      // Update local state
      setIssues(issues.map(issue => 
        issue.id === issueId 
          ? { ...issue, ...updateData }
          : issue
      ));

      if (selectedIssue?.id === issueId) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'noua': { label: 'Nouă', className: 'bg-blue-500 text-white' },
      'in_lucru': { label: 'În lucru', className: 'bg-yellow-500 text-white' },
      'rezolvata': { label: 'Rezolvată', className: 'bg-green-500 text-white' },
      'respinsa': { label: 'Respinsă', className: 'bg-red-500 text-white' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      'low': { label: 'Scăzută', className: 'bg-gray-500 text-white' },
      'medium': { label: 'Medie', className: 'bg-blue-500 text-white' },
      'high': { label: 'Ridicată', className: 'bg-orange-500 text-white' },
      'urgent': { label: 'Urgentă', className: 'bg-red-500 text-white' }
    };

    const config = priorityConfig[priority] || { label: priority, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Probleme Raportate</h1>
          <p className="text-gray-400">Gestionează problemele raportate de cetățeni</p>
        </div>
        <Button 
          onClick={loadIssues}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Probleme</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Noi</p>
                <p className="text-2xl font-bold text-blue-400">{stats.new}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">În Lucru</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rezolvate</p>
                <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Caută după nume, locație, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="noua">Nouă</SelectItem>
                <SelectItem value="in_lucru">În lucru</SelectItem>
                <SelectItem value="rezolvata">Rezolvată</SelectItem>
                <SelectItem value="respinsa">Respinsă</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="infrastructura">Infrastructură</SelectItem>
                <SelectItem value="iluminat">Iluminat</SelectItem>
                <SelectItem value="gunoi">Gunoi</SelectItem>
                <SelectItem value="vandalism">Vandalism</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="altele">Altele</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista probleme */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Lista Problemelor</CardTitle>
          <CardDescription className="text-gray-400">
            {filteredIssues.length} probleme găsite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Nu există probleme care să corespundă filtrelor selectate
              </p>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTypeIcon(issue.type)}</span>
                        <h3 className="text-white font-medium">
                          {issue.title || `Problemă ${issue.reportId}`}
                        </h3>
                        {getStatusBadge(issue.status)}
                        {getPriorityBadge(issue.priority)}
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2">
                        {issue.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {issue.reporterName}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {issue.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(issue.createdAt.seconds ? issue.createdAt.seconds * 1000 : issue.createdAt).toLocaleDateString('ro-RO')}
                        </div>
                        {issue.imageUrl && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Imagine atașată
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Select
                        value={issue.status}
                        onValueChange={(value) => updateIssueStatus(issue.id, value)}
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className="w-[130px] bg-slate-600 border-slate-500 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="noua">Nouă</SelectItem>
                          <SelectItem value="in_lucru">În lucru</SelectItem>
                          <SelectItem value="rezolvata">Rezolvată</SelectItem>
                          <SelectItem value="respinsa">Respinsă</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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