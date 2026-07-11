// Server-side validation/decoding for citizen file attachments, shared
// by /api/trimite-cerere (initial submission) and /api/completeaza-cerere
// (documents added later at the clerk's request).
//
// Attachments arrive as base64 in the JSON body; Vercel caps the whole
// request at 4.5MB, so 3MB of raw file content is the practical maximum.

export const MAX_FILES = 3;
export const MAX_TOTAL_FILE_BYTES = 3 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'fisier';
  return base.replace(/[^\w.\-()\s]/g, '_').slice(0, 80);
}

export interface DecodedFile {
  name: string;
  type: string;
  buffer: Buffer;
}

export type DecodeFilesResult =
  | { ok: true; files: DecodedFile[] }
  | { ok: false; error: string; status: number };

export function validateAndDecodeFiles(input: unknown): DecodeFilesResult {
  const list = Array.isArray(input) ? input : [];
  if (list.length > MAX_FILES) {
    return { ok: false, error: `Maxim ${MAX_FILES} fișiere atașate`, status: 400 };
  }

  const files: DecodedFile[] = [];
  let totalBytes = 0;
  for (const f of list) {
    if (!f || typeof f.name !== 'string' || typeof f.content !== 'string' || !f.content) {
      return { ok: false, error: 'Fișier atașat invalid', status: 400 };
    }
    if (!ALLOWED_FILE_TYPES.has(f.type)) {
      return {
        ok: false,
        error: 'Tip de fișier neacceptat. Formate permise: PDF, JPG, PNG, DOC, DOCX.',
        status: 400,
      };
    }
    const buffer = Buffer.from(f.content, 'base64');
    if (buffer.length === 0) {
      return { ok: false, error: 'Fișier atașat invalid', status: 400 };
    }
    totalBytes += buffer.length;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) {
      return { ok: false, error: 'Fișierele atașate depășesc limita totală de 3MB', status: 413 };
    }
    files.push({ name: sanitizeFileName(f.name), type: f.type, buffer });
  }
  return { ok: true, files };
}
