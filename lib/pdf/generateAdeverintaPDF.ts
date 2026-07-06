// lib/pdf/generateAdeverintaPDF.ts
// Server-side generator for issued certificates (adeverinte).
// Follows the app convention: jsPDF + removeDiacritics (standard fonts
// don't embed Romanian diacritics).

import { jsPDF } from 'jspdf';

export interface AdeverintaPdfInput {
  numarIesire: string;        // ex: REG-2026-000042 (numar de iesire)
  dataEmiterii: Date;
  tipLabel: string;           // ex: "Adeverinta de rol agricol"
  body: string;               // certificate text, completed by the clerk
  numeComplet: string;
  primarNume: string;         // who signs
  localitate: string;         // header line, ex: "PRIMARIA COMUNEI FILIPESTI"
  judet: string;              // ex: "Judetul Bacau"
  semnaturaPngDataUrl?: string | null; // scanned signature+stamp image
  qrPngDataUrl: string;       // verification QR code
  verifyUrl: string;
}

function removeDiacritics(str: string): string {
  return str
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ş/g, 's').replace(/ț/g, 't').replace(/ţ/g, 't')
    .replace(/Ă/g, 'A').replace(/Â/g, 'A').replace(/Î/g, 'I')
    .replace(/Ș/g, 'S').replace(/Ş/g, 'S').replace(/Ț/g, 'T').replace(/Ţ/g, 'T');
}

export function generateAdeverintaPDF(input: AdeverintaPdfInput): Buffer {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // --- Antet
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(removeDiacritics('ROMANIA'), pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(removeDiacritics(input.judet.toUpperCase()), pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.setFontSize(14);
  pdf.text(removeDiacritics(input.localitate.toUpperCase()), pageWidth / 2, y, { align: 'center' });
  y += 5;
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Numar de iesire + data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const dataStr = input.dataEmiterii.toLocaleDateString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  pdf.text(removeDiacritics(`Nr. iesire: ${input.numarIesire}`), margin, y);
  pdf.text(removeDiacritics(`Data: ${dataStr}`), pageWidth - margin, y, { align: 'right' });
  y += 16;

  // --- Titlu
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(removeDiacritics('ADEVERINTA'), pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'italic');
  pdf.text(removeDiacritics(input.tipLabel), pageWidth / 2, y, { align: 'center' });
  y += 14;

  // --- Corp
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const paragraphs = removeDiacritics(input.body).split('\n');
  for (const para of paragraphs) {
    if (para.trim() === '') {
      y += 4;
      continue;
    }
    const lines = pdf.splitTextToSize(para, contentWidth);
    for (const line of lines) {
      if (y > 230) break; // keep room for signature block
      pdf.text(line, margin, y);
      y += 6;
    }
  }

  // --- Semnatura
  const sigY = Math.max(y + 14, 218);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('PRIMAR,', margin + 20, sigY, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(removeDiacritics(input.primarNume), margin + 20, sigY + 6, { align: 'center' });

  if (input.semnaturaPngDataUrl) {
    try {
      pdf.addImage(input.semnaturaPngDataUrl, 'PNG', margin + 2, sigY + 8, 36, 20);
    } catch (error) {
      console.error('[AdeverintaPDF] Failed to embed signature image:', error);
    }
  }

  // --- QR de verificare
  const qrSize = 28;
  const qrX = pageWidth - margin - qrSize;
  try {
    pdf.addImage(input.qrPngDataUrl, 'PNG', qrX, sigY - 2, qrSize, qrSize);
  } catch (error) {
    console.error('[AdeverintaPDF] Failed to embed QR code:', error);
  }
  pdf.setFontSize(7);
  pdf.text(removeDiacritics('Verificati autenticitatea'), qrX + qrSize / 2, sigY + qrSize + 2, { align: 'center' });
  pdf.text(removeDiacritics('scanand codul QR'), qrX + qrSize / 2, sigY + qrSize + 5, { align: 'center' });

  // --- Footer
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(
    removeDiacritics(
      `Document emis electronic prin platforma Primaria Digitala. Autenticitatea poate fi verificata la: ${input.verifyUrl}`
    ),
    pageWidth / 2,
    285,
    { align: 'center', maxWidth: contentWidth }
  );

  return Buffer.from(pdf.output('arraybuffer'));
}
