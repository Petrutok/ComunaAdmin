"use client";

// Warm, local greeting for the homepage header: a time-aware salutation
// (personalized when the citizen is logged in) plus today's date in Romanian.
// Balances the top row against the account chip and gives the app a living,
// welcoming feel instead of empty space.

import { useEffect, useState } from 'react';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';

function timeGreeting(hour: number): string {
  if (hour < 12) return 'Bună dimineața';
  if (hour < 18) return 'Bună ziua';
  return 'Bună seara';
}

export function HeaderGreeting() {
  const { user, profile } = useCitizenAuth();
  // Date/time are client-only; render after mount to avoid hydration
  // mismatch (server and client clocks can differ).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (!now) {
    // Stable placeholder that reserves the same height (no layout shift)
    return <div className="h-10" aria-hidden="true" />;
  }

  const firstName = (profile?.numeComplet || user?.displayName || '')
    .split(/\s+/)[0];
  const greeting = user && firstName
    ? `${timeGreeting(now.getHours())}, ${firstName}!`
    : `${timeGreeting(now.getHours())}!`;

  // Romanian keeps weekday/month lowercase; capitalize only the first letter
  const rawDate = now.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dateStr = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div className="min-w-0">
      <p className="truncate text-lg font-semibold text-white">{greeting}</p>
      <p className="truncate text-sm text-gray-400">{dateStr}</p>
    </div>
  );
}
