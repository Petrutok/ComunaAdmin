import { Timestamp } from 'firebase/firestore';

// Document types for registry
export type TipDocument =
  | 'adresa'              // Official Address
  | 'dispozitie'          // Disposition
  | 'hotarare'            // Decision
  | 'raport'              // Report
  | 'cerere'              // Request
  | 'notificare'          // Notification
  | 'proces_verbal'       // Minutes
  | 'nota_interna'        // Internal Note
  | 'altele';             // Others

// Status types
export type StatusRegistru = 'nou' | 'in_lucru' | 'finalizat';

// Where the registry entry came from (unified registry)
export type SursaRegistru = 'manual' | 'email' | 'cerere_online' | 'adeverinta' | 'raspuns';

// Real registries record both directions
export type DirectieRegistru = 'intrare' | 'iesire';

// Main registry document interface
export interface RegistruDocument {
  id: string;

  // Document identification
  numarInregistrare: string;        // Ex: "REG-2025-000123" (auto-generated)
  tipDocument: TipDocument;          // dropdown with options

  // Temporal data
  dataInregistrare: Timestamp;       // when registered in system
  dataExterna?: string;              // original document date (manual input, format: dd.mm.yyyy)
  numarExtern?: string;              // sender's document number (manual input)

  // Involved parties
  emitent: string;                   // who sends/creates the document
  adresaEmitent?: string;
  emailEmitent?: string;

  destinatar: string;                // who it's addressed to
  adresaDestinatar?: string;
  emailDestinatar?: string;

  // Content
  continut: string;                  // document description/summary
  observatii?: string;               // internal notes

  // Workflow
  departament?: string;              // responsible department
  status: StatusRegistru;

  // Unified registry fields
  sursa?: SursaRegistru;             // how the document entered the system (default: manual)
  directie?: DirectieRegistru;       // intrare/iesire (default: intrare)
  termen?: Timestamp | null;         // legal response deadline (OG 27/2002: 30 days)
  emailId?: string;                  // link to registratura_emails doc (sursa=email)
  cerereId?: string;                 // link to form_submissions doc (sursa=cerere_online/adeverinta/raspuns)

  // Conexare intrare<->iesire (official response circuit)
  raspunsLaDocId?: string | null;    // on iesire: registry doc id of the intrare being answered
  raspunsLaNumar?: string | null;    // on iesire: registration number of that intrare
  raspunsNumar?: string;             // on intrare: outgoing number of the issued response

  // Metadata
  creatDe: string;                   // user ID
  creatDeNume: string;               // user name
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Attachments (optional)
  attachments?: Array<{
    fileName: string;
    downloadURL: string;
    fileSize: number;
    fileType: string;
  }>;
}

// Counter document for sequential number generation
export interface RegistruCounter {
  year: number;
  lastNumber: number;
}

// Document type configuration
export const TIP_DOCUMENT_CONFIG = {
  'adresa': {
    label: 'Adresă',
    icon: '📄',
    color: 'bg-blue-600',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
  },
  'dispozitie': {
    label: 'Dispoziție',
    icon: '📋',
    color: 'bg-purple-600',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-400/30',
  },
  'hotarare': {
    label: 'Hotărâre',
    icon: '⚖️',
    color: 'bg-indigo-600',
    textColor: 'text-indigo-300',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-400/30',
  },
  'raport': {
    label: 'Raport',
    icon: '📊',
    color: 'bg-amber-600',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/30',
  },
  'cerere': {
    label: 'Cerere',
    icon: '✉️',
    color: 'bg-green-600',
    textColor: 'text-green-300',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-400/30',
  },
  'notificare': {
    label: 'Notificare',
    icon: '🔔',
    color: 'bg-rose-600',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-400/30',
  },
  'proces_verbal': {
    label: 'Proces Verbal',
    icon: '📝',
    color: 'bg-teal-600',
    textColor: 'text-teal-300',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-400/30',
  },
  'nota_interna': {
    label: 'Notă Internă',
    icon: '📌',
    color: 'bg-cyan-600',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-400/30',
  },
  'altele': {
    label: 'Altele',
    icon: '📎',
    color: 'bg-gray-600',
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400/30',
  },
} as const;

// Status configuration
export const STATUS_CONFIG = {
  'nou': {
    label: 'Nou',
    icon: '✨',
    color: 'bg-blue-600',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
  },
  'in_lucru': {
    label: 'În lucru',
    icon: '⏳',
    color: 'bg-amber-600',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/30',
  },
  'finalizat': {
    label: 'Finalizat',
    icon: '✅',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/30',
  },
} as const;

// Department list (can be updated based on your communes)
export const DEPARTMENTS_LIST = [
  'Administrație',
  'Contabilitate',
  'Servicii Publice',
  'Asistenți Sociali',
  'Urbanism',
  'Agricultură',
  'Cultură',
  'Educație',
  'Sănătate',
  'Ressurse Umane',
] as const;
