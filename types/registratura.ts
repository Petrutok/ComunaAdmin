import type { Timestamp as ClientTimestamp } from 'firebase/firestore';
import type { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

// These types are shared between the admin panel (client SDK) and API
// routes/server actions (Admin SDK). The two SDKs have distinct Timestamp
// classes with the same shape, so accept either. Type-only imports are
// erased at compile time and don't pull firebase-admin into the client bundle.
export type FirestoreTimestamp = ClientTimestamp | AdminTimestamp;
type Timestamp = FirestoreTimestamp;

export type EmailPriority = 'urgent' | 'normal' | 'low';

export interface RegistraturaEmail {
  id: string;
  numarInregistrare: string; // ex. REG-2025-000123
  from: string;
  to?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  dateReceived: Timestamp;
  attachments?: EmailAttachment[];
  status: EmailStatus;
  assignedTo?: string; // deprecated, use assignedToUserId
  observatii?: string;
  messageId?: string; // pentru a evita duplicatele
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Assignment fields
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  priority: EmailPriority;
  deadline: Timestamp | null;
  assignedAt?: Timestamp;
  assignedBy?: string; // User ID who made the assignment

  // Processed documents
  processedAttachments?: ProcessedAttachment[]; // Individual processed files (legacy)
  officialDocument?: OfficialDocument; // Single merged and stamped official document
  lastProcessed?: Timestamp;

  // Enterprise workflow extras
  etichete?: string[];       // free-form tags for grouping/filtering
}

export interface EmailAttachment {
  fileName: string; // Original filename
  downloadURL: string; // Firebase Storage URL
  fileSize: number; // Size in bytes
  fileType: string; // MIME type (e.g., 'application/pdf')
  uploadedAt: Timestamp; // Upload timestamp
}

export interface ProcessedAttachment {
  fileName: string; // Processed filename (usually .pdf)
  downloadURL: string; // Firebase Storage URL for processed file
  fileSize: number; // Size in bytes
  fileType: string; // MIME type (usually 'application/pdf')
  pageCount?: number; // Number of pages in PDF
  wasConverted: boolean; // True if converted from another format
  wasStamped: boolean; // True if registration stamp was applied
  processedAt: Timestamp; // Processing timestamp
  storagePath?: string; // Firebase Storage path
}

/**
 * Official merged and stamped document
 * Represents the single PDF with all attachments merged and stamped
 */
export interface OfficialDocument {
  fileName: string; // Usually 'document-oficial.pdf'
  downloadURL: string; // Firebase Storage URL
  fileSize: number; // Size in bytes
  pageCount?: number; // Total pages in merged PDF
  sourceFileCount: number; // Number of original attachments merged
  processedAt: Timestamp; // When the document was created
  storagePath?: string; // Firebase Storage path
}

/**
 * Full document workflow. The original four values (nou, in_lucru,
 * rezolvat, respins) remain valid DB values - existing documents need no
 * migration; the new states refine the flow between them.
 *
 * nou -> in_analiza -> repartizata -> in_lucru -> in_asteptare
 *   -> rezolvat | respins -> arhivat
 */
export type EmailStatus =
  | 'nou'           // Înregistrată
  | 'in_analiza'    // În analiză
  | 'repartizata'   // Repartizată
  | 'in_lucru'      // În lucru
  | 'in_asteptare'  // În așteptare (răspuns terț/petent)
  | 'rezolvat'      // Soluționată
  | 'respins'       // Respinsă
  | 'arhivat';      // Arhivată

export const EMAIL_STATUS_CONFIG: Record<
  EmailStatus,
  { label: string; color: string; bg: string; border: string; dot: string; order: number }
> = {
  nou:          { label: 'Înregistrată', color: 'text-blue-300',    bg: 'bg-blue-500/15',    border: 'border-blue-400/40',    dot: 'bg-blue-400',    order: 0 },
  in_analiza:   { label: 'În analiză',   color: 'text-cyan-300',    bg: 'bg-cyan-500/15',    border: 'border-cyan-400/40',    dot: 'bg-cyan-400',    order: 1 },
  repartizata:  { label: 'Repartizată',  color: 'text-violet-300',  bg: 'bg-violet-500/15',  border: 'border-violet-400/40',  dot: 'bg-violet-400',  order: 2 },
  in_lucru:     { label: 'În lucru',     color: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-400/40',   dot: 'bg-amber-400',   order: 3 },
  in_asteptare: { label: 'În așteptare', color: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-400/40',  dot: 'bg-orange-400',  order: 4 },
  rezolvat:     { label: 'Soluționată',  color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', dot: 'bg-emerald-400', order: 5 },
  respins:      { label: 'Respinsă',     color: 'text-rose-300',    bg: 'bg-rose-500/15',    border: 'border-rose-400/40',    dot: 'bg-rose-400',    order: 6 },
  arhivat:      { label: 'Arhivată',     color: 'text-gray-400',    bg: 'bg-gray-500/15',    border: 'border-gray-400/40',    dot: 'bg-gray-400',    order: 7 },
};

/** Statuses that count as "open" for SLA / overdue calculations */
export const OPEN_STATUSES: EmailStatus[] = ['nou', 'in_analiza', 'repartizata', 'in_lucru', 'in_asteptare'];

export const PRIORITY_CONFIG: Record<
  EmailPriority,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  urgent: { label: 'Urgent', color: 'text-red-300',  bg: 'bg-red-500/15',  border: 'border-red-400/40',  dot: 'bg-red-400' },
  normal: { label: 'Normal', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-400/40', dot: 'bg-blue-400' },
  low:    { label: 'Scăzut', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-400/40', dot: 'bg-gray-400' },
};

/** Entry in the per-document activity journal (audit log + internal comments).
 *  Stored in the `activity` subcollection of registratura_emails/{id}. */
export interface ActivityEntry {
  id: string;
  tip: 'status' | 'atribuire' | 'comentariu' | 'eticheta' | 'procesare' | 'creare' | 'altele';
  mesaj: string;             // human-readable, ex: "Status: În lucru → Soluționată"
  autorId: string;
  autorNume: string;
  createdAt: Timestamp;
}

export interface RegistraturaCounter {
  year: number;
  lastNumber: number;
  updatedAt: Timestamp;
}