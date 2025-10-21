/**
 * PDF Merger Service
 * Merges multiple PDF buffers into a single PDF document
 */

import { PDFDocument } from 'pdf-lib';

export interface MergeResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pageCount?: number;
  error?: string;
}

/**
 * Merges multiple PDF buffers into a single PDF
 * @param pdfBuffers - Array of PDF buffers to merge
 * @returns Merge result with combined PDF buffer
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<MergeResult> {
  try {
    if (pdfBuffers.length === 0) {
      return {
        success: false,
        error: 'No PDFs to merge'
      };
    }

    // If only one PDF, return it directly
    if (pdfBuffers.length === 1) {
      const pdf = await PDFDocument.load(pdfBuffers[0]);
      return {
        success: true,
        pdfBuffer: pdfBuffers[0],
        pageCount: pdf.getPageCount(),
      };
    }

    console.log(`[PDF Merger] Merging ${pdfBuffers.length} PDF documents`);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Iterate through each PDF buffer
    for (let i = 0; i < pdfBuffers.length; i++) {
      try {
        const pdf = await PDFDocument.load(pdfBuffers[i]);
        const pageCount = pdf.getPageCount();

        console.log(`[PDF Merger] Adding PDF ${i + 1}/${pdfBuffers.length} (${pageCount} pages)`);

        // Copy all pages from current PDF
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        // Add each copied page to merged PDF
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      } catch (error) {
        console.error(`[PDF Merger] Failed to merge PDF ${i + 1}:`, error);
        // Continue with other PDFs even if one fails
        continue;
      }
    }

    // Check if we have any pages
    const totalPages = mergedPdf.getPageCount();
    if (totalPages === 0) {
      return {
        success: false,
        error: 'No pages could be merged from provided PDFs',
      };
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const mergedBuffer = Buffer.from(mergedPdfBytes);

    console.log(`[PDF Merger] ✓ Successfully merged into ${totalPages} pages (${mergedBuffer.length} bytes)`);

    return {
      success: true,
      pdfBuffer: mergedBuffer,
      pageCount: totalPages,
    };
  } catch (error) {
    console.error('[PDF Merger] Error merging PDFs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validates if a buffer is a valid PDF
 * @param buffer - Buffer to validate
 * @returns True if valid PDF
 */
export async function isValidPdf(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets information about a PDF
 * @param buffer - PDF buffer
 * @returns PDF metadata
 */
export async function getPdfMetadata(buffer: Buffer): Promise<{
  success: boolean;
  pageCount?: number;
  title?: string;
  author?: string;
  error?: string;
}> {
  try {
    const pdf = await PDFDocument.load(buffer);

    return {
      success: true,
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle(),
      author: pdf.getAuthor(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
