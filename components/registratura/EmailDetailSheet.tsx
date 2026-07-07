"use client";

// The document file (fisa): everything about one registered document in a
// right-side sheet - sender, content, attachments, workflow controls
// (status / assignment / priority / tags), internal notes and the unified
// activity timeline (audit log + comments).

import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Paperclip, Download, FileCheck, Send, Trash2, Copy,
  User as UserIcon, Mail, CalendarDays, MessageSquare, History,
} from 'lucide-react';
import {
  RegistraturaEmail, EmailStatus, EmailPriority, ActivityEntry,
  EMAIL_STATUS_CONFIG, PRIORITY_CONFIG,
} from '@/types/registratura';
import { Department, User } from '@/types/departments';
import { fetchActivity } from '@/lib/registratura/audit';
import { StatusBadge, PriorityBadge, DeadlineBadge, TagBadge } from './RegistraturaBadges';

const ACTIVITY_ICON: Record<ActivityEntry['tip'], string> = {
  creare: '📥',
  status: '🔄',
  atribuire: '👤',
  comentariu: '💬',
  eticheta: '🏷️',
  procesare: '📄',
  altele: '•',
};

function parseSender(from: string): { name: string; email: string } {
  const emailMatch = from.match(/<(.+)>/);
  return {
    name: from.replace(/<.*>/, '').replace(/"/g, '').trim() || from,
    email: emailMatch ? emailMatch[1] : from,
  };
}

interface Props {
  email: RegistraturaEmail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  users: User[];
  processing: boolean;
  onUpdateStatus: (email: RegistraturaEmail, status: EmailStatus, observatii?: string) => Promise<void>;
  onAssign: (email: RegistraturaEmail, deptId: string | null, userId: string | null, priority: EmailPriority) => Promise<void>;
  onSetTags: (email: RegistraturaEmail, tags: string[]) => Promise<void>;
  onAddComment: (email: RegistraturaEmail, text: string) => Promise<void>;
  onProcess: (email: RegistraturaEmail) => Promise<void>;
  onDelete: (email: RegistraturaEmail) => void;
}

export function EmailDetailSheet({
  email, open, onOpenChange, departments, users, processing,
  onUpdateStatus, onAssign, onSetTags, onAddComment, onProcess, onDelete,
}: Props) {
  const { toast } = useToast();

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [observatii, setObservatii] = useState('');
  const [assignDept, setAssignDept] = useState<string>('none');
  const [assignUser, setAssignUser] = useState<string>('none');
  const [assignPriority, setAssignPriority] = useState<EmailPriority>('normal');

  // Sync editable fields + activity when a document opens
  useEffect(() => {
    if (!email || !open) return;
    setObservatii(email.observatii || '');
    setAssignDept(email.departmentId || 'none');
    setAssignUser(email.assignedToUserId || 'none');
    setAssignPriority(email.priority || 'normal');
    setComment('');
    setTagInput('');
    setLoadingActivity(true);
    fetchActivity(email.id)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setLoadingActivity(false));
  }, [email?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!email) return null;

  const sender = parseSender(email.from);
  const resolved = ['rezolvat', 'respins', 'arhivat'].includes(email.status);

  const refreshActivity = () => fetchActivity(email.id).then(setActivity).catch(() => {});

  const handleStatus = async (status: EmailStatus) => {
    await onUpdateStatus(email, status, observatii);
    toast({ title: 'Status actualizat', description: EMAIL_STATUS_CONFIG[status].label });
    refreshActivity();
  };

  const handleAssign = async () => {
    await onAssign(
      email,
      assignDept === 'none' ? null : assignDept,
      assignUser === 'none' ? null : assignUser,
      assignPriority
    );
    toast({ title: 'Document repartizat' });
    refreshActivity();
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!tag) return;
    const next = Array.from(new Set([...(email.etichete || []), tag]));
    await onSetTags(email, next);
    setTagInput('');
    refreshActivity();
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await onAddComment(email, comment);
      setComment('');
      refreshActivity();
    } finally {
      setSendingComment(false);
    }
  };

  const formatDateTime = (ts?: { toDate?: () => Date }) =>
    ts?.toDate?.()?.toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) || '—';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-slate-700 bg-slate-900 text-white sm:max-w-2xl">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-lg text-white">{email.numarInregistrare}</SheetTitle>
            <button
              onClick={() => {
                navigator.clipboard.writeText(email.numarInregistrare);
                toast({ title: 'Copiat', description: email.numarInregistrare });
              }}
              aria-label="Copiază numărul de înregistrare"
              className="text-gray-500 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={email.status} />
            <PriorityBadge priority={email.priority} />
            <DeadlineBadge deadline={email.deadline} resolved={resolved} />
            {(email.etichete || []).map((t) => (
              <TagBadge key={t} tag={t} onRemove={() => onSetTags(email, email.etichete!.filter((x) => x !== t))} />
            ))}
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Solicitant */}
          <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Solicitant</h3>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2 text-white">
                <UserIcon className="h-4 w-4 text-gray-500" /> {sender.name}
              </p>
              <p className="flex items-center gap-2 text-gray-300">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${sender.email}`} className="text-blue-400 hover:underline">{sender.email}</a>
              </p>
              <p className="flex items-center gap-2 text-gray-400">
                <CalendarDays className="h-4 w-4 text-gray-500" /> Primit: {formatDateTime(email.dateReceived)}
              </p>
            </div>
          </section>

          {/* Continut */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Conținut</h3>
            <p className="font-medium text-white">{email.subject || '(fără subiect)'}</p>
            <div className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-sm text-gray-300">
              {email.body || '(fără conținut text)'}
            </div>
          </section>

          {/* Atasamente */}
          {(email.attachments?.length || 0) > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                Atașamente ({email.attachments!.length})
              </h3>
              <div className="space-y-1.5">
                {email.attachments!.map((att, i) => (
                  <a
                    key={i}
                    href={att.downloadURL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-slate-500"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                      <span className="truncate">{att.fileName}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-gray-500" />
                  </a>
                ))}
              </div>

              {email.officialDocument ? (
                <a
                  href={email.officialDocument.downloadURL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300 hover:border-emerald-400"
                >
                  <FileCheck className="h-4 w-4" />
                  Document oficial ștampilat ({email.officialDocument.pageCount || '?'} pagini)
                  <Download className="ml-auto h-4 w-4" />
                </a>
              ) : (
                <Button
                  onClick={() => onProcess(email).then(refreshActivity)}
                  disabled={processing}
                  variant="outline"
                  className="mt-2 w-full rounded-lg border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                  Generează documentul oficial ștampilat
                </Button>
              )}
            </section>
          )}

          <Separator className="bg-slate-700" />

          {/* Workflow */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Flux de lucru</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Status</Label>
                <Select value={email.status} onValueChange={(v) => handleStatus(v as EmailStatus)}>
                  <SelectTrigger className="rounded-lg border-slate-600 bg-slate-800 text-white" aria-label="Schimbă statusul">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-white">
                    {(Object.keys(EMAIL_STATUS_CONFIG) as EmailStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{EMAIL_STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Prioritate</Label>
                <Select value={assignPriority} onValueChange={(v) => setAssignPriority(v as EmailPriority)}>
                  <SelectTrigger className="rounded-lg border-slate-600 bg-slate-800 text-white" aria-label="Prioritate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-white">
                    {(Object.keys(PRIORITY_CONFIG) as EmailPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Compartiment</Label>
                <Select value={assignDept} onValueChange={setAssignDept}>
                  <SelectTrigger className="rounded-lg border-slate-600 bg-slate-800 text-white" aria-label="Compartiment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-white">
                    <SelectItem value="none">— fără —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Responsabil</Label>
                <Select value={assignUser} onValueChange={setAssignUser}>
                  <SelectTrigger className="rounded-lg border-slate-600 bg-slate-800 text-white" aria-label="Responsabil">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-white">
                    <SelectItem value="none">— fără —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAssign}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              Repartizează (recalculează termenul)
            </Button>

            {/* Tags */}
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Adaugă etichetă (ex: urbanism, apia)..."
                aria-label="Adaugă etichetă"
                className="rounded-lg border-slate-600 bg-slate-800 text-white placeholder:text-gray-500"
              />
              <Button onClick={handleAddTag} variant="outline" className="rounded-lg border-slate-600 text-gray-300 hover:bg-slate-700">
                Adaugă
              </Button>
            </div>

            {/* Observatii */}
            <div className="space-y-1.5">
              <Label className="text-gray-300">Observații interne</Label>
              <Textarea
                value={observatii}
                onChange={(e) => setObservatii(e.target.value)}
                onBlur={() => {
                  if (observatii !== (email.observatii || '')) {
                    onUpdateStatus(email, email.status, observatii);
                    toast({ title: 'Observații salvate' });
                  }
                }}
                rows={2}
                placeholder="Note vizibile doar personalului..."
                className="rounded-lg border-slate-600 bg-slate-800 text-white placeholder:text-gray-500"
              />
            </div>
          </section>

          <Separator className="bg-slate-700" />

          {/* Activity + comments */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              <History className="h-4 w-4" /> Jurnal de activitate
            </h3>

            <div className="mb-3 flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleComment())}
                placeholder="Scrie un comentariu intern..."
                aria-label="Comentariu intern"
                className="rounded-lg border-slate-600 bg-slate-800 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleComment}
                disabled={sendingComment || !comment.trim()}
                aria-label="Trimite comentariul"
                className="rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {loadingActivity ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Nicio activitate înregistrată încă pentru acest document.
              </p>
            ) : (
              <ol className="relative space-y-3 border-l border-slate-700 pl-5">
                {activity.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[27px] top-0.5 text-sm" aria-hidden="true">
                      {ACTIVITY_ICON[entry.tip] || '•'}
                    </span>
                    <p className={`text-sm ${entry.tip === 'comentariu' ? 'rounded-lg border border-slate-700 bg-slate-800/60 p-2.5 text-gray-200' : 'text-gray-300'}`}>
                      {entry.tip === 'comentariu' && <MessageSquare className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-blue-400" />}
                      {entry.mesaj}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {entry.autorNume} · {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Separator className="bg-slate-700" />

          {/* Danger zone */}
          <Button
            variant="outline"
            onClick={() => onDelete(email)}
            className="w-full rounded-lg border-red-500/40 text-red-300 hover:bg-red-950/30 hover:text-red-200"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Șterge documentul
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
