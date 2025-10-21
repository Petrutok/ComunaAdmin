/**
 * File to PDF Conversion Service
 * Converts various file formats to PDF format
 */

import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';

export interface ConversionResult {
  pdfBuffer: Buffer;
  pageCount: number;
  success: boolean;
  error?: string;
}

/**
 * Converts an image file to PDF
 * @param imageBuffer - Image file buffer
 * @param fileType - MIME type (image/jpeg, image/png, etc.)
 * @returns PDF buffer
 */
export async function imageToPdf(
  imageBuffer: Buffer,
  fileType: string
): Promise<ConversionResult> {
  try {
    const pdfDoc = await PDFDocument.create();

    // Load image based on type
    let image;
    if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (fileType === 'image/png') {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      // For other image types, try to convert using canvas
      const img = await loadImage(imageBuffer);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img as any, 0, 0);
      const pngBuffer = canvas.toBuffer('image/png');
      image = await pdfDoc.embedPng(pngBuffer);
    }

    // Calculate page size to fit image
    const { width, height } = image.scale(1);
    const maxWidth = PageSizes.A4[0];
    const maxHeight = PageSizes.A4[1];

    let pageWidth = width;
    let pageHeight = height;

    // Scale down if larger than A4
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const scale = Math.min(widthRatio, heightRatio);
      pageWidth = width * scale;
      pageHeight = height * scale;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBuffer: Buffer.from(pdfBytes),
      pageCount: 1,
      success: true,
    };
  } catch (error) {
    console.error('Error converting image to PDF:', error);
    return {
      pdfBuffer: Buffer.from([]),
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a PDF from text content
 * @param text - Text content
 * @param fileName - Original file name (for title)
 * @returns PDF buffer
 */
export async function textToPdf(
  text: string,
  fileName: string
): Promise<ConversionResult> {
  try {
    const pdfDoc = await PDFDocument.create();
    const fontSize = 11;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const pageWidth = PageSizes.A4[0];
    const pageHeight = PageSizes.A4[1];
    const textWidth = pageWidth - 2 * margin;

    let currentPage = pdfDoc.addPage(PageSizes.A4);
    let currentY = pageHeight - margin;

    // Title
    currentPage.drawText(fileName, {
      x: margin,
      y: currentY,
      size: 14,
      color: rgb(0, 0, 0),
    });
    currentY -= 30;

    // Split text into lines that fit within page width
    const lines = text.split('\n');
    const wrappedLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        wrappedLines.push('');
        continue;
      }

      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        // Rough estimation: average char width is ~6 pixels at font size 11
        const estimatedWidth = testLine.length * (fontSize * 0.5);

        if (estimatedWidth > textWidth) {
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    // Draw wrapped lines
    for (const line of wrappedLines) {
      if (currentY < margin) {
        // Create new page
        currentPage = pdfDoc.addPage(PageSizes.A4);
        currentY = pageHeight - margin;
      }

      currentPage.drawText(line || ' ', {
        x: margin,
        y: currentY,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      currentY -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBuffer: Buffer.from(pdfBytes),
      pageCount: pdfDoc.getPageCount(),
      success: true,
    };
  } catch (error) {
    console.error('Error converting text to PDF:', error);
    return {
      pdfBuffer: Buffer.from([]),
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main conversion function that routes to appropriate converter
 * @param fileBuffer - File buffer
 * @param fileType - MIME type
 * @param fileName - Original file name
 * @returns Conversion result
 */
export async function convertToPdf(
  fileBuffer: Buffer,
  fileType: string,
  fileName: string
): Promise<ConversionResult> {
  // Already a PDF
  if (fileType === 'application/pdf') {
    return {
      pdfBuffer: fileBuffer,
      pageCount: 1, // We don't know exact count without parsing
      success: true,
    };
  }

  // Image files
  if (fileType.startsWith('image/')) {
    return imageToPdf(fileBuffer, fileType);
  }

  // Text files
  if (
    fileType === 'text/plain' ||
    fileType === 'text/html' ||
    fileType === 'text/csv' ||
    fileType.startsWith('text/')
  ) {
    const text = fileBuffer.toString('utf-8');
    return textToPdf(text, fileName);
  }

  // Unsupported file type
  return {
    pdfBuffer: Buffer.from([]),
    pageCount: 0,
    success: false,
    error: `Unsupported file type: ${fileType}. Supported types: PDF, images (JPEG, PNG, etc.), and text files.`,
  };
}

/**
 * Checks if a file type can be converted to PDF
 * @param fileType - MIME type
 * @returns True if convertible
 */
export function isConvertibleToPdf(fileType: string): boolean {
  return (
    fileType === 'application/pdf' ||
    fileType.startsWith('image/') ||
    fileType.startsWith('text/')
  );
}
