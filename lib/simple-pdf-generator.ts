import jsPDF from 'jspdf';
import { TENANT } from '@/lib/tenant';
import { drawAntet, loadStemaDataUrl } from '@/lib/pdf/antet';
import { REQUEST_CONFIGS } from '@/lib/request-configs';
import type { RequestData } from '@/lib/request-configs';

// Data/type definitions moved to lib/request-configs.ts (jsPDF-free);
// re-exported here so existing server-side importers keep working.
export { REQUEST_CONFIGS };
export type { RequestData } from '@/lib/request-configs';


function removeDiacritics(str: string): string {
  return str
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T')
    .replace(/ă/g, 'a').replace(/ă/g, 'a')
    .replace(/ă/g, 'a').replace(/ă/g, 'a');
}

export async function generatePDF(data: RequestData): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 25;
  const lineHeight = 7;
  let yPosition = margin;

  const config = REQUEST_CONFIGS[data.tipCerere] || { 
    title: 'Cerere', 
    category: 'general',
    scopPlaceholder: 'Descrieți detaliat solicitarea...'
  };

  // Helper function pentru text wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number): number => {
    if (!text) return y;
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  // ANTET INSTITUȚIE (stemă + identitate instituție, per-tenant)
  const stemaDataUrl = await loadStemaDataUrl();
  yPosition = drawAntet(pdf, { pageWidth, margin, stemaDataUrl });

  // Număr înregistrare și dată
  pdf.setFontSize(10);
  const currentDate = new Date().toLocaleDateString('ro-RO', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  pdf.text(`Nr. ________ din data de ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // TITLU CERERE
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(removeDiacritics(config.title.toUpperCase()), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Formula de adresare (formatul clasic al unei petitii oficiale)
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(removeDiacritics('DOMNULE PRIMAR,'), margin, yPosition);
  yPosition += 10;

  // --- Paragraful principal: identificarea completa a solicitantului
  // si obiectul formal al cererii (REQUEST_CONFIGS[tip].obiect)
  let domiciliu = `jud. ${data.judet || '—'}, ${data.localitate || '—'}`;
  if (data.strada) domiciliu += `, str. ${data.strada}`;
  if (data.numar) domiciliu += ` nr. ${data.numar}`;
  if (data.bloc) domiciliu += `, bl. ${data.bloc}`;
  if (data.scara) domiciliu += `, sc. ${data.scara}`;
  if (data.apartament) domiciliu += `, ap. ${data.apartament}`;

  const contact: string[] = [];
  if (data.telefonMobil || data.telefon) contact.push(`telefon ${data.telefonMobil || data.telefon}`);
  if (data.email) contact.push(`e-mail ${data.email}`);

  const calitate = data.numeFirma
    ? `, in calitate de ${data.reprezentantLegal || 'reprezentant legal'} al ${data.numeFirma}${data.cui ? ` (CUI ${data.cui}` + (data.nrRegistruComert ? `, ${data.nrRegistruComert}` : '') + ')' : ''}`
    : '';

  const obiect = config.obiect || `solutionarea prezentei cereri (${config.title.toLowerCase()})`;

  const paragrafPrincipal =
    `Subsemnatul(a) ${data.numeComplet || '—'}, CNP ${data.cnp || '—'}, ` +
    `cu domiciliul in ${domiciliu}` +
    (contact.length ? `, ${contact.join(', ')}` : '') +
    `${calitate}, prin prezenta va solicit respectuos ${obiect}.`;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  yPosition = addWrappedText(removeDiacritics(paragrafPrincipal), margin, yPosition, pageWidth - 2 * margin);
  yPosition += 4;

  // --- Motivarea / detaliile cererii (textul cetateanului)
  if (data.scopulCererii && data.scopulCererii.trim()) {
    yPosition = addWrappedText(
      removeDiacritics(`In sustinerea cererii, precizez urmatoarele: ${data.scopulCererii.trim()}`),
      margin,
      yPosition,
      pageWidth - 2 * margin
    );
    yPosition += 4;
  }

  // --- Date tehnice specifice tipului de cerere
  const detalii: string[] = [];
  if (data.suprafataTeren) {
    detalii.push(
      `Terenul care face obiectul cererii are suprafata de ${data.suprafataTeren}` +
        (data.nrCadastral ? `, numar cadastral ${data.nrCadastral}` : '') +
        '.'
    );
  }
  if (data.tipConstructie || data.suprafataConstructie) {
    detalii.push(
      `Constructia vizata: ${data.tipConstructie || 'nespecificat'}` +
        (data.suprafataConstructie ? `, suprafata construita ${data.suprafataConstructie}` : '') +
        (data.anConstructie ? `, anul edificarii ${data.anConstructie}` : '') +
        '.'
    );
  }
  if (data.marcaAuto) {
    detalii.push(
      `Mijlocul de transport vizat: marca ${data.marcaAuto}` +
        (data.nrInmatriculare ? `, numar de inmatriculare ${data.nrInmatriculare}` : '') +
        (data.serieSasiu ? `, serie sasiu ${data.serieSasiu}` : '') +
        (data.anFabricatie ? `, an de fabricatie ${data.anFabricatie}` : '') +
        (data.capacitateCilindrica ? `, capacitate cilindrica ${data.capacitateCilindrica} cmc` : '') +
        (data.masaMaxima ? `, masa totala maxima autorizata ${data.masaMaxima}` : '') +
        '.'
    );
  }
  for (const detaliu of detalii) {
    yPosition = addWrappedText(removeDiacritics(detaliu), margin, yPosition, pageWidth - 2 * margin);
    yPosition += 2;
  }
  if (detalii.length) yPosition += 2;

  // Documente anexate - doar numarul, nu numele fisierelor
  if (data.fisiere && data.fisiere.length > 0) {
    yPosition = addWrappedText(
      removeDiacritics(
        `La prezenta cerere anexez, in copie, ${data.fisiere.length} document${data.fisiere.length > 1 ? 'e' : ''} justificativ${data.fisiere.length > 1 ? 'e' : ''}.`
      ),
      margin,
      yPosition,
      pageWidth - 2 * margin
    );
    yPosition += 4;
  }

  // Declaratie pe proprie raspundere
  const declaratieText =
    'Declar pe propria raspundere, cunoscand prevederile art. 326 din Codul penal privind ' +
    'falsul in declaratii, ca datele furnizate prin prezenta cerere sunt reale, corecte si complete.';
  yPosition = addWrappedText(removeDiacritics(declaratieText), margin, yPosition, pageWidth - 2 * margin);
  yPosition += 4;

  // Formula de incheiere
  yPosition = addWrappedText(
    removeDiacritics('Va multumesc si va rog sa primiti expresia deplinei mele consideratii.'),
    margin,
    yPosition,
    pageWidth - 2 * margin
  );
  yPosition += 12;

  // Data si semnatura
  pdf.setFontSize(10);
  pdf.text(`Data: ${currentDate}`, margin, yPosition);
  pdf.text(removeDiacritics('Semnatura,'), pageWidth - margin - 35, yPosition);
  yPosition += 8;
  pdf.text(removeDiacritics(data.numeComplet || '_________________'), pageWidth - margin - 35, yPosition);
  yPosition += 14;

  // Adresarea finala, ca pe cererile clasice
  // ("Domnului Primar al Comunei ..." - derivata din antetul oficial)
  const institutieGenitiv = TENANT.antetOficial.replace(/^PRIM[AĂ]RIA\s*/i, '').trim();
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    removeDiacritics(
      institutieGenitiv ? `DOMNULUI PRIMAR AL ${institutieGenitiv.toUpperCase()}` : 'DOMNULUI PRIMAR'
    ),
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 8;

  // Nota informativa
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100);
  const notaText =
    'Cererea se solutioneaza in termenul legal de 30 de zile de la inregistrare, conform OG nr. 27/2002. ' +
    'Veti fi notificat(a) cu privire la stadiul cererii prin aplicatie si e-mail.';
  yPosition = addWrappedText(removeDiacritics(notaText), margin, yPosition, pageWidth - 2 * margin);
  pdf.setTextColor(0, 0, 0);

  // Adaugă paginile cu imagini atașate (dacă există)
  if (data.fisiere && data.fisiere.length > 0) {
    console.log(`📎 Processing ${data.fisiere.length} attachments for PDF`);

    for (let i = 0; i < data.fisiere.length; i++) {
      const file = data.fisiere[i];
      console.log(`Processing file: ${file.name || 'unnamed'}, type: ${file.type || 'unknown'}, has buffer: ${!!file.buffer}`);

      if (file.buffer && file.type) {
        if (file.type.startsWith('image/')) {
          try {
            pdf.addPage();

            // Titlu pentru pagina cu atașament
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(removeDiacritics(`Anexă: ${file.name || 'Document'}`), pageWidth / 2, margin, { align: 'center' });

            // Convertește buffer-ul în base64 pentru jsPDF
            const base64Image = `data:${file.type};base64,${file.buffer.toString('base64')}`;

            // Calculează dimensiunile pentru a încadra imaginea în pagină
            const maxWidth = pageWidth - 2 * margin;
            const maxHeight = pageHeight - 2 * margin - 20;

            // Detectează formatul imaginii
            let imageFormat: 'JPEG' | 'PNG' = 'JPEG';
            if (file.type.includes('png')) {
              imageFormat = 'PNG';
            }

            console.log(`Adding image to PDF: ${file.name || 'unnamed'}, format: ${imageFormat}`);

            // Adaugă imaginea
            pdf.addImage(
              base64Image,
              imageFormat,
              margin,
              margin + 20,
              maxWidth,
              maxHeight,
              undefined,
              'FAST'
            );

            console.log(`✅ Successfully added image: ${file.name || 'unnamed'}`);
          } catch (error) {
            console.error(`❌ Error adding image ${file.name || 'unnamed'} to PDF:`, error);
            pdf.addPage();
            pdf.setFontSize(12);
            pdf.text(removeDiacritics(`Anexă: ${file.name || 'Document'}`), pageWidth / 2, margin, { align: 'center' });
            pdf.setFontSize(10);
            pdf.text(removeDiacritics('(Imaginea nu a putut fi inclusă în PDF)'), pageWidth / 2, margin + 20, { align: 'center' });
          }
        } else if (file.type === 'application/pdf') {
          // Pentru PDF-uri atașate, doar menționează că sunt incluse
          pdf.addPage();
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(removeDiacritics(`Anexă: ${file.name || 'Document PDF'}`), pageWidth / 2, margin, { align: 'center' });
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(removeDiacritics('(Document PDF atașat cererii)'), pageWidth / 2, margin + 20, { align: 'center' });
          pdf.text(removeDiacritics('Acest document va fi trimis separat împreună cu cererea'), pageWidth / 2, margin + 30, { align: 'center' });
        } else {
          // Pentru alte tipuri de fișiere
          pdf.addPage();
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(removeDiacritics(`Anexă: ${file.name || 'Document'}`), pageWidth / 2, margin, { align: 'center' });
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(removeDiacritics(`(Document ${file.type || 'fără tip'} atașat cererii)`), pageWidth / 2, margin + 20, { align: 'center' });
        }
      } else {
        // Fișier fără buffer sau tip
        console.warn(`⚠️ File ${file.name || 'unnamed'} missing buffer or type`);
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(removeDiacritics(`Anexă: ${file.name || 'Document'}`), pageWidth / 2, margin, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(removeDiacritics('(Document atașat cererii)'), pageWidth / 2, margin + 20, { align: 'center' });
      }

      // Adaugă URL-ul dacă există
      if (data.attachmentUrls && data.attachmentUrls.length > i && data.attachmentUrls[i]) {
        pdf.text(removeDiacritics('Disponibil online la:'), margin, margin + 40);
        const url = data.attachmentUrls[i];
        pdf.setTextColor(0, 0, 255);
        pdf.textWithLink(url || '', margin, margin + 50, { url: url || '' });
        pdf.setTextColor(0, 0, 0);
      }
    }
  }

  // Footer pe ultima pagină
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Pagina ${i} din ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return pdf.output('blob');
}
