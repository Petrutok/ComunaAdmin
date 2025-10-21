/**
 * Document Processing Service
 * Main integration service for processing registratura documents
 * Converts files to PDF, generates stamps, and applies them
 */

import { convertToPdf, isConvertibleToPdf } from './file-to-pdf-converter';
import { stampPdf, StampPosition, getPdfInfo } from './pdf-stamper';
import { StampConfig } from './stamp-generator';
import { mergePdfs } from './pdf-merger';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface DocumentProcessingOptions {
  registrationNumber: string;
  dateReceived: Date;
  organizationName?: string;
  departmentName?: string;
  trackingUrl?: string;
  senderName?: string; // Sender's name for stamp
  senderEmail?: string; // Sender's email for stamp
  stampPosition?: StampPosition;
  stampAllPages?: boolean;
  uploadToStorage?: boolean; // Upload processed PDF to Firebase Storage
  storagePath?: string; // Custom storage path (default: registratura/processed/{registrationNumber})
}

export interface ProcessingResult {
  success: boolean;
  originalFileName: string;
  processedPdfBuffer?: Buffer;
  downloadURL?: string; // Firebase Storage URL if uploaded
  fileSize?: number;
  pageCount?: number;
  wasConverted: boolean; // True if file was converted from another format
  wasStamped: boolean; // True if stamp was applied
  error?: string;
  storagePath?: string;
}

/**
 * Processes a single document attachment
 * - Converts to PDF if needed
 * - Applies registration stamp
 * - Optionally uploads to Firebase Storage
 *
 * @param fileBuffer - Original file buffer
 * @param fileName - Original file name
 * @param fileType - MIME type
 * @param options - Processing options
 * @returns Processing result
 */
