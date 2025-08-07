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

export interface RequestConfig {
  title: string;
  category: RequestCategory;
  scopPlaceholder?: string;
  requiresAttachments?: boolean;
  additionalFields?: string[];
  template?: 'standard' | 'fiscal' | 'urbanism' | 'social' | 'agricol';
}

// Configurație pentru fiecare tip de cerere
export const REQUEST_CONFIGS: Record<string, RequestConfig> = {
  // Solicitări Generale
  'cerere-generala': {
    title: 'CERERE',
    category: 'general',
    template: 'standard',
    scopPlaceholder: 'Descrie detaliat solicitarea ta către primărie',
    requiresAttachments: true
  },
  'permis-foc': {
    title: 'CERERE PERMIS DE LUCRU CU FOC',
    category: 'general',
    template: 'standard',
    scopPlaceholder: 'Descrie tipul lucrărilor, locația și perioada necesară',
    requiresAttachments: true
  },

  // Urbanism
  'autorizatie-construire': {
    title: 'CERERE PENTRU EMITEREA AUTORIZAȚIEI DE CONSTRUIRE/DESFIINȚARE',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Descrie lucrările propuse și scopul acestora',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren', 'nrCadastral', 'tipConstructie', 'suprafataConstructie']
  },
  'certificat-urbanism': {
    title: 'CERERE PENTRU EMITEREA CERTIFICATULUI DE URBANISM',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Scopul obținerii certificatului și intenția de utilizare',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren', 'nrCadastral']
  },
  'prelungire-autorizatie': {
    title: 'CERERE PRELUNGIRE AUTORIZAȚIE DE CONSTRUIRE',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Motivul prelungirii și stadiul actual al lucrărilor',
    requiresAttachments: true
  },
  'prelungire-certificat': {
    title: 'CERERE PRELUNGIRE CERTIFICAT DE URBANISM',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Motivul prelungirii',
    requiresAttachments: false
  },
  'incepere-lucrari': {
    title: 'COMUNICARE PRIVIND ÎNCEPEREA EXECUȚIEI LUCRĂRILOR',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Data începerii și detaliile lucrărilor autorizate',
    requiresAttachments: false
  },
  'incheiere-lucrari': {
    title: 'COMUNICARE PRIVIND ÎNCHEIEREA EXECUȚIEI LUCRĂRILOR',
    category: 'urbanism',
    template: 'urbanism',
    scopPlaceholder: 'Data finalizării și stadiul final al lucrărilor',
    requiresAttachments: true
  },

  // Asistență Socială
  'lemne-foc': {
    title: 'CERERE PENTRU ACORDAREA AJUTORULUI PENTRU ÎNCĂLZIREA LOCUINȚEI CU LEMNE',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Situația socială, veniturile familiei și necesarul de lemne',
    requiresAttachments: true
  },
  'indemnizatie-copil': {
    title: 'CERERE ADEVERINȚĂ INDEMNIZAȚIE CREȘTERE COPIL',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Perioada pentru care soliciți adeverința și scopul acesteia',
    requiresAttachments: true
  },
  'indemnizatie-somaj': {
    title: 'CERERE ADEVERINȚĂ INDEMNIZAȚIE DE ȘOMAJ',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Perioada și ultimul loc de muncă',
    requiresAttachments: true
  },
  'consiliere': {
    title: 'CERERE PENTRU INFORMARE ȘI CONSILIERE',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Descrie situația și tipul de asistență necesară',
    requiresAttachments: false
  },
  'modificare-beneficii': {
    title: 'CERERE MODIFICARE BENEFICII SOCIALE',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Beneficiile actuale și modificările solicitate',
    requiresAttachments: true
  },
  'alocatie-copii': {
    title: 'CERERE PENTRU ACORDAREA ALOCAȚIEI DE STAT PENTRU COPII',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Date despre copii și situația familială',
    requiresAttachments: true
  },
  'indemnizatie-crestere': {
    title: 'CERERE PENTRU ACORDAREA INDEMNIZAȚIEI DE CREȘTERE A COPILULUI',
    category: 'asistenta-sociala',
    template: 'social',
    scopPlaceholder: 'Date despre copil și perioada solicitată',
    requiresAttachments: true
  },

  // Registru Agricol
  'adeverinta-rol': {
    title: 'CERERE ELIBERARE ADEVERINȚĂ DE ROL',
    category: 'registru-agricol',
    template: 'agricol',
    scopPlaceholder: 'Scopul pentru care soliciți adeverința',
    requiresAttachments: false
  },
  'apia-pf': {
    title: 'CERERE ADEVERINȚĂ APIA - PERSOANĂ FIZICĂ',
    category: 'registru-agricol',
    template: 'agricol',
    scopPlaceholder: 'Suprafețele și culturile pentru care aplici la APIA',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren']
  },
  'apia-pj': {
    title: 'CERERE ADEVERINȚĂ APIA - PERSOANĂ JURIDICĂ',
    category: 'registru-agricol',
    template: 'agricol',
    scopPlaceholder: 'Suprafețele și culturile pentru care aplică firma',
    requiresAttachments: true,
    additionalFields: ['numeFirma', 'cui', 'reprezentantLegal', 'suprafataTeren']
  },
  'declaratie-registru': {
    title: 'DECLARAȚIE PENTRU COMPLETAREA REGISTRULUI AGRICOL',
    category: 'registru-agricol',
    template: 'agricol',
    scopPlaceholder: 'Modificările ce trebuie operate în registrul agricol',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren']
  },
  'nomenclatura-stradala': {
    title: 'CERERE CERTIFICAT DE NOMENCLATURĂ STRADALĂ',
    category: 'registru-agricol',
    template: 'standard',
    scopPlaceholder: 'Adresa pentru care soliciți certificatul',
    requiresAttachments: false
  },

  // Taxe și Impozite
  'certificat-fiscal-pf': {
    title: 'CERERE CERTIFICAT FISCAL - PERSOANĂ FIZICĂ',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Scopul pentru care soliciți certificatul fiscal',
    requiresAttachments: false
  },
  'certificat-fiscal-pj': {
    title: 'CERERE CERTIFICAT FISCAL - PERSOANĂ JURIDICĂ',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Scopul pentru care solicită firma certificatul',
    requiresAttachments: false,
    additionalFields: ['numeFirma', 'cui', 'nrRegistruComert', 'reprezentantLegal']
  },
  'radiere-imobile': {
    title: 'CERERE PENTRU SCOATEREA DIN EVIDENȚĂ A CLĂDIRILOR/TERENURILOR',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Imobilele ce urmează a fi radiate și motivul radierii',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren', 'nrCadastral']
  },
  'radiere-auto': {
    title: 'CERERE PENTRU SCOATEREA DIN EVIDENȚĂ A MIJLOACELOR DE TRANSPORT',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Vehiculul ce urmează a fi radiat și motivul (vânzare, casare, furt)',
    requiresAttachments: true,
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'serieSasiu']
  },
  'declaratie-auto': {
    title: 'DECLARAȚIE FISCALĂ PENTRU STABILIREA IMPOZITULUI PE MIJLOACE DE TRANSPORT',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Date despre vehiculul achiziționat',
    requiresAttachments: true,
    additionalFields: ['marcaAuto', 'serieSasiu', 'anFabricatie', 'capacitateCilindrica', 'nrInmatriculare']
  },
  'declaratie-marfa': {
    title: 'DECLARAȚIE FISCALĂ MIJLOACE TRANSPORT MARFĂ PESTE 12 TONE',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Date despre vehiculul de mare tonaj',
    requiresAttachments: true,
    additionalFields: ['marcaAuto', 'serieSasiu', 'anFabricatie', 'masaMaxima', 'nrInmatriculare']
  },
  'declaratie-teren-pf': {
    title: 'DECLARAȚIE FISCALĂ PENTRU STABILIREA IMPOZITULUI PE TEREN - PF',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Terenurile deținute și modificările survenite',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren', 'nrCadastral']
  },
  'declaratie-cladire-pf': {
    title: 'DECLARAȚIE FISCALĂ PENTRU STABILIREA IMPOZITULUI PE CLĂDIRE - PF',
    category: 'taxe-impozite',
    template: 'fiscal',
    scopPlaceholder: 'Clădirile deținute și modificările survenite',
    requiresAttachments: true,
    additionalFields: ['tipConstructie', 'suprafataConstructie', 'anConstructie']
  },

  // SPCLEP
  'act-identitate': {
    title: 'CERERE PENTRU ELIBERAREA ACTULUI DE IDENTITATE',
    category: 'spclep',
    template: 'standard',
    scopPlaceholder: 'Motivul eliberării (expirare, pierdere, furt, deteriorare)',
    requiresAttachments: true
  },
  'stabilire-resedinta': {
    title: 'CERERE PENTRU STABILIREA REȘEDINȚEI',
    category: 'spclep',
    template: 'standard',
    scopPlaceholder: 'Adresa nouă și motivul schimbării reședinței',
    requiresAttachments: true
  },
  'transcriere-nastere': {
    title: 'CERERE TRANSCRIERE CERTIFICAT DE NAȘTERE',
    category: 'spclep',
    template: 'standard',
    scopPlaceholder: 'Țara emitentă și detalii despre certificatul original',
    requiresAttachments: true
  },
  'certificat-nastere': {
    title: 'CERERE ELIBERARE CERTIFICAT DE NAȘTERE',
    category: 'spclep',
    template: 'standard',
    scopPlaceholder: 'Original sau duplicat și motivul solicitării',
    requiresAttachments: false
  }
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

// Helper function pentru generarea PDF-ului simplificat (pentru compatibilitate)
export function generatePDFContent(formData: any, tipCerere: string): string {
  const config = REQUEST_CONFIGS[tipCerere];
  if (!config) {
    throw new Error(`Configurație inexistentă pentru tipul de cerere: ${tipCerere}`);
  }

  // Aceasta este o versiune simplificată pentru text
  return `
    CERERE
    
    ${config.title}
    
    Subsemnatul/a ${formData.nume} ${formData.prenume},
    CNP: ${formData.cnp},
    Domiciliat în ${formData.judet}, ${formData.localitate}, ${formData.adresa || ''},
    Telefon: ${formData.telefon || formData.telefonMobil || formData.telefonFix || ''},
    Email: ${formData.email || ''},
    
    Solicit prin prezenta:
    ${formData.scopulCererii || ''}
    
    Data: ${new Date().toLocaleDateString('ro-RO')}
    
    Semnătura,
    ${formData.nume} ${formData.prenume}
  `;
}