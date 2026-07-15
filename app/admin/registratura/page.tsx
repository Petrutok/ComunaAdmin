"use client";

// Registratura electronica - the staff-facing document registry.
// Composition of: dashboard (clickable stats = smart filters), filter bar
// with saved filters, sortable/selectable table with pagination, and the
// document sheet (fisa) with workflow + audit timeline.
// Data + mutations live in useRegistratura (optimistic updates, no full
// reloads); this file only wires components together.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Mail, RefreshCw, Loader2, Download, Star, ChevronDown, Archive, X, ShieldAlert, FilePlus,
} from 'lucide-react';
import { QuarantinePanel } from '@/components/registratura/QuarantinePanel';
import { syncEmailsAction } from '@/app/actions/sync-emails';
import { useRegistratura } from '@/lib/hooks/useRegistratura';
import { LiveIndicator } from '@/components/admin/LiveIndicator';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  RegistraturaEmail, EmailStatus, EMAIL_STATUS_CONFIG, OPEN_STATUSES,
} from '@/types/registratura';
import { exportEmailsCsv } from '@/lib/registratura/export';
import { RegistraturaDashboard, DashboardFilter } from '@/components/registratura/RegistraturaDashboard';
import {
  RegistraturaFilters, RegistraturaFilterState, EMPTY_FILTERS,
} from '@/components/registratura/RegistraturaFilters';
import { RegistraturaTable, SortState } from '@/components/registratura/RegistraturaTable';
import { EmailDetailSheet } from '@/components/registratura/EmailDetailSheet';

