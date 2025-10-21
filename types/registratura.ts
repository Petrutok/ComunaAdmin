import { Timestamp } from 'firebase/firestore';

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

export type EmailStatus = 'nou' | 'in_lucru' | 'rezolvat' | 'respins';

export interface RegistraturaCounter {
  year: number;
  lastNumber: number;
  updatedAt: Timestamp;
}