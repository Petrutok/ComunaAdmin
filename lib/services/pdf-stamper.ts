/**
 * PDF Stamping Service
 * Applies registration stamps to PDF documents
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generateRegistrationStamp, StampConfig, StampOptions } from './stamp-generator';

export type StampPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PdfStampOptions {
  position?: StampPosition; // Default: top-right
  stampOptions?: StampOptions;
  margin?: number; // Margin from edges (default: 20)
  opacity?: number; // Stamp opacity 0-1 (default: 1)
  allPages?: boolean; // Stamp all pages or just first page (default: false - first page only)
}

export interface StampResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pageCount?: number;
  error?: string;
}

/**
 * Applies a registration stamp to a PDF document
 * @param pdfBuffer - Original PDF buffer
 * @param stampConfig - Configuration for stamp content
 * @param options - Positioning and visual options
 * @returns Stamped PDF buffer
 */
export async function stampPdf(
  pdfBuffer: Buffer,
  stampConfig: StampConfig,
  options: PdfStampOptions = {}
): Promise<StampResult> {
  try {
    // Default options
    const position = options.position || 'top-right';
    const margin = options.margin || 20;
    const opacity = options.opacity !== undefined ? options.opacity : 1;
    const allPages = options.allPages || false;

    // Generate stamp image
    const stampImageBuffer = await generateRegistrationStamp(
      stampConfig,
      options.stampOptions
    );

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Embed stamp image
    const stampImage = await pdfDoc.embedPng(stampImageBuffer);
    const stampDims = stampImage.scale(1);

    // Determine which pages to stamp
    const pages = pdfDoc.getPages();
    const pagesToStamp = allPages ? pages : [pages[0]];

    // Apply stamp to selected pages
    for (const page of pagesToStamp) {
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Calculate position based on option
      let x: number;
      let y: number;

      switch (position) {
        case 'top-left':
          x = margin;
          y = pageHeight - stampDims.height - margin;
          break;
        case 'top-right':
          x = pageWidth - stampDims.width - margin;
          y = pageHeight - stampDims.height - margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-right':
          x = pageWidth - stampDims.width - margin;
          y = margin;
          break;
      }

      // Draw stamp
      page.drawImage(stampImage, {
        x,
        y,
        width: stampDims.width,
        height: stampDims.height,
        opacity,
      });
    }

    // Save modified PDF
    const pdfBytes = await pdfDoc.save();

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
    };
  } catch (error) {
    console.error('Error stamping PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Adds a text watermark to a PDF (alternative to image stamp)
 * @param pdfBuffer - Original PDF buffer
 * @param text - Watermark text
 * @param options - Positioning options
 * @returns Watermarked PDF buffer
 */
export async function addTextWatermark(
  pdfBuffer: Buffer,
  text: string,
  options: {
    position?: StampPosition;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
    opacity?: number;
    allPages?: boolean;
  } = {}
): Promise<StampResult> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = options.fontSize || 12;
    const color = options.color || { r: 0.12, g: 0.25, b: 0.69 }; // Blue
    const opacity = options.opacity !== undefined ? options.opacity : 0.5;
    const allPages = options.allPages || false;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    const pages = pdfDoc.getPages();
    const pagesToMark = allPages ? pages : [pages[0]];

    for (const page of pagesToMark) {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const margin = 20;

      let x: number;
      let y: number;

      switch (options.position || 'top-right') {
        case 'top-left':
          x = margin;
          y = pageHeight - textHeight - margin;
          break;
        case 'top-right':
          x = pageWidth - textWidth - margin;
          y = pageHeight - textHeight - margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-right':
          x = pageWidth - textWidth - margin;
          y = margin;
          break;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
    };
  } catch (error) {
    console.error('Error adding watermark:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merges multiple PDFs into one document
 * @param pdfBuffers - Array of PDF buffers
 * @returns Merged PDF buffer
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<StampResult> {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      pageCount: mergedPdf.getPageCount(),
    };
  } catch (error) {
    console.error('Error merging PDFs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets information about a PDF document
 * @param pdfBuffer - PDF buffer
 * @returns PDF metadata
 */
export async function getPdfInfo(pdfBuffer: Buffer): Promise<{
  success: boolean;
  pageCount?: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  error?: string;
}> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    return {
      success: true,
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle() || undefined,
      author: pdfDoc.getAuthor() || undefined,
      subject: pdfDoc.getSubject() || undefined,
      creator: pdfDoc.getCreator() || undefined,
    };
  } catch (error) {
    console.error('Error reading PDF info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
