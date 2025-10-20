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
}

export interface EmailAttachment {
  fileName: string; // Original filename
  downloadURL: string; // Firebase Storage URL
  fileSize: number; // Size in bytes
  fileType: string; // MIME type (e.g., 'application/pdf')
  uploadedAt: Timestamp; // Upload timestamp
}

export type EmailStatus = 'nou' | 'in_lucru' | 'rezolvat' | 'respins';

export interface RegistraturaCounter {
  year: number;
  lastNumber: number;
  updatedAt: Timestamp;
}