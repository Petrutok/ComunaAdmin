import type { Timestamp } from 'firebase/firestore';

// Urgent local alerts: water/power outages, blocked roads, weather warnings.
// Issued by staff from /admin/alerte, shown on / (banner) and /alerte,
// broadcast as push notifications.

export type AlertType = 'apa' | 'curent' | 'drum' | 'vreme' | 'sanatate' | 'altele';

export interface LocalAlert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  active: boolean;
  createdAt: Timestamp;
  // Optional expiry: after this moment the alert stops showing even if
  // nobody deactivated it manually
  expiresAt?: Timestamp | null;
  createdBy: string;
  createdByNume: string;
}

export const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { label: string; icon: string; color: string; bgColor: string; borderColor: string }
> = {
  apa: {
    label: 'Apă potabilă',
    icon: '💧',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
  },
  curent: {
    label: 'Curent electric',
    icon: '⚡',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-400/30',
  },
  drum: {
    label: 'Drumuri / trafic',
    icon: '🚧',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-400/30',
  },
  vreme: {
    label: 'Vreme severă',
    icon: '🌩️',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-400/30',
  },
  sanatate: {
    label: 'Sănătate publică',
    icon: '🏥',
    color: 'text-rose-300',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-400/30',
  },
  altele: {
    label: 'Altele',
    icon: '📢',
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400/30',
  },
};

/** An alert counts as live if it's active and not past its expiry. */
export function isAlertLive(alert: Pick<LocalAlert, 'active' | 'expiresAt'>): boolean {
  if (!alert.active) return false;
  if (alert.expiresAt && alert.expiresAt.toMillis() < Date.now()) return false;
  return true;
}
