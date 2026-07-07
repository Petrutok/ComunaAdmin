// types/content.ts
// Admin-editable public content (events, ongoing works, representatives,
// waste-collection settings). Public pages read these collections and fall
// back to their built-in defaults while a collection is still empty, so a
// fresh tenant renders sensibly before the admin fills anything in.
//
// Icons/colors are NOT stored - they're derived from `category` via the
// configs below, so staff never deal with styling.

export interface EventItem {
  id: string;
  title: string;
  date: string;        // free text, ex: "20 iunie 2026"
  time?: string;       // ex: "10:00 - 23:00"
  location?: string;
  month: string;       // lowercase Romanian month, used by the filter
  category: EventCategory;
  description?: string;
  activities?: string[];
  createdAt?: unknown;
}

export type EventCategory = 'cultural' | 'religios' | 'social' | 'familie' | 'oficial' | 'sportiv';

export const EVENT_CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; borderColor: string }> = {
  cultural: { label: 'Cultural', color: 'bg-purple-500', borderColor: 'border-purple-500' },
  religios: { label: 'Religios', color: 'bg-red-500', borderColor: 'border-red-500' },
  social: { label: 'Social', color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  familie: { label: 'Familie', color: 'bg-pink-500', borderColor: 'border-pink-500' },
  oficial: { label: 'Oficial', color: 'bg-blue-500', borderColor: 'border-blue-500' },
  sportiv: { label: 'Sportiv', color: 'bg-green-500', borderColor: 'border-green-500' },
};

export const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
] as const;

export interface WorkItem {
  id: string;
  title: string;
  location?: string;
  program?: string;    // ex: PNRR, AFM, Buget local
  category: WorkCategory;
  progress: number;    // 0-100
  description?: string;
  budget?: string;     // free text, ex: "2.500.000 RON"
  status?: string;     // ex: "În execuție"
  createdAt?: unknown;
}

export type WorkCategory = 'educatie' | 'cultura' | 'infrastructura' | 'utilitati' | 'sanatate' | 'altele';

export const WORK_CATEGORY_CONFIG: Record<WorkCategory, { label: string; color: string; borderColor: string }> = {
  educatie: { label: 'Educație', color: 'bg-blue-500', borderColor: 'border-blue-500' },
  cultura: { label: 'Cultură', color: 'bg-purple-500', borderColor: 'border-purple-500' },
  infrastructura: { label: 'Infrastructură', color: 'bg-orange-500', borderColor: 'border-orange-500' },
  utilitati: { label: 'Utilități', color: 'bg-cyan-500', borderColor: 'border-cyan-500' },
  sanatate: { label: 'Sănătate', color: 'bg-rose-500', borderColor: 'border-rose-500' },
  altele: { label: 'Altele', color: 'bg-gray-500', borderColor: 'border-gray-500' },
};

export interface RepresentativeItem {
  id: string;
  name: string;
  affiliation: string; // partid / independent
  email?: string;
  phone?: string;
  gender?: 'male' | 'female';
  createdAt?: unknown;
}

/** site_settings/colectare - the tenant-specific part of the waste page */
export interface ColectareSettings {
  calendarUrl?: string;   // link to the operator's published calendar
  calendarLabel?: string; // ex: "Descarcă Calendar 2026"
}
