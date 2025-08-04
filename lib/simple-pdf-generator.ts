import jsPDF from 'jspdf';

// Font Times New Roman embedded (pentru diacritice)
// Trebuie să adaugi fontul în proiect sau să folosești un font cu suport UTF-8
// Pentru demo, vom folosi Helvetica care vine cu jsPDF

// Tipuri actualizate pentru toate categoriile de cereri
export type RequestCategory = 
  | 'general'
  | 'urbanism'
  | 'asistenta-sociala'
  | 'registru-agricol'
  | 'taxe-impozite'
  | 'spclep';

export interface RequestData {
  // Date personale separate
  nume: string;
  prenume: string;
  numeComplet: string; // Generat automat: nume + prenume
  cnp: string;
  
  // Contact
  email: string;
  telefonMobil?: string;
  telefonFix?: string;
  telefon: string; // Pentru compatibilitate - telefonMobil || telefonFix
  
  // Domiciliu detaliat
  judet: string;
  localitate: string;
  strada: string;
  numar?: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
  adresa: string; // Adresa completă generată
  
  // Date cerere
  tipCerere: string;
  scopulCererii: string;
  documente?: string[];
  fisiere?: File[];
  fileUrls?: string[];
  
  // Câmpuri adiționale pentru anumite tipuri de cereri
  numeFirma?: string;
  cui?: string;
  nrRegistruComert?: string;
  reprezentantLegal?: string;
  suprafataTeren?: string;
  nrCadastral?: string;
  tipConstructie?: string;
  suprafataConstructie?: string;
  anConstructie?: string;
  marcaAuto?: string;
  serieSasiu?: string;
  anFabricatie?: string;
  capacitateCilindrica?: string;
  masaMaxima?: string;
  nrInmatriculare?: string;
}

// Configurație pentru fiecare tip de cerere
export const REQUEST_CONFIGS: Record<string, {
  title: string;
  category: RequestCategory;
  requiresAttachments?: boolean;
  additionalFields?: string[];
  template?: 'standard' | 'fiscal' | 'urbanism' | 'social' | 'agricol';
  scopPlaceholder?: string;
}> = {
  // [Păstrează configurația existentă]
  'cerere-generala': {
    title: 'CERERE',
    category: 'general',
    template: 'standard',
    scopPlaceholder: 'Descrie detaliat solicitarea ta către primărie'
  },
  // ... restul configurațiilor rămân la fel
};

// Funcție pentru formatarea textului cu diacritice
function formatText(text: string): string {
  // Înlocuiește caracterele problematice pentru PDF
  return text
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/ș/g, 's')
    .replace(/Ș/g, 'S')
    .replace(/ț/g, 't')
    .replace(/Ț/g, 'T');
}

