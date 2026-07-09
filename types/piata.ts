import type { Timestamp } from 'firebase/firestore';

// "Piața locală" - a produce market for goods sold by local households
// (gospodari): honey, eggs, cheese, vegetables, homemade preserves, etc.
// Separate from the general "Anunțuri locale" classifieds.

export type ProduseCategorie =
  | 'legume'
  | 'fructe'
  | 'lactate'
  | 'miere'
  | 'oua'
  | 'carne'
  | 'bauturi'
  | 'panificatie'
  | 'conserve'
  | 'altele';

export interface ProdusLocal {
  id: string;
  categorie: ProduseCategorie;
  titlu: string;
  descriere?: string;
  pret: number;
  unitate: string;               // kg, bucată, litru, borcan...
  negociabil?: boolean;
  cantitateDisponibila?: string; // free text, ex: "20 kg", "50 borcane"
  localitate?: string;           // village within the commune
  vanzator: string;              // household / seller name
  telefon: string;
  imageUrl?: string;
  // Moderation, same flow as announcements: posts start 'pending', staff
  // approve/reject; only 'approved' products are shown publicly.
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: Timestamp;
}

export const PRODUSE_CATEGORII: Record<
  ProduseCategorie,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  legume:      { label: 'Legume',        icon: '🥕', color: 'text-green-300',   bg: 'bg-green-500/15',   border: 'border-green-400/40' },
  fructe:      { label: 'Fructe',        icon: '🍎', color: 'text-red-300',     bg: 'bg-red-500/15',     border: 'border-red-400/40' },
  lactate:     { label: 'Lactate',       icon: '🧀', color: 'text-amber-200',   bg: 'bg-amber-400/15',   border: 'border-amber-300/40' },
  miere:       { label: 'Miere',         icon: '🍯', color: 'text-yellow-300',  bg: 'bg-yellow-500/15',  border: 'border-yellow-400/40' },
  oua:         { label: 'Ouă',           icon: '🥚', color: 'text-orange-200',  bg: 'bg-orange-400/15',  border: 'border-orange-300/40' },
  carne:       { label: 'Carne & mezeluri', icon: '🍖', color: 'text-rose-300', bg: 'bg-rose-500/15',    border: 'border-rose-400/40' },
  bauturi:     { label: 'Vin, must, țuică', icon: '🍷', color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-400/40' },
  panificatie: { label: 'Pâine & cozonac', icon: '🍞', color: 'text-amber-300', bg: 'bg-amber-500/15',   border: 'border-amber-400/40' },
  conserve:    { label: 'Dulcețuri & murături', icon: '🫙', color: 'text-pink-300', bg: 'bg-pink-500/15', border: 'border-pink-400/40' },
  altele:      { label: 'Altele',        icon: '🧺', color: 'text-gray-300',    bg: 'bg-gray-500/15',    border: 'border-gray-400/40' },
};

// Common selling units for household produce
export const UNITATI_PRODUSE = [
  'kg', 'bucată', 'litru', 'borcan', 'legătură', 'duzină', 'sticlă', 'coș',
] as const;
