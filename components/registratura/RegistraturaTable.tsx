"use client";

// The document list: sortable columns, row selection for bulk actions,
// client-side pagination, per-user favorites. Rows are memoized - only
// the affected row rerenders on selection/favorite changes.

import { memo, useMemo, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Star, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import { RegistraturaEmail } from '@/types/registratura';
import { StatusBadge, PriorityBadge, DeadlineBadge, TagBadge } from './RegistraturaBadges';

export type SortKey = 'numar' | 'data' | 'expeditor' | 'subiect' | 'responsabil' | 'termen' | 'status';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const PAGE_SIZE = 25;

function senderName(from: string): string {
  return from.replace(/<.*>/, '').replace(/"/g, '').trim() || from;
}

function formatDate(ts?: { toDate?: () => Date }): string {
  const d = ts?.toDate?.();
  return d
    ? d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
}

interface RowProps {
  email: RegistraturaEmail;
  selected: boolean;
  favorite: boolean;
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpen: (email: RegistraturaEmail) => void;
}

const EmailRow = memo(function EmailRow({
  email, selected, favorite, onToggleSelect, onToggleFavorite, onOpen,
}: RowProps) {
  const resolved = email.status === 'rezolvat' || email.status === 'respins' || email.status === 'arhivat';
  return (
    <TableRow
      className={`cursor-pointer border-slate-800 transition-colors hover:bg-slate-800/70 ${
        selected ? 'bg-blue-950/30' : ''
      }`}
      onClick={() => onOpen(email)}
    >
      <TableCell className="w-10 py-2.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(email.id)}
          aria-label={`Selectează ${email.numarInregistrare}`}
          className="border-slate-600"
        />
      </TableCell>
      <TableCell className="w-8 py-2.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleFavorite(email.id)}
          aria-label={favorite ? 'Scoate de la favorite' : 'Adaugă la favorite'}
          className={favorite ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}
        >
          <Star className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap py-2.5 font-mono text-xs text-gray-400">
        {email.numarInregistrare}
      </TableCell>
      <TableCell className="whitespace-nowrap py-2.5 text-sm text-gray-300">
        {formatDate(email.dateReceived)}
      </TableCell>
      <TableCell className="max-w-[180px] truncate py-2.5 text-sm text-gray-200">
        {senderName(email.from)}
      </TableCell>
      <TableCell className="max-w-[320px] py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-white">
            {email.subject || '(fără subiect)'}
          </span>
          {(email.attachments?.length || 0) > 0 && (
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-label="Are atașamente" />
          )}
        </div>
        {(email.etichete?.length || 0) > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {email.etichete!.slice(0, 3).map((t) => <TagBadge key={t} tag={t} />)}
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-[150px] truncate py-2.5 text-sm text-gray-300">
        {email.assignedToUserName || <span className="text-gray-600">—</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap py-2.5">
        <div className="flex items-center gap-1.5">
          <DeadlineBadge deadline={email.deadline} resolved={resolved} />
          <PriorityBadge priority={email.priority} />
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap py-2.5">
        <StatusBadge status={email.status} />
      </TableCell>
    </TableRow>
  );
});

interface Props {
  emails: RegistraturaEmail[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onOpen: (email: RegistraturaEmail) => void;
}

const COLUMNS: Array<{ key: SortKey | null; label: string }> = [
  { key: 'numar', label: 'Nr. înreg.' },
  { key: 'data', label: 'Data' },
  { key: 'expeditor', label: 'Expeditor' },
  { key: 'subiect', label: 'Subiect' },
  { key: 'responsabil', label: 'Responsabil' },
  { key: 'termen', label: 'Termen' },
  { key: 'status', label: 'Status' },
];

export function RegistraturaTable({
  emails, sort, onSortChange, selectedIds, onSelectionChange, favorites, onToggleFavorite, onOpen,
}: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(emails.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageEmails = useMemo(
    () => emails.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [emails, safePage]
  );

  const allOnPageSelected = pageEmails.length > 0 && pageEmails.every((e) => selectedIds.has(e.id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectPage = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) pageEmails.forEach((e) => next.delete(e.id));
    else pageEmails.forEach((e) => next.add(e.id));
    onSelectionChange(next);
  };

  const header = (col: { key: SortKey | null; label: string }) => {
    if (!col.key) return col.label;
    const active = sort.key === col.key;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        onClick={() =>
          onSortChange({
            key: col.key!,
            dir: active && sort.dir === 'desc' ? 'asc' : 'desc',
          })
        }
        className={`inline-flex items-center gap-1 hover:text-white ${active ? 'text-white' : ''}`}
        aria-label={`Sortează după ${col.label}`}
      >
        {col.label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectPage}
                  aria-label="Selectează toată pagina"
                  className="border-slate-600"
                />
              </TableHead>
              <TableHead className="w-8" aria-label="Favorite" />
              {COLUMNS.map((col) => (
                <TableHead key={col.label} className="whitespace-nowrap text-xs uppercase tracking-wide text-gray-500">
                  {header(col)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageEmails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-gray-500">
                  Niciun document nu corespunde filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              pageEmails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  selected={selectedIds.has(email.id)}
                  favorite={favorites.has(email.id)}
                  onToggleSelect={toggleSelect}
                  onToggleFavorite={onToggleFavorite}
                  onOpen={onOpen}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700 px-4 py-2.5">
          <p className="text-sm text-gray-500">
            Pagina {safePage + 1} din {pageCount} · {emails.length} documente
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="sm" disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Pagina anterioară"
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm" disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Pagina următoare"
              className="text-gray-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