// Funcție principală pentru generarea PDF
export async function generatePDF(data: RequestData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const config = REQUEST_CONFIGS[data.tipCerere] || { title: 'CERERE', category: 'general', template: 'standard' };
  
  // Variabile pentru layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const marginTop = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let currentY = marginTop;
  
  // Culori - folosim tuple types pentru TypeScript
  const primaryColor: [number, number, number] = [0, 0, 0]; // Negru
  const grayColor: [number, number, number] = [100, 100, 100]; // Gri
  
  // ========== ANTET ==========
  // Logo sau emblemă (poți adăuga o imagine aici)
  doc.setFillColor(0, 48, 135); // Albastru închis
  doc.rect(marginLeft, currentY, contentWidth, 25, 'F');
  
  // Text antet pe fundal albastru
  doc.setTextColor(255, 255, 255); // Alb
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(formatText('PRIMĂRIA COMUNEI FILIPEȘTI'), pageWidth / 2, currentY + 10, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(formatText('Județul Bacău'), pageWidth / 2, currentY + 16, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Tel: 0234/256.789 | Fax: 0234/256.790 | Email: contact@primariafilipesti.ro', pageWidth / 2, currentY + 22, { align: 'center' });
  
  // Reset culoare text
  doc.setTextColor(...primaryColor);
  currentY += 35;
  
  // ========== NUMĂR ÎNREGISTRARE ==========
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const nrInregistrare = `Nr. ________ din data de ${new Date().toLocaleDateString('ro-RO')}`;
  doc.text(formatText(nrInregistrare), pageWidth - marginRight, currentY, { align: 'right' });
  currentY += 15;
  
  // ========== TITLU CERERE ==========
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  const title = config.title || 'CERERE';
  doc.text(formatText(title), pageWidth / 2, currentY, { align: 'center' });
  
  // Linie decorativă sub titlu
  currentY += 8;
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, currentY, pageWidth / 2 + 30, currentY);
  currentY += 15;
  
  // ========== CĂTRE ==========
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(formatText('Către: PRIMĂRIA COMUNEI FILIPEȘTI'), marginLeft, currentY);
  currentY += 6;
  doc.text(formatText('În atenția: ________________________'), marginLeft, currentY);
  currentY += 15;
  
  // ========== FORMULAR DATE SOLICITANT ==========
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(formatText('SOLICITANT:'), marginLeft, currentY);
  currentY += 8;
  
  // Tabel cu date personale
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  // Nume și prenume pe același rând
  doc.text(formatText('Nume și prenume:'), marginLeft + 5, currentY);
  doc.setFont(undefined, 'bold');
  doc.text(formatText(`${data.nume.toUpperCase()} ${data.prenume}`), marginLeft + 40, currentY);
  doc.setFont(undefined, 'normal');
  currentY += 6;
  
  // CNP
  doc.text('CNP:', marginLeft + 5, currentY);
  doc.text(data.cnp, marginLeft + 40, currentY);
  currentY += 6;
  
  // Domiciliu complet
  doc.text('Domiciliul:', marginLeft + 5, currentY);
  const domiciliuText = formatText(`Jud. ${data.judet}, Loc. ${data.localitate}, Str. ${data.strada}${data.numar ? ', Nr. ' + data.numar : ''}${data.bloc ? ', Bl. ' + data.bloc : ''}${data.scara ? ', Sc. ' + data.scara : ''}${data.etaj ? ', Et. ' + data.etaj : ''}${data.apartament ? ', Ap. ' + data.apartament : ''}`);
  
  // Verifică dacă textul domiciliului necesită mai multe linii
  const domiciliuLines = doc.splitTextToSize(domiciliuText, contentWidth - 45);
  let lineY = currentY;
  domiciliuLines.forEach((line: string) => {
    doc.text(line, marginLeft + 40, lineY);
    lineY += 5;
  });
  currentY = lineY + 1;
  
  // Contact
  doc.text('Telefon:', marginLeft + 5, currentY);
  const telefoane = [];
  if (data.telefonMobil) telefoane.push(data.telefonMobil);
  if (data.telefonFix) telefoane.push(`Fix: ${data.telefonFix}`);
  doc.text(telefoane.join(', ') || '-', marginLeft + 40, currentY);
  currentY += 6;
  
  doc.text('Email:', marginLeft + 5, currentY);
  doc.text(data.email, marginLeft + 40, currentY);
  currentY += 12;
  
  // ========== CONȚINUT CERERE ==========
  doc.setFontSize(11);
  const introText = formatText('Prin prezenta, vă rog să binevoiți a-mi aproba următoarea solicitare:');
  doc.text(introText, marginLeft, currentY);
  currentY += 10;
  
  // Chenar pentru conținutul cererii
  const contentBoxHeight = 60;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, currentY, contentWidth, contentBoxHeight);
  
  // Conținut cerere
  doc.setFontSize(10);
  const contentLines = doc.splitTextToSize(formatText(data.scopulCererii), contentWidth - 10);
  let contentY = currentY + 5;
  contentLines.forEach((line: string, index: number) => {
    if (contentY < currentY + contentBoxHeight - 5) {
      doc.text(line, marginLeft + 5, contentY);
      contentY += 5;
    }
  });
  currentY += contentBoxHeight + 10;
  
  // ========== MOTIVE / JUSTIFICARE ==========
  if (data.scopulCererii.length > 200) {
    doc.setFont(undefined, 'bold');
    doc.text(formatText('Motivare/Justificare:'), marginLeft, currentY);
    currentY += 6;
    doc.setFont(undefined, 'normal');
    
    const motivareText = formatText('Cererea este justificată de următoarele considerente expuse mai sus.');
    doc.text(motivareText, marginLeft, currentY);
    currentY += 10;
  }
  
  // ========== DOCUMENTE ANEXATE ==========
  if (data.fisiere && data.fisiere.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text(formatText('Documente anexate:'), marginLeft, currentY);
    currentY += 6;
    doc.setFont(undefined, 'normal');
    
    data.fisiere.forEach((file, index) => {
      doc.text(formatText(`${index + 1}. ${file.name}`), marginLeft + 5, currentY);
      currentY += 5;
    });
    currentY += 5;
  }
  
  // ========== DECLARAȚIE ==========
  // Asigură-te că avem suficient spațiu pentru declarație și semnături
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = marginTop;
  }
  
  doc.setFontSize(10);
  const declaratieText = formatText('Declar pe propria răspundere, cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații, că datele furnizate sunt corecte și complete.');
  const declaratieLines = doc.splitTextToSize(declaratieText, contentWidth);
  declaratieLines.forEach((line: string) => {
    doc.text(line, marginLeft, currentY);
    currentY += 5;
  });
  currentY += 10;
  
  // ========== FINAL - DATA ȘI SEMNĂTURI ==========
  // Poziționare în partea de jos a paginii
  currentY = Math.max(currentY, pageHeight - 60);
  
  // Data și semnătura pe același rând
  doc.setFontSize(11);
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, marginLeft, currentY);
  doc.text(formatText('Semnătura'), pageWidth - marginRight - 30, currentY, { align: 'center' });
  
  // Linie pentru semnătură
  doc.line(pageWidth - marginRight - 50, currentY + 2, pageWidth - marginRight - 10, currentY + 2);
  
  // ========== FOOTER ==========
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(formatText('Notă: Cererea dumneavoastră va fi procesată în conformitate cu prevederile legale în vigoare.'), pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(formatText('Termenul legal de soluționare este de 30 de zile de la data înregistrării.'), pageWidth / 2, pageHeight - 11, { align: 'center' });
  
  // Linie footer
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, pageHeight - 20, pageWidth - marginRight, pageHeight - 20);
  
  return doc.output('blob');
}

