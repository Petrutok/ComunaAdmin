'use client';

// Global admin search: one box that looks up a REG number, CNP, email or
// name across the general registry, online cereri and registratura emails.
//
// Firestore has no full-text search, so this uses what indexes give us
// for free: exact matches (REG/CNP/email) and prefix matches on names
// (orderBy + startAt/endAt, case variants merged). Enough for the desk
// scenario: "am depus ceva luna trecută" -> one lookup instead of three.

import { useState } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, FileText, Mail, BookOpen, ArrowRight } from 'lucide-react';

const RESULT_LIMIT = 20;

interface ResultItem {
  id: string;
  [key: string]: any;
}

function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function formatDate(ts: any): string {
  const date = ts?.toDate?.();
  return date
    ? date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
}

// Prefix search on a text field, trying capitalization variants
async function prefixSearch(coll: string, field: string, term: string): Promise<ResultItem[]> {
  const variants = Array.from(new Set([term, titleCase(term), term.toUpperCase()]));
  const found = new Map<string, ResultItem>();
  for (const v of variants) {
    const snap = await getDocs(
      query(collection(db, coll), orderBy(field), startAt(v), endAt(v + '\uf8ff'), limit(RESULT_LIMIT))
    );
    snap.docs.forEach((d) => found.set(d.id, { id: d.id, ...d.data() }));
  }
  return Array.from(found.values());
}

async function exactSearch(coll: string, field: string, value: string): Promise<ResultItem[]> {
  const snap = await getDocs(
    query(collection(db, coll), where(field, '==', value), limit(RESULT_LIMIT))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function mergeById(...lists: ResultItem[][]): ResultItem[] {
  const map = new Map<string, ResultItem>();
  for (const list of lists) for (const item of list) map.set(item.id, item);
  return Array.from(map.values()).slice(0, RESULT_LIMIT);
}

export default function CautarePage() {
  const [term, setTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [registru, setRegistru] = useState<ResultItem[]>([]);
  const [cereri, setCereri] = useState<ResultItem[]>([]);
  const [emailuri, setEmailuri] = useState<ResultItem[]>([]);

  const runSearch = async () => {
    const q = term.trim();
    if (q.length < 3) return;
    setSearching(true);
    setSearched(true);
    try {
      const isRegNumber = /^reg-/i.test(q);
      const isCnp = /^\d{13}$/.test(q);
      const isEmail = q.includes('@');

      if (isRegNumber) {
        const nr = q.toUpperCase();
        const [r, c, e] = await Promise.all([
          prefixSearch('registru_general', 'numarInregistrare', nr),
          exactSearch('form_submissions', 'numarInregistrare', nr),
          exactSearch('registratura_emails', 'numarInregistrare', nr),
        ]);
        setRegistru(r);
        setCereri(c);
        setEmailuri(e);
      } else if (isCnp) {
        setRegistru([]);
        setEmailuri([]);
        setCereri(await exactSearch('form_submissions', 'cnp', q));
      } else if (isEmail) {
        const lower = q.toLowerCase();
        const [c, r] = await Promise.all([
          exactSearch('form_submissions', 'email', lower),
          exactSearch('registru_general', 'emailEmitent', lower),
        ]);
        setCereri(c);
        setRegistru(r);
        setEmailuri([]);
      } else {
        // Name prefix across cereri and registry
        const [c, r] = await Promise.all([
          prefixSearch('form_submissions', 'numeComplet', q),
          prefixSearch('registru_general', 'emitent', q),
        ]);
        setCereri(c);
        setRegistru(r);
        setEmailuri([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const total = registru.length + cereri.length + emailuri.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Search className="h-7 w-7 text-sky-400" />
          Căutare globală
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Caută simultan în registrul general, cererile online și registratura de email — după număr de
          înregistrare (REG-...), CNP, email sau nume.
        </p>
      </div>

      <div className="flex gap-3">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="REG-2026-000123, 1900101223344, ion@exemplu.ro sau Ion Popescu..."
          className="bg-slate-800 border-slate-600 text-white text-base py-6"
        />
        <Button
          onClick={runSearch}
          disabled={searching || term.trim().length < 3}
          className="bg-sky-600 hover:bg-sky-700 px-6"
        >
          {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </Button>
      </div>

      {searched && !searching && total === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-10 text-center text-gray-400">
            Niciun rezultat pentru „{term.trim()}". Numele se caută după început (ex: „Pop" găsește
            „Popescu"), iar CNP/email/REG trebuie să fie exacte.
          </CardContent>
        </Card>
      )}

      {registru.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-400" />
                Registru general ({registru.length})
              </span>
              <Link href="/admin/registru" className="text-sm text-sky-400 hover:underline flex items-center gap-1">
                Deschide registrul <ArrowRight className="h-4 w-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {registru.map((d) => (
              <div key={d.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-green-400 text-sm">{d.numarInregistrare}</span>
                  <Badge className="bg-slate-700 text-gray-300">{d.directie === 'iesire' ? 'ieșire' : 'intrare'}</Badge>
                  <span className="text-white text-sm font-medium">{d.emitent}</span>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(d.dataInregistrare)}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{d.continut}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {cereri.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                Cereri online ({cereri.length})
              </span>
              <Link href="/admin/cereri" className="text-sm text-sky-400 hover:underline flex items-center gap-1">
                Deschide cererile <ArrowRight className="h-4 w-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cereri.map((d) => (
              <div key={d.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {d.numarInregistrare && (
                    <span className="font-mono text-green-400 text-sm">{d.numarInregistrare}</span>
                  )}
                  <span className="text-white text-sm font-medium">{d.numeComplet}</span>
                  <Badge className="bg-slate-700 text-gray-300">{d.status || 'noua'}</Badge>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(d.createdAt)}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{d.tipCerere}{d.scopulCererii ? ` — ${d.scopulCererii}` : ''}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {emailuri.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-400" />
                Registratură email ({emailuri.length})
              </span>
              <Link href="/admin/registratura" className="text-sm text-sky-400 hover:underline flex items-center gap-1">
                Deschide registratura <ArrowRight className="h-4 w-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emailuri.map((d) => (
              <div key={d.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-green-400 text-sm">{d.numarInregistrare}</span>
                  <span className="text-white text-sm font-medium truncate">{d.from}</span>
                  <Badge className="bg-slate-700 text-gray-300">{d.status || 'nou'}</Badge>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(d.dateReceived)}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{d.subject}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
