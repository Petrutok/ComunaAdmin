// Client-side helpers for citizen file attachments, shared by the cereri
// form and the "completare documente" flow in Dosarul meu.
//
// Vercel caps the request body at 4.5MB; base64 adds ~33%, so raw
// attachments must stay under ~3MB in total (same limit as the server).

export const MAX_ATTACHMENT_FILES = 3;
export const MAX_TOTAL_FILE_BYTES = 3 * 1024 * 1024;

// Downscale phone photos so they fit the upload limit
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.8)
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

// Compress images over ~1MB; files the browser can't decode stay as-is
// (the size check decides their fate)
export async function processSelectedFiles(files: File[]): Promise<File[]> {
  const processed: File[] = [];
  for (const file of files) {
    let f = file;
    if (f.type.startsWith('image/') && f.size > 1024 * 1024) {
      try {
        f = await compressImage(f);
      } catch {
        // keep the original
      }
    }
    processed.push(f);
  }
  return processed;
}

export function totalSize(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

// Read a file as base64 (without the data: prefix), with a timeout
export function fileToBase64(file: File, timeoutMs = 10000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const timeout = setTimeout(() => {
      reject(new Error('Timeout la citirea fișierului'));
    }, timeoutMs);
    reader.onload = () => {
      clearTimeout(timeout);
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}