export async function processDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  options: DocumentProcessingOptions
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    originalFileName: fileName,
    wasConverted: false,
    wasStamped: false,
  };

  try {
    // Step 1: Convert to PDF if needed
    let pdfBuffer: Buffer;
    let wasConverted = false;

    if (!isConvertibleToPdf(fileType)) {
      result.error = `File type ${fileType} cannot be converted to PDF`;
      return result;
    }

    if (fileType !== 'application/pdf') {
      console.log(`[DocumentProcessor] Converting ${fileName} (${fileType}) to PDF`);
      const conversionResult = await convertToPdf(fileBuffer, fileType, fileName);

      if (!conversionResult.success) {
        result.error = `Conversion failed: ${conversionResult.error}`;
        return result;
      }

      pdfBuffer = conversionResult.pdfBuffer;
      wasConverted = true;
      result.pageCount = conversionResult.pageCount;
    } else {
      pdfBuffer = fileBuffer;
      // Get page count for existing PDFs
      const pdfInfo = await getPdfInfo(pdfBuffer);
      if (pdfInfo.success) {
        result.pageCount = pdfInfo.pageCount;
      }
    }

    result.wasConverted = wasConverted;

    // Step 2: Generate and apply stamp
    console.log(`[DocumentProcessor] Stamping ${fileName} with ${options.registrationNumber}`);

    const stampConfig: StampConfig = {
      registrationNumber: options.registrationNumber,
      dateReceived: options.dateReceived,
      organizationName: options.organizationName,
      departmentName: options.departmentName,
      trackingUrl: options.trackingUrl,
      senderName: options.senderName,
      senderEmail: options.senderEmail,
    };

    const stampResult = await stampPdf(pdfBuffer, stampConfig, {
      position: options.stampPosition || 'top-right',
      allPages: options.stampAllPages || false,
      stampOptions: {
        width: 180,
        height: 100,
      },
    });

    if (!stampResult.success) {
      result.error = `Stamping failed: ${stampResult.error}`;
      return result;
    }

    result.processedPdfBuffer = stampResult.pdfBuffer!;
    result.wasStamped = true;
    result.fileSize = stampResult.pdfBuffer!.length;
    if (stampResult.pageCount) {
      result.pageCount = stampResult.pageCount;
    }

    // Step 3: Upload to Firebase Storage (optional)
    if (options.uploadToStorage) {
      console.log(`[DocumentProcessor] Uploading processed ${fileName} to Storage`);

      const storagePath = options.storagePath ||
        `registratura/processed/${options.registrationNumber}/${fileName.replace(/\.[^/.]+$/, '')}.pdf`;

      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, result.processedPdfBuffer, {
        contentType: 'application/pdf',
        customMetadata: {
          originalFileName: fileName,
          originalFileType: fileType,
          registrationNumber: options.registrationNumber,
          wasConverted: wasConverted.toString(),
          processedAt: new Date().toISOString(),
        },
      });

      const downloadURL = await getDownloadURL(storageRef);
      result.downloadURL = downloadURL;
      result.storagePath = storagePath;
    }

    result.success = true;
    return result;

  } catch (error) {
    console.error('[DocumentProcessor] Error processing document:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Processes multiple document attachments in batch
 * @param files - Array of file data
 * @param options - Processing options (same for all files)
 * @returns Array of processing results
 */
export async function processDocumentBatch(
  files: Array<{
    buffer: Buffer;
    fileName: string;
    fileType: string;
  }>,
  options: DocumentProcessingOptions
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const file of files) {
    const result = await processDocument(
      file.buffer,
      file.fileName,
      file.fileType,
      options
    );
    results.push(result);
  }

  return results;
}

/**
 * Fetches a file from Firebase Storage and processes it
 * @param downloadURL - Firebase Storage download URL
 * @param fileName - File name
 * @param fileType - MIME type
 * @param options - Processing options
 * @returns Processing result
 */
export async function processStorageFile(
  downloadURL: string,
  fileName: string,
  fileType: string,
  options: DocumentProcessingOptions
): Promise<ProcessingResult> {
  try {
    // Fetch file from URL
    const response = await fetch(downloadURL);
    if (!response.ok) {
      return {
        success: false,
        originalFileName: fileName,
        wasConverted: false,
        wasStamped: false,
        error: `Failed to fetch file: ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return processDocument(buffer, fileName, fileType, options);
  } catch (error) {
    console.error('[DocumentProcessor] Error fetching storage file:', error);
    return {
      success: false,
      originalFileName: fileName,
      wasConverted: false,
      wasStamped: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility function to generate tracking URL for QR code
 * @param registrationNumber - Registration number
 * @param baseUrl - Base URL of the application
 * @returns Full tracking URL
 */
export function generateTrackingUrl(
  registrationNumber: string,
  baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital'
): string {
  return `${baseUrl}/registratura/track/${encodeURIComponent(registrationNumber)}`;
}

/**
 * Gets summary statistics for processing results
 * @param results - Array of processing results
 * @returns Summary statistics
 */
export function getProcessingSummary(results: ProcessingResult[]): {
  total: number;
  successful: number;
  failed: number;
  converted: number;
  stamped: number;
  totalSize: number;
  errors: string[];
} {
  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    converted: results.filter(r => r.wasConverted).length,
    stamped: results.filter(r => r.wasStamped).length,
    totalSize: results.reduce((sum, r) => sum + (r.fileSize || 0), 0),
    errors: results.filter(r => r.error).map(r => `${r.originalFileName}: ${r.error}`),
  };
}

/**
 * Processes multiple attachments and merges them into a single stamped PDF
 * This is the main function for creating official documents from email attachments
 *
 * @param files - Array of file data (buffers, names, types)
 * @param options - Processing options (same for all files)
 * @returns Processing result with merged PDF
 */
export async function processAndMergeDocuments(
  files: Array<{
    buffer: Buffer;
    fileName: string;
    fileType: string;
  }>,
  options: DocumentProcessingOptions
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    originalFileName: 'document-oficial.pdf',
    wasConverted: false,
    wasStamped: false,
  };

  try {
    if (files.length === 0) {
      result.error = 'No files provided';
      return result;
    }

    console.log(`[DocumentProcessor] Processing and merging ${files.length} files for ${options.registrationNumber}`);

    const pdfBuffers: Buffer[] = [];
    const skippedFiles: string[] = [];
    let anyConverted = false;

    // Step 1: Convert all files to PDF
    for (const file of files) {
      if (!isConvertibleToPdf(file.fileType)) {
        console.warn(`[DocumentProcessor] Skipping unsupported file type: ${file.fileName} (${file.fileType})`);
        skippedFiles.push(file.fileName);
        continue;
      }

      let pdfBuffer: Buffer;

      if (file.fileType !== 'application/pdf') {
        console.log(`[DocumentProcessor] Converting ${file.fileName} (${file.fileType}) to PDF`);
        const conversionResult = await convertToPdf(file.buffer, file.fileType, file.fileName);

        if (!conversionResult.success) {
          console.error(`[DocumentProcessor] Failed to convert ${file.fileName}: ${conversionResult.error}`);
          skippedFiles.push(file.fileName);
          continue;
        }

        pdfBuffer = conversionResult.pdfBuffer;
        anyConverted = true;
      } else {
        pdfBuffer = file.buffer;
      }

      pdfBuffers.push(pdfBuffer);
    }

    if (pdfBuffers.length === 0) {
      result.error = `No convertible files found. Skipped: ${skippedFiles.join(', ')}`;
      return result;
    }

    console.log(`[DocumentProcessor] Successfully converted ${pdfBuffers.length}/${files.length} files to PDF`);
    result.wasConverted = anyConverted;

    // Step 2: Merge all PDFs into one
    console.log(`[DocumentProcessor] Merging ${pdfBuffers.length} PDF documents`);
    const mergeResult = await mergePdfs(pdfBuffers);

    if (!mergeResult.success) {
      result.error = `PDF merge failed: ${mergeResult.error}`;
      return result;
    }

    result.pageCount = mergeResult.pageCount;
    console.log(`[DocumentProcessor] ✓ Merged into ${result.pageCount} pages`);

    // Step 3: Apply registration stamp to first page
    console.log(`[DocumentProcessor] Applying registration stamp to first page`);

    const stampConfig: StampConfig = {
      registrationNumber: options.registrationNumber,
      dateReceived: options.dateReceived,
      organizationName: options.organizationName,
      departmentName: options.departmentName,
      trackingUrl: options.trackingUrl,
      senderName: options.senderName,
      senderEmail: options.senderEmail,
    };

    const stampResult = await stampPdf(mergeResult.pdfBuffer!, stampConfig, {
      position: options.stampPosition || 'top-right',
      allPages: false, // Only stamp first page for official document
      stampOptions: {
        width: 180,
        height: 100,
      },
    });

    if (!stampResult.success) {
      result.error = `Stamping failed: ${stampResult.error}`;
      return result;
    }

    result.processedPdfBuffer = stampResult.pdfBuffer!;
    result.wasStamped = true;
    result.fileSize = stampResult.pdfBuffer!.length;
    if (stampResult.pageCount) {
      result.pageCount = stampResult.pageCount;
    }

    console.log(`[DocumentProcessor] ✓ Applied registration stamp`);

    // Step 4: Upload to Firebase Storage (optional)
    if (options.uploadToStorage) {
      console.log(`[DocumentProcessor] Uploading official document to Storage`);

      const storagePath = options.storagePath ||
        `registratura/processed/${options.registrationNumber}/document-oficial.pdf`;

      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, result.processedPdfBuffer, {
        contentType: 'application/pdf',
        customMetadata: {
          registrationNumber: options.registrationNumber,
          sourceFileCount: files.length.toString(),
          convertedFileCount: pdfBuffers.length.toString(),
          skippedFiles: skippedFiles.join(', '),
          processedAt: new Date().toISOString(),
          senderName: options.senderName || '',
          senderEmail: options.senderEmail || '',
        },
      });

      const downloadURL = await getDownloadURL(storageRef);
      result.downloadURL = downloadURL;
      result.storagePath = storagePath;

      console.log(`[DocumentProcessor] ✓ Uploaded to ${storagePath}`);
    }

    result.success = true;
    console.log(`[DocumentProcessor] ✓ Successfully created official document for ${options.registrationNumber}`);

    if (skippedFiles.length > 0) {
      console.warn(`[DocumentProcessor] Note: ${skippedFiles.length} file(s) were skipped: ${skippedFiles.join(', ')}`);
    }

    return result;

  } catch (error) {
    console.error('[DocumentProcessor] Error in processAndMergeDocuments:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}