export default function RegistraturaPage() {
  const { toast } = useToast();
  const { user: adminUser } = useAdminAuth();
  const {
    emails, departments, users, loading, fromCache, stats,
    reload, updateStatus, assign, setTags, addComment, remove, bulkUpdateStatus,
  } = useRegistratura();

  const [filters, setFilters] = useState<RegistraturaFilterState>(EMPTY_FILTERS);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>(null);
  const [sort, setSort] = useState<SortState>({ key: 'data', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [selectedEmail, setSelectedEmail] = useState<RegistraturaEmail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegistraturaEmail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [quarantineOpen, setQuarantineOpen] = useState(false);

  // Per-user favorites, persisted locally
  const favKey = `registratura_favorites_${adminUser?.uid || 'anon'}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(favKey) || '[]'));
    } catch {
      return new Set();
    }
  });
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(favKey, JSON.stringify([...next]));
      return next;
    });
  };

  const allTags = useMemo(
    () => Array.from(new Set(emails.flatMap((e) => e.etichete || []))).sort(),
    [emails]
  );

  // ---- Filtering + sorting (memoized; instant at commune volume) --------
  const visibleEmails = useMemo(() => {
    let list = emails;

    // Archived documents stay out of sight unless explicitly requested
    if (filters.status !== 'arhivat' && dashboardFilter !== 'solutionate') {
      list = list.filter((e) => e.status !== 'arhivat');
    }

    if (dashboardFilter === 'noi') list = list.filter((e) => e.status === 'nou');
    if (dashboardFilter === 'in_lucru')
      list = list.filter((e) => OPEN_STATUSES.includes(e.status) && e.status !== 'nou');
    if (dashboardFilter === 'solutionate')
      list = list.filter((e) => e.status === 'rezolvat' || e.status === 'respins');
    if (dashboardFilter === 'depasite') {
      const now = Date.now();
      list = list.filter(
        (e) => OPEN_STATUSES.includes(e.status) && e.deadline?.toMillis && e.deadline.toMillis() < now
      );
    }

    if (filters.status !== 'toate') list = list.filter((e) => e.status === filters.status);
    if (filters.priority !== 'toate') list = list.filter((e) => (e.priority || 'normal') === filters.priority);
    if (filters.assignee === 'nerepartizat') list = list.filter((e) => !e.assignedToUserId);
    else if (filters.assignee !== 'toate') list = list.filter((e) => e.assignedToUserId === filters.assignee);
    if (filters.tag !== 'toate') list = list.filter((e) => e.etichete?.includes(filters.tag));
    if (showFavoritesOnly) list = list.filter((e) => favorites.has(e.id));

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      // One haystack per document: number, sender, subject, body (covers
      // CNP/CUI/phone/address mentioned in the text), assignee, tags, notes
      list = list.filter((e) =>
        [
          e.numarInregistrare, e.from, e.subject, e.body,
          e.assignedToUserName, e.departmentName, e.observatii,
          (e.etichete || []).join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (e: RegistraturaEmail): string | number => {
      switch (sort.key) {
        case 'numar': return e.numarInregistrare;
        case 'data': return e.dateReceived?.toMillis?.() || 0;
        case 'expeditor': return e.from.toLowerCase();
        case 'subiect': return (e.subject || '').toLowerCase();
        case 'responsabil': return (e.assignedToUserName || '').toLowerCase();
        case 'termen': return e.deadline?.toMillis?.() || Number.MAX_SAFE_INTEGER;
        case 'status': return EMAIL_STATUS_CONFIG[e.status]?.order ?? 99;
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [emails, filters, dashboardFilter, sort, showFavoritesOnly, favorites]);

  const selectedEmails = useMemo(
    () => emails.filter((e) => selectedIds.has(e.id)),
    [emails, selectedIds]
  );

  // ---- Actions -----------------------------------------------------------
  const handleSync = async () => {
    setRefreshing(true);
    try {
      const result = await syncEmailsAction();
      if (!result?.success) throw new Error(result?.message || 'Sincronizarea a eșuat');
      toast({
        title: 'Sincronizat',
        description: `${result.processed} emailuri noi${result.spamFiltered ? ` (${result.spamFiltered} spam filtrat)` : ''}`,
      });
      await reload();
    } catch (error) {
      toast({
        title: 'Eroare la sincronizare',
        description: error instanceof Error ? error.message : 'Încercați din nou',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleProcess = async (email: RegistraturaEmail) => {
    if (!email.attachments?.length) {
      toast({ title: 'Fără atașamente', description: 'Nu există documente de procesat.' });
      return;
    }
    setProcessing(true);
    try {
      const senderName = email.from.replace(/<.*>/, '').trim() || 'Expeditor';
      const senderEmail = email.from.match(/<(.+)>/)?.[1] || email.from;
      const { processDocumentsAction } = await import('@/app/actions/process-documents');
      const result = await processDocumentsAction(
        email.id,
        email.numarInregistrare,
        email.dateReceived.toDate().toISOString(),
        senderName,
        senderEmail,
        email.departmentName || undefined
      );
      if (!result.success) throw new Error(result.errors.join(', '));
      toast({ title: 'Document oficial creat', description: `${result.processedCount} atașamente procesate` });
      await reload();
    } catch (error) {
      toast({
        title: 'Eroare la procesare',
        description: error instanceof Error ? error.message : 'Încercați din nou',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatus = async (status: EmailStatus) => {
    const count = selectedEmails.length;
    await bulkUpdateStatus(selectedEmails, status);
    setSelectedIds(new Set());
    toast({
      title: `${count} documente actualizate`,
      description: `Status: ${EMAIL_STATUS_CONFIG[status].label}`,
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget);
    setDeleteTarget(null);
    setSheetOpen(false);
    toast({ title: 'Document șters' });
  };

  const openEmail = (email: RegistraturaEmail) => {
    setSelectedEmail(email);
    setSheetOpen(true);
  };

  // Keep the sheet in sync with optimistic updates
  const liveSelected = selectedEmail
    ? emails.find((e) => e.id === selectedEmail.id) || selectedEmail
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/20 p-3">
            <Mail className="h-7 w-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Registratură electronică</h1>
            <p className="text-sm text-gray-400">
              Documente primite pe emailul oficial, cu numere din registrul unificat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/registru/intrare-noua">
            <Button
              variant="outline"
              className="rounded-xl border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
            >
              <FilePlus className="mr-1.5 h-4 w-4" />
              Înregistrează document fizic
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setQuarantineOpen(true)}
            className="rounded-xl border-slate-700 bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white"
          >
            <ShieldAlert className="mr-1.5 h-4 w-4 text-amber-400" />
            Carantină
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFavoritesOnly((v) => !v)}
            aria-pressed={showFavoritesOnly}
            className={`rounded-xl border-slate-700 ${
              showFavoritesOnly ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' : 'bg-slate-800/80 text-gray-300'
            } hover:bg-slate-700 hover:text-white`}
          >
            <Star className="mr-1.5 h-4 w-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            Favorite
          </Button>
          <Button
            variant="outline"
            onClick={() => exportEmailsCsv(visibleEmails)}
            className="rounded-xl border-slate-700 bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white"
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={handleSync}
            disabled={refreshing}
            className="rounded-xl bg-purple-600 hover:bg-purple-700"
            title="Preia emailurile noi de pe serverul de mail (IMAP)"
          >
            {refreshing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Sincronizează
          </Button>
          <LiveIndicator fromCache={fromCache} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <RegistraturaDashboard
            stats={stats}
            active={dashboardFilter}
            onSelect={setDashboardFilter}
            onOpenEmail={openEmail}
          />

          <RegistraturaFilters
            filters={filters}
            onChange={setFilters}
            users={users}
            allTags={allTags}
            resultCount={visibleEmails.length}
          />

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div
              className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-950/30 px-4 py-2.5"
              role="toolbar"
              aria-label="Acțiuni în masă"
            >
              <span className="text-sm font-medium text-blue-200">
                {selectedIds.size} selectate
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-lg border-slate-600 bg-slate-800 text-gray-200 hover:bg-slate-700">
                    Schimbă statusul <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-slate-700 bg-slate-800 text-white">
                  {(Object.keys(EMAIL_STATUS_CONFIG) as EmailStatus[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleBulkStatus(s)}>
                      {EMAIL_STATUS_CONFIG[s].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatus('arhivat')}
                className="rounded-lg border-slate-600 bg-slate-800 text-gray-200 hover:bg-slate-700"
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" /> Arhivează
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportEmailsCsv(selectedEmails, 'registratura-selectie.csv')}
                className="rounded-lg border-slate-600 bg-slate-800 text-gray-200 hover:bg-slate-700"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportă selecția
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                aria-label="Deselectează tot"
                className="ml-auto text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <RegistraturaTable
            emails={visibleEmails}
            sort={sort}
            onSortChange={setSort}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onOpen={openEmail}
          />
        </>
      )}

      <QuarantinePanel
        open={quarantineOpen}
        onOpenChange={setQuarantineOpen}
        onRegistered={reload}
      />

      <EmailDetailSheet
        email={liveSelected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        departments={departments}
        users={users}
        processing={processing}
        onUpdateStatus={updateStatus}
        onAssign={assign}
        onSetTags={setTags}
        onAddComment={addComment}
        onProcess={handleProcess}
        onDelete={(email) => setDeleteTarget(email)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-slate-700 bg-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi definitiv documentul?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {deleteTarget?.numarInregistrare} — {deleteTarget?.subject || '(fără subiect)'}.
              Acțiunea nu poate fi anulată; numărul de înregistrare rămâne consumat în registru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600">
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              Șterge definitiv
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
