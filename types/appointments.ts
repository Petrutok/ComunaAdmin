import type { Timestamp } from 'firebase/firestore';

// Online appointments at the town hall counters + mayor's audience hours.

export type AppointmentService =
  | 'taxe'
  | 'urbanism'
  | 'asistenta-sociala'
  | 'registratura'
  | 'audienta-primar';

export type AppointmentStatus = 'confirmata' | 'anulata' | 'finalizata';

export interface Appointment {
  id: string;
  service: AppointmentService;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  citizenUid: string;
  nume: string;
  telefon: string;
  email?: string;
  motiv?: string;
  status: AppointmentStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const SERVICE_CONFIG: Record<
  AppointmentService,
  { label: string; icon: string; description: string }
> = {
  taxe: {
    label: 'Taxe și impozite',
    icon: '💰',
    description: 'Plăți, certificate fiscale, declarații',
  },
  urbanism: {
    label: 'Urbanism',
    icon: '🏗️',
    description: 'Autorizații, certificate de urbanism, cadastru',
  },
  'asistenta-sociala': {
    label: 'Asistență socială',
    icon: '🤝',
    description: 'Ajutoare sociale, alocații, anchete sociale',
  },
  registratura: {
    label: 'Registratură / Secretariat',
    icon: '📋',
    description: 'Depunere documente, adeverințe, informații',
  },
  'audienta-primar': {
    label: 'Audiență la primar',
    icon: '🏛️',
    description: 'Discuție directă cu primarul comunei',
  },
};

// Working hours: 30-minute slots, 09:00-14:00
export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '11:30', '12:00', '12:30', '13:00', '13:30',
];

/** Deterministic doc ID: one Firestore document per bookable slot, so a
 *  create() on an already-booked slot fails atomically. */
export function slotDocId(service: string, date: string, time: string): string {
  return `${service}_${date}_${time.replace(':', '')}`;
}

/** Next `count` working days (Mon-Fri), starting tomorrow. */
export function nextWorkingDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
  }
  return days;
}
