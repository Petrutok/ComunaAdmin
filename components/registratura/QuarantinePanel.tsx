"use client";

// Quarantine panel: emails classified as spam/ads by AI triage (or the
// keyword heuristic). They never entered the official registry and consumed
// no registration number - but they are NOT deleted. Staff can register a
// false positive with one click, or discard it for good.

import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Inbox, Trash2, Megaphone, Ban } from 'lucide-react';
import {
  listQuarantineAction,
  registerFromQuarantineAction,
  deleteFromQuarantineAction,
} from '@/app/actions/quarantine';

interface QuarantineItem {
  id: string;
  from: string;
  subject: string;
  body: string;
  clasificare: 'spam' | 'reclama';
  motiv: string;
  attachmentNames: string[];
  dateReceived: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void; // reload the main list after recovering an email
}

export function QuarantinePanel({ open, onOpenChange, onRegistered }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await listQuarantineAction();
    setItems(res.success ? res.items : []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const register = async (item: QuarantineItem) => {
    setBusyId(item.id);
    const res = await registerFromQuarantineAction(item.id);
    setBusyId(null);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onRegistered();
      toast({ title: 'Înregistrat în registratură', description: item.subject });
    } else {
      toast({ title: 'Eroare', description: res.message, variant: 'destructive' });
    }
  };

  const discard = async (item: QuarantineItem) => {
    setBusyId(item.id);
    const res = await deleteFromQuarantineAction(item.id);
    setBusyId(null);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: 'Șters din carantină' });
    } else {
      toast({ title: 'Eroare', description: res.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-slate-700 bg-slate-900 text-white sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Carantină ({items.length})
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Emailuri clasificate ca spam sau reclamă. Nu au primit număr de înregistrare
            și nu au intrat în registratură. Dacă vreunul e corespondență reală,
            înregistrează-l cu un click.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="text-gray-400">Carantina e goală. Nimic filtrat greșit.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                      item.clasificare === 'spam'
                        ? 'border-red-400/40 bg-red-500/15 text-red-300'
                        : 'border-orange-400/40 bg-orange-500/15 text-orange-300'
                    }`}
                  >
                    {item.clasificare === 'spam' ? <Ban className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                    {item.clasificare === 'spam' ? 'Spam' : 'Reclamă'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.dateReceived
                      ? new Date(item.dateReceived).toLocaleDateString('ro-RO', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>

                <p className="truncate text-sm font-medium text-white">{item.subject}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">De la: {item.from}</p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-300">{item.body}</p>
                {item.attachmentNames.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    📎 {item.attachmentNames.length} atașamente (nesalvate)
                  </p>
                )}
                <p className="mt-2 rounded-md bg-slate-900/60 px-2 py-1 text-xs italic text-gray-400">
                  Motiv: {item.motiv}
                </p>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => register(item)}
                    disabled={busyId === item.id}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Inbox className="mr-1.5 h-4 w-4" />
                    )}
                    E corespondență reală — înregistrează
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => discard(item)}
                    disabled={busyId === item.id}
                    aria-label="Șterge din carantină"
                    className="rounded-lg border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
