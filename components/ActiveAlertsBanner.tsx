"use client";

// Red banner shown at the top of the homepage while at least one urgent
// local alert is live. Client component so the (server-rendered) homepage
// stays static.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Siren, ChevronRight } from 'lucide-react';
import { LocalAlert, ALERT_TYPE_CONFIG, isAlertLive } from '@/types/alerts';

export function ActiveAlertsBanner() {
  const [liveAlerts, setLiveAlerts] = useState<LocalAlert[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Single-field filter keeps this index-free; expiry checked client-side
        const snap = await getDocs(
          query(collection(db, 'alerts'), where('active', '==', true), limit(10))
        );
        const alerts = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as LocalAlert))
          .filter(isAlertLive)
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setLiveAlerts(alerts);
      } catch (error) {
        console.error('[AlertsBanner] Failed to load alerts:', error);
      }
    };
    load();
  }, []);

  if (liveAlerts.length === 0) return null;

  const first = liveAlerts[0];
  const config = ALERT_TYPE_CONFIG[first.type] || ALERT_TYPE_CONFIG.altele;

  return (
    <Link href="/alerte" className="block">
      <div className="bg-gradient-to-r from-red-700 to-red-600 px-4 py-3 text-white hover:from-red-600 hover:to-red-500 transition-colors">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Siren className="h-5 w-5 shrink-0 animate-pulse" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {config.icon} {first.title}
            {liveAlerts.length > 1 && (
              <span className="ml-2 text-red-200">(+{liveAlerts.length - 1} alte alerte)</span>
            )}
          </p>
          <span className="flex shrink-0 items-center text-xs font-semibold uppercase tracking-wide text-red-100">
            Detalii <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
