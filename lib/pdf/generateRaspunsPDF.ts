// lib/pdf/generateRaspunsPDF.ts
// Server-side generator for official written responses (raspunsuri) to
// citizen requests. Follows the app convention: jsPDF + removeDiacritics
// (standard fonts don't embed Romanian diacritics).

import { jsPDF } from 'jspdf';
import { renderSemnatari, SemnatarInfo } from './semnatari';
import { drawAntet } from './antet';

export interface RaspunsPdfInput {
  numarIesire: string;        // ex: REG-2026-000042 (numar de iesire)
  dataEmiterii: Date;
  numarCerere?: string;       // incoming registration number being answered
  body: string;               // response text, completed by the clerk
  primarNume: string;         // who signs
  localitate: string;         // header line, ex: "PRIMARIA COMUNEI FILIPESTI"
  judet: string;              // ex: "Judetul Bacau"
  semnaturaPngDataUrl?: string | null; // primar's scanned signature+stamp image
  stemaDataUrl?: string | null;        // coat of arms for the letterhead
  // Optional extra signers (avizare circuit): rendered only when present
  secretar?: SemnatarInfo | null;
  intocmit?: SemnatarInfo | null;
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

export function generateRaspunsPDF(input: RaspunsPdfInput): Buffer {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // --- Antet oficial (stemă + identitate instituție)
  let y = drawAntet(pdf, {
    pageWidth,
    margin,
    stemaDataUrl: input.stemaDataUrl,
    antetOficial: input.localitate,
    judet: input.judet,
  });

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
  pdf.setFontSize(16);
  pdf.text(removeDiacritics('RASPUNS'), pageWidth / 2, y, { align: 'center' });
  y += 6;
  if (input.numarCerere) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      removeDiacritics(`la cererea nr. ${input.numarCerere}`),
      pageWidth / 2, y, { align: 'center' }
    );
    y += 6;
  }
  y += 8;

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

  // --- Semnaturi (primar + optional secretar/intocmit)
  const sigY = Math.max(y + 14, 218);
  renderSemnatari(
    pdf,
    {
      primar: { nume: input.primarNume, semnaturaPngDataUrl: input.semnaturaPngDataUrl },
      secretar: input.secretar,
      intocmit: input.intocmit,
    },
    { sigY, margin, pageWidth, clean: removeDiacritics }
  );

  // --- QR de verificare
  const qrSize = 28;
  const qrX = pageWidth - margin - qrSize;
  try {
    pdf.addImage(input.qrPngDataUrl, 'PNG', qrX, sigY - 2, qrSize, qrSize);
  } catch (error) {
    console.error('[RaspunsPDF] Failed to embed QR code:', error);
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