// Funcție helper pentru salvarea PDF-ului
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Funcție pentru generarea numelui fișierului PDF
export function generatePDFFilename(data: RequestData): string {
  const tipCerere = data.tipCerere.replace(/-/g, '_');
  const numeSolicitant = `${data.nume}_${data.prenume}`.replace(/\s+/g, '_');
  const data_curenta = new Date().toISOString().split('T')[0];
  return `Cerere_${tipCerere}_${numeSolicitant}_${data_curenta}.pdf`;
}
// Adaugă aceste funcții în simple-pdf-generator.ts după funcția generatePDF

// Generează conținutul specific pentru fiecare tip de cerere
export function generateContent(data: RequestData, config: typeof REQUEST_CONFIGS[string]): string {
  // Date personale formatate
  const datePersonale = `Subsemnatul(a) ${data.nume} ${data.prenume}, CNP ${data.cnp}, domiciliat(ă) în județul ${data.judet}, localitatea ${data.localitate}, ${data.adresa}`;
  
  // Pentru persoane juridice
  const companyInfo = data.numeFirma ? 
    `, în calitate de ${data.reprezentantLegal || 'reprezentant legal'} al ${data.numeFirma}, CUI ${data.cui}${data.nrRegistruComert ? `, Nr. Reg. Com. ${data.nrRegistruComert}` : ''}` : '';

  // Template-uri pentru diferite categorii
  switch (config.template) {
    case 'urbanism':
      return `Solicit eliberarea ${config.title.toLowerCase()} pentru imobilul situat în ${data.localitate}, str. ${data.strada}${data.numar ? ', nr. ' + data.numar : ''}.

${data.tipConstructie ? `Tip construcție: ${data.tipConstructie}` : ''}
${data.suprafataConstructie ? `Suprafață construcție: ${data.suprafataConstructie} mp` : ''}
${data.suprafataTeren ? `Suprafață teren: ${data.suprafataTeren} mp` : ''}
${data.nrCadastral ? `Număr cadastral: ${data.nrCadastral}` : ''}

Scopul cererii: ${data.scopulCererii}

Anexez prezentei cereri documentele prevăzute de legislația în vigoare.`;

    case 'fiscal':
      return `Solicit eliberarea ${config.title.toLowerCase()} pentru următoarele considerente:

${data.marcaAuto ? `Vehicul: ${data.marcaAuto}${data.nrInmatriculare ? ', nr. înmatriculare ' + data.nrInmatriculare : ''}` : ''}
${data.suprafataConstructie ? `Imobil cu suprafața de ${data.suprafataConstructie} mp` : ''}
${data.suprafataTeren ? `Teren în suprafață de ${data.suprafataTeren}` : ''}

Motivul solicitării: ${data.scopulCererii}

Menționez că am achitat toate obligațiile fiscale la zi și nu figurez cu datorii în evidențele primăriei.`;

    case 'social':
      return `Solicit acordarea ${config.title.toLowerCase()}.

Situația personală/familială:
${data.scopulCererii}

Declar pe propria răspundere că:
- Nu beneficiez de alte forme de ajutor social pentru aceeași situație
- Informațiile furnizate sunt reale și complete
- Mă oblig să anunț orice modificare a situației mele în termen de 15 zile

Sunt de acord cu verificarea informațiilor furnizate.`;

    case 'agricol':
      return `Solicit eliberarea ${config.title.toLowerCase()}.

${data.suprafataTeren ? `Dețin teren agricol în suprafață totală de ${data.suprafataTeren}` : ''}

Scopul solicitării: ${data.scopulCererii}

Menționez că figurez în registrul agricol al comunei și declar că informațiile sunt conforme cu realitatea.`;

    default: // standard
      return data.scopulCererii;
  }
}

