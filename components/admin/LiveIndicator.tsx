'use client';

// Subtle realtime status hint for pages backed by useCollectionSnapshot.
// Replaces the old "Reîncarcă" button: the list updates itself, so all the
// user needs is reassurance that it's live (or a quiet note when the
// connection dropped and data is served from cache).

import { Wifi, WifiOff } from 'lucide-react';

export function LiveIndicator({ fromCache }: { fromCache: boolean }) {
  if (fromCache) {
    return (
      <span
        className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs text-amber-300/90"
        title="Conexiune întreruptă — se afișează ultimele date; se reconectează automat"
      >
        <WifiOff className="h-3.5 w-3.5" />
        Reconectare…
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs text-emerald-300/80"
      title="Lista se actualizează în timp real"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Live
    </span>
  );
}
