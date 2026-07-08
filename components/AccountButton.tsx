"use client";

// State-aware account chip for the homepage header.
// - logged out: "Intră în cont"
// - logged in: avatar with the citizen's initial + first name (personalized)
// Links to /cont either way. Kept compact; on mobile the bottom-nav "Cont"
// tab is the primary path, so this is mainly the desktop entry point.

import Link from 'next/link';
import { UserCircle } from 'lucide-react';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';

export function AccountButton() {
  const { user, profile, loading } = useCitizenAuth();

  // Neutral placeholder during auth resolution to avoid a logged-in/out flash
  if (loading) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/cont"
        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
      >
        <UserCircle className="h-5 w-5" />
        <span>Intră în cont</span>
      </Link>
    );
  }

  const displayName = profile?.numeComplet || user.displayName || user.email || 'Cont';
  const firstName = displayName.split(/\s+/)[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <Link
      href="/cont"
      aria-label={`Contul meu: ${displayName}`}
      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
        {initial}
      </span>
      <span className="max-w-[8rem] truncate">{firstName}</span>
    </Link>
  );
}