// Funcție pentru generarea unui PDF cu aspect mai profesional
export async function generateProfessionalPDF(data: RequestData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const config = REQUEST_CONFIGS[data.tipCerere] || { title: 'CERERE', category: 'general', template: 'standard' };
  
  // Setări pentru document
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 25;
  const rightMargin = 25;
  const topMargin = 20;
  const lineHeight = 7;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let yPosition = topMargin;
  
  // ========== ANTET INSTITUȚIONAL ==========
  // Stema României (poți adăuga o imagine aici)
  // doc.addImage(stemaImage, 'PNG', leftMargin, yPosition, 20, 25);
  
  // Antet text
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('ROMANIA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  doc.setFontSize(12);
  doc.text('JUDETUL BACAU', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  doc.text('PRIMARIA COMUNEI FILIPESTI', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Str. Principala, Nr. 1, Comuna Filipesti, Judetul Bacau', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('Tel: 0234/256.789, Fax: 0234/256.790, Email: contact@primariafilipesti.ro', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('Cod fiscal: 4278312', pageWidth / 2, yPosition, { align: 'center' });
  
  // Linie separatoare
  yPosition += 8;
  doc.setLineWidth(1);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 10;
  
  // ========== NUMĂR ÎNREGISTRARE ==========
  doc.setFontSize(11);
  doc.text(`Nr. ............... / ${new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, pageWidth - rightMargin - 10, yPosition);
  yPosition += 15;
  
  // ========== TITLU DOCUMENT ==========
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(config.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // ========== DATE SOLICITANT ==========
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  // Paragraf introductiv
  const intro = `Subsemnatul(a) ${data.nume.toUpperCase()} ${data.prenume}, `;
  doc.text(intro, leftMargin, yPosition);
  yPosition += lineHeight;
  
  doc.text(`CNP ${data.cnp}, domiciliat(a) in:`, leftMargin, yPosition);
  yPosition += lineHeight;
  
  // Adresa detaliată
  const adresaCompleta = `Judetul ${data.judet}, Localitatea ${data.localitate}, Str. ${data.strada}${data.numar ? ', Nr. ' + data.numar : ''}${data.bloc ? ', Bl. ' + data.bloc : ''}${data.scara ? ', Sc. ' + data.scara : ''}${data.etaj ? ', Et. ' + data.etaj : ''}${data.apartament ? ', Ap. ' + data.apartament : ''}`;
  
  const adresaLines = doc.splitTextToSize(adresaCompleta, contentWidth - 10);
  adresaLines.forEach((line: string) => {
    doc.text(line, leftMargin + 5, yPosition);
    yPosition += lineHeight;
  });
  
  // Date contact
  doc.text(`Telefon: ${data.telefonMobil || data.telefonFix || '-'}, Email: ${data.email}`, leftMargin, yPosition);
  yPosition += lineHeight * 2;
  
  // ========== CONȚINUT PRINCIPAL ==========
  const content = generateContent(data, config);
  const contentLines = doc.splitTextToSize(content, contentWidth);
  
  contentLines.forEach((line: string) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = topMargin;
    }
    doc.text(line, leftMargin, yPosition);
    yPosition += lineHeight;
  });
  
  // ========== FORMULE DE ÎNCHEIERE ==========
  yPosition += lineHeight;
  doc.text('Va multumesc anticipat pentru intelegere.', leftMargin, yPosition);
  yPosition += lineHeight;
  doc.text('Cu respect,', leftMargin, yPosition);
  
  // ========== SEMNĂTURI ȘI DATE ==========
  yPosition = Math.max(yPosition + 20, pageHeight - 50);
  
  // Două coloane pentru dată și semnătură
  doc.text('Data:', leftMargin, yPosition);
  doc.text('Semnatura:', pageWidth - rightMargin - 40, yPosition);
  
  yPosition += 5;
  doc.text(new Date().toLocaleDateString('ro-RO', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  }), leftMargin, yPosition);
  
  // Linie pentru semnătură
  doc.line(pageWidth - rightMargin - 50, yPosition, pageWidth - rightMargin, yPosition);
  
  // ========== MENȚIUNI LEGALE (FOOTER) ==========
  doc.setFontSize(8);
  doc.setTextColor(100);
  yPosition = pageHeight - 10;
  doc.text('Prezenta cerere a fost generata electronic si este conforma cu originalul', pageWidth / 2, yPosition, { align: 'center' });
  
  return doc.output('blob');
}