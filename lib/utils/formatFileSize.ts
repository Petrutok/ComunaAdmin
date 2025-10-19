/**
 * Format file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get file icon name based on MIME type or file extension
 * @param fileType - MIME type (e.g., 'application/pdf')
 * @param fileName - Original filename (optional, for fallback)
 * @returns Icon identifier for lucide-react
 */
export function getFileIcon(fileType: string, fileName?: string): string {
  // Check MIME type first
  if (fileType.includes('pdf')) return 'FileText';
  if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('document')) return 'FileText';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Sheet';
  if (fileType.includes('image')) return 'Image';
  if (fileType.includes('video')) return 'Video';
  if (fileType.includes('audio')) return 'Music';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('compressed')) return 'Archive';
  if (fileType.includes('text')) return 'FileText';

  // Fallback to file extension if MIME type is generic
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'FileText';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) return 'FileText';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'Sheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return 'Image';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext || '')) return 'Video';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) return 'Music';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'Archive';
  }

  // Default fallback
  return 'File';
}

/**
 * Get file type color for badges
 * @param fileType - MIME type
 * @returns Tailwind color class
 */
export function getFileTypeColor(fileType: string): string {
  if (fileType.includes('pdf')) return 'text-red-400';
  if (fileType.includes('word') || fileType.includes('document')) return 'text-blue-400';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'text-green-400';
  if (fileType.includes('image')) return 'text-purple-400';
  if (fileType.includes('video')) return 'text-pink-400';
  if (fileType.includes('audio')) return 'text-yellow-400';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'text-orange-400';
  return 'text-gray-400';
}
