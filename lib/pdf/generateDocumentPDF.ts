import { RegistruDocument, TipDocument } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG } from '@/types/registru';

/**
 * Generates a PDF document from a registry entry
 * Uses jsPDF library to create a professional document
 */

export async function generateDocumentPDF(document: RegistruDocument): Promise<Blob> {
  // Dynamically import jsPDF to avoid build issues
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Set default font
  pdf.setFont('Courier', 'normal');
  pdf.setTextColor(0, 0, 0);

  // HEADER
  pdf.setFont('Courier', 'bold');
  pdf.setFontSize(14);
  pdf.text('PRIMĂRIA DIGITALĂ', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('Courier', 'normal');
  pdf.text('Document Oficial', margin, yPosition);
  yPosition += 15;

  // Registration info box
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25);

  pdf.setFont('Courier', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Nr. Înregistrare: ${document.numarInregistrare}`, margin + 5, yPosition + 8);

  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Data: ${formatDateForPDF(document.dataInregistrare)}`, margin + 5, yPosition + 16);

  const docTypeConfig = TIP_DOCUMENT_CONFIG[document.tipDocument];
  pdf.text(`Tip: ${docTypeConfig.label}`, margin + 5, yPosition + 24);

  yPosition += 32;

  // Document title
  pdf.setFont('Courier', 'bold');
  pdf.setFontSize(12);
  const titleText = docTypeConfig.label;
  const titleX = pageWidth / 2;
  pdf.text(titleText, titleX, yPosition, { align: 'center' });
  yPosition += 12;

  // Address to
  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(10);
  pdf.text('Către:', margin, yPosition);
  yPosition += 6;

  pdf.setFont('Courier', 'bold');
  pdf.text(document.destinatar, margin + 5, yPosition);
  yPosition += 6;

  if (document.adresaDestinatar) {
    pdf.setFont('Courier', 'normal');
    pdf.text(document.adresaDestinatar, margin + 5, yPosition);
    yPosition += 6;
  }
  yPosition += 5;

  // Content
  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(10);

  // Split content into lines that fit the page width
  const contentLines = pdf.splitTextToSize(
    document.continut,
    pageWidth - 2 * margin - 5
  );

  contentLines.forEach((line: string) => {
    if (yPosition > pageHeight - margin - 10) {
      pdf.addPage();
      yPosition = margin;
    }
    pdf.text(line, margin + 5, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Signature section
  if (yPosition > pageHeight - margin - 30) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(9);
  pdf.text('De la:', margin, yPosition);
  yPosition += 6;

  pdf.setFont('Courier', 'bold');
  pdf.text(document.emitent, margin + 5, yPosition);
  yPosition += 6;

  if (document.adresaEmitent) {
    pdf.setFont('Courier', 'normal');
    pdf.text(document.adresaEmitent, margin + 5, yPosition);
    yPosition += 6;
  }

  if (document.emailEmitent) {
    pdf.text(document.emailEmitent, margin + 5, yPosition);
    yPosition += 6;
  }

  yPosition += 15;

  // Signature line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPosition, margin + 40, yPosition);
  yPosition += 3;

  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(8);
  pdf.text('Semnătura', margin + 10, yPosition);

  // Footer
  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Document generat de Primăria Digitală - ${new Date().toLocaleDateString('ro-RO')}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  // Return as blob
  return pdf.output('blob');
}

/**
 * Formats a Firestore timestamp for display in PDF
 */
function formatDateForPDF(timestamp: any): string {
  if (!timestamp) return 'N/A';

  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Initiates download of a PDF document
 */
export async function downloadDocumentPDF(documentData: RegistruDocument): Promise<void> {
  try {
    const pdfBlob = await generateDocumentPDF(documentData);
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentData.numarInregistrare}.pdf`;
    if (typeof window !== 'undefined' && document.body) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Saves a PDF to Firebase Storage
 */
export async function savePDFToFirebase(
  documentData: RegistruDocument,
  storagePath: string
): Promise<string> {
  // This would require Firebase Storage integration
  // For now, just generate the blob
  const pdfBlob = await generateDocumentPDF(documentData);
  return `Generated ${pdfBlob.size} bytes`;
}
