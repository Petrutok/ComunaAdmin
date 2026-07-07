"use client";

// Reusable, config-driven badges for the registratura module.
// Single source of styling so table, detail sheet and dashboard stay
// visually consistent.

import {
  EmailStatus,
  EmailPriority,
  EMAIL_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '@/types/registratura';
import type { FirestoreTimestamp } from '@/types/registratura';
import { getDaysRemaining } from '@/lib/utils/deadline-utils';

export function StatusBadge({ status }: { status: EmailStatus }) {
  const c = EMAIL_STATUS_CONFIG[status] || EMAIL_STATUS_CONFIG.nou;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.color} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority?: EmailPriority }) {
  if (!priority || priority === 'normal') return null; // normal = no visual noise
  const c = PRIORITY_CONFIG[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.color} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}

/** Deadline pill: red when overdue, amber under 3 days, gray otherwise. */
export function DeadlineBadge({
  deadline,
  resolved,
}: {
  deadline?: FirestoreTimestamp | null;
  resolved?: boolean;
}) {
  if (!deadline || resolved) return null;
  const days = getDaysRemaining(deadline);

  if (days < 0) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-red-400/50 bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
        ⏰ Depășit cu {Math.abs(days)} {Math.abs(days) === 1 ? 'zi' : 'zile'}
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
        {days === 0 ? 'Expiră azi' : `${days} ${days === 1 ? 'zi rămasă' : 'zile rămase'}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-xs text-gray-400">
      {days} zile
    </span>
  );
}

export function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-600 bg-slate-700/60 px-2 py-0.5 text-xs text-gray-300">
      #{tag}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Elimină eticheta ${tag}`}
          className="ml-0.5 text-gray-500 hover:text-white"
        >
          ×
        </button>
      )}
    </span>
  );
}
