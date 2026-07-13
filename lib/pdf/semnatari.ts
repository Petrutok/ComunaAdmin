// lib/pdf/semnatari.ts
// Shared signature-block renderer for issued documents (adeverinte,
// raspunsuri). Renders up to three blocks, matching the real circuit of
// an outgoing document in a Romanian town hall:
//
//   PRIMAR,            SECRETAR GENERAL,          [QR verificare]
//   <nume>             <nume>
//   [semnatura]        [semnatura]
//
//   Intocmit: <responsabil> [semnatura]
//
// Secretar and intocmit are optional: blocks render only when a name is
// present, so documents degrade gracefully to the old primar-only layout.

import type { jsPDF } from 'jspdf';

export interface SemnatarInfo {
  nume: string;
  semnaturaPngDataUrl?: string | null;
}

export interface SemnatariInput {
  primar: SemnatarInfo;
  secretar?: SemnatarInfo | null;
  intocmit?: SemnatarInfo | null;
}

export function renderSemnatari(
  pdf: jsPDF,
  semnatari: SemnatariInput,
  opts: {
    sigY: number;
    margin: number;
    pageWidth: number;
    clean: (s: string) => string; // the generator's removeDiacritics
  }
): void {
  const { sigY, margin, pageWidth, clean } = opts;

  const block = (functie: string, s: SemnatarInfo, centerX: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(clean(functie), centerX, sigY, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(clean(s.nume), centerX, sigY + 6, { align: 'center' });
    if (s.semnaturaPngDataUrl) {
      try {
        pdf.addImage(s.semnaturaPngDataUrl, 'PNG', centerX - 18, sigY + 8, 36, 20);
      } catch (error) {
        console.error('[PDF] Failed to embed signature image:', error);
      }
    }
  };

  block('PRIMAR,', semnatari.primar, margin + 20);

  if (semnatari.secretar?.nume) {
    // Centered between primar (left) and the QR code (right)
    block('SECRETAR GENERAL,', semnatari.secretar, pageWidth / 2);
  }

  if (semnatari.intocmit?.nume) {
    const intY = sigY + 36;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const label = clean(`Intocmit: ${semnatari.intocmit.nume}`);
    pdf.text(label, margin, intY);
    if (semnatari.intocmit.semnaturaPngDataUrl) {
      try {
        pdf.addImage(
          semnatari.intocmit.semnaturaPngDataUrl,
          'PNG',
          margin + pdf.getTextWidth(label) + 4,
          intY - 8,
          24,
          12
        );
      } catch (error) {
        console.error('[PDF] Failed to embed intocmit signature image:', error);
      }
    }
  }
}
