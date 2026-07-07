"use client";

// Filter bar: instant search across every field, status/priority/assignee/
// tag filters, plus named saved filters (localStorage) for the combinations
// a clerk uses daily ("Urgente la mine", "Nerepartizate" etc.).

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import { EmailStatus, EmailPriority, EMAIL_STATUS_CONFIG, PRIORITY_CONFIG } from '@/types/registratura';
import { User } from '@/types/departments';

export interface RegistraturaFilterState {
  search: string;
  status: EmailStatus | 'toate';
  priority: EmailPriority | 'toate';
  assignee: string;   // user id | 'toate' | 'nerepartizat'
  tag: string;        // tag | 'toate'
}

export const EMPTY_FILTERS: RegistraturaFilterState = {
  search: '',
  status: 'toate',
  priority: 'toate',
  assignee: 'toate',
  tag: 'toate',
};

interface SavedFilter {
  name: string;
  filters: Omit<RegistraturaFilterState, 'search'>;
}

const STORAGE_KEY = 'registratura_saved_filters';

function loadSaved(): SavedFilter[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

interface Props {
  filters: RegistraturaFilterState;
  onChange: (filters: RegistraturaFilterState) => void;
  users: User[];
  allTags: string[];
  resultCount: number;
}

export function RegistraturaFilters({ filters, onChange, users, allTags, resultCount }: Props) {
  const { toast } = useToast();
  const [saved, setSaved] = useState<SavedFilter[]>(loadSaved);

  const set = (patch: Partial<RegistraturaFilterState>) => onChange({ ...filters, ...patch });
  const isFiltered =
    filters.status !== 'toate' || filters.priority !== 'toate' ||
    filters.assignee !== 'toate' || filters.tag !== 'toate' || filters.search !== '';

  const persist = (next: SavedFilter[]) => {
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveCurrent = () => {
    const name = window.prompt('Numele filtrului salvat (ex: "Urgente la mine"):');
    if (!name?.trim()) return;
    const { search: _search, ...rest } = filters;
    persist([...saved.filter((s) => s.name !== name.trim()), { name: name.trim(), filters: rest }]);
    toast({ title: 'Filtru salvat', description: `„${name.trim()}" e disponibil în meniul de filtre.` });
  };

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      {/* Instant search */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <Input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Caută: număr, nume, email, telefon, CNP/CUI, conținut..."
          aria-label="Caută în registratură"
          className="h-10 rounded-xl border-slate-700 bg-slate-800/80 pl-10 text-white placeholder:text-gray-500"
        />
        {filters.search && (
          <button
            onClick={() => set({ search: '' })}
            aria-label="Șterge căutarea"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => set({ status: v as EmailStatus | 'toate' })}>
          <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-700 bg-slate-800/80 text-sm text-white" aria-label="Filtru status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="toate">Toate statusurile</SelectItem>
            {(Object.keys(EMAIL_STATUS_CONFIG) as EmailStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{EMAIL_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => set({ priority: v as EmailPriority | 'toate' })}>
          <SelectTrigger className="h-10 w-[130px] rounded-xl border-slate-700 bg-slate-800/80 text-sm text-white" aria-label="Filtru prioritate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="toate">Orice prioritate</SelectItem>
            {(Object.keys(PRIORITY_CONFIG) as EmailPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.assignee} onValueChange={(v) => set({ assignee: v })}>
          <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-700 bg-slate-800/80 text-sm text-white" aria-label="Filtru responsabil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800 text-white">
            <SelectItem value="toate">Orice responsabil</SelectItem>
            <SelectItem value="nerepartizat">Nerepartizate</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select value={filters.tag} onValueChange={(v) => set({ tag: v })}>
            <SelectTrigger className="h-10 w-[130px] rounded-xl border-slate-700 bg-slate-800/80 text-sm text-white" aria-label="Filtru etichetă">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800 text-white">
              <SelectItem value="toate">Orice etichetă</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>#{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Saved filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 rounded-xl border-slate-700 bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white" aria-label="Filtre salvate">
              <Bookmark className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-slate-700 bg-slate-800 text-white">
            <DropdownMenuItem onClick={saveCurrent} className="gap-2">
              <BookmarkPlus className="h-4 w-4" /> Salvează filtrele curente
            </DropdownMenuItem>
            {saved.length > 0 && <DropdownMenuSeparator className="bg-slate-700" />}
            {saved.map((s) => (
              <DropdownMenuItem
                key={s.name}
                className="justify-between gap-3"
                onClick={() => onChange({ ...s.filters, search: filters.search })}
              >
                <span>{s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    persist(saved.filter((x) => x.name !== s.name));
                  }}
                  aria-label={`Șterge filtrul ${s.name}`}
                  className="text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-10 rounded-xl text-gray-400 hover:text-white"
          >
            <X className="mr-1 h-4 w-4" /> Resetează
          </Button>
        )}

        <span className="text-sm text-gray-500" role="status">
          {resultCount} {resultCount === 1 ? 'document' : 'documente'}
        </span>
      </div>
    </div>
  );
}
