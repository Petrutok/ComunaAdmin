"use client";

// Registratura dashboard strip: four clickable stat cards (they drive the
// list filter) plus a "due soon" attention list. Clicking a card filters
// the table below - stats ARE the smart filters.

import { Card, CardContent } from '@/components/ui/card';
import { Inbox, Hammer, CheckCircle2, AlarmClock } from 'lucide-react';
import { RegistraturaEmail } from '@/types/registratura';
import { DeadlineBadge } from './RegistraturaBadges';

export type DashboardFilter = 'noi' | 'in_lucru' | 'solutionate' | 'depasite' | null;

interface Props {
  stats: {
    noi: number;
    inLucru: number;
    solutionateLuna: number;
    depasite: RegistraturaEmail[];
    expiraCurand: RegistraturaEmail[];
  };
  active: DashboardFilter;
  onSelect: (filter: DashboardFilter) => void;
  onOpenEmail: (email: RegistraturaEmail) => void;
}

const CARDS: Array<{
  key: Exclude<DashboardFilter, null>;
  label: string;
  icon: typeof Inbox;
  iconColor: string;
  activeRing: string;
}> = [
  { key: 'noi', label: 'Neînregistrate în flux', icon: Inbox, iconColor: 'text-blue-400', activeRing: 'ring-blue-500' },
  { key: 'in_lucru', label: 'În lucru', icon: Hammer, iconColor: 'text-amber-400', activeRing: 'ring-amber-500' },
  { key: 'solutionate', label: 'Soluționate luna aceasta', icon: CheckCircle2, iconColor: 'text-emerald-400', activeRing: 'ring-emerald-500' },
  { key: 'depasite', label: 'Termen depășit', icon: AlarmClock, iconColor: 'text-red-400', activeRing: 'ring-red-500' },
];

export function RegistraturaDashboard({ stats, active, onSelect, onOpenEmail }: Props) {
  const values: Record<Exclude<DashboardFilter, null>, number> = {
    noi: stats.noi,
    in_lucru: stats.inLucru,
    solutionate: stats.solutionateLuna,
    depasite: stats.depasite.length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map(({ key, label, icon: Icon, iconColor, activeRing }) => {
          const isActive = active === key;
          const isAlert = key === 'depasite' && values.depasite > 0;
          return (
            <button
              key={key}
              onClick={() => onSelect(isActive ? null : key)}
              aria-pressed={isActive}
              className="text-left"
            >
              <Card
                className={`h-full rounded-2xl border transition-all hover:border-slate-500 ${
                  isAlert ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700 bg-slate-800/80'
                } ${isActive ? `ring-2 ${activeRing}` : ''}`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className={`h-7 w-7 shrink-0 ${isAlert ? 'text-red-400' : iconColor}`} strokeWidth={1.8} />
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none text-white">{values[key]}</p>
                    <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {stats.expiraCurand.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-300">
            ⏳ Expiră în următoarele 3 zile ({stats.expiraCurand.length})
          </p>
          <div className="space-y-1.5">
            {stats.expiraCurand.slice(0, 5).map((email) => (
              <button
                key={email.id}
                onClick={() => onOpenEmail(email)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800/70"
              >
                <span className="min-w-0 truncate text-sm text-gray-200">
                  <span className="font-mono text-xs text-gray-500">{email.numarInregistrare}</span>
                  {' · '}
                  {email.subject || '(fără subiect)'}
                </span>
                <DeadlineBadge deadline={email.deadline} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
