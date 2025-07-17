import jsPDF from 'jspdf';

// Tipuri actualizate pentru toate categoriile de cereri
export type RequestCategory = 
  | 'general'
  | 'urbanism'
  | 'asistenta-sociala'
  | 'registru-agricol'
  | 'taxe-impozite'
  | 'spclep';

export interface RequestData {
  numeComplet: string;
  cnp: string;
  localitate: string;
  adresa: string;
  telefon: string;
  email: string;
  tipCerere: string;
  scopulCererii: string;
  documente?: string[];
  fisiere?: File[];
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
}> = {
  // Solicitări Generale
  'cerere-generala': {
    title: 'CERERE CĂTRE COMPARTIMENT DE SPECIALITATE',
    category: 'general',
    template: 'standard'
  },
  'permis-foc': {
    title: 'CERERE PERMIS DE LUCRU CU FOC',
    category: 'general',
    requiresAttachments: true,
    template: 'standard'
  },
  
  // Urbanism
  'autorizatie-construire': {
    title: 'CERERE PENTRU EMITEREA AUTORIZAȚIEI DE CONSTRUIRE/DESFIINȚARE',
    category: 'urbanism',
    requiresAttachments: true,
    additionalFields: ['tipConstructie', 'suprafataConstructie', 'nrCadastral'],
    template: 'urbanism'
  },
  'certificat-urbanism': {
    title: 'CERERE PENTRU EMITEREA CERTIFICATULUI DE URBANISM',
    category: 'urbanism',
    requiresAttachments: true,
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    template: 'urbanism'
  },
  'prelungire-autorizatie': {
    title: 'CERERE PENTRU PRELUNGIREA VALABILITĂȚII AUTORIZAȚIEI',
    category: 'urbanism',
    template: 'urbanism'
  },
  'prelungire-certificat': {
    title: 'CERERE PENTRU PRELUNGIREA CERTIFICATULUI DE URBANISM',
    category: 'urbanism',
    template: 'urbanism'
  },
  'incepere-lucrari': {
    title: 'COMUNICARE PRIVIND ÎNCEPEREA EXECUȚIEI LUCRĂRILOR',
    category: 'urbanism',
    template: 'urbanism'
  },
  'incheiere-lucrari': {
    title: 'COMUNICARE PRIVIND ÎNCHEIEREA EXECUȚIEI LUCRĂRILOR',
    category: 'urbanism',
    template: 'urbanism'
  },
  
  // Asistență Socială
  'lemne-foc': {
    title: 'CERERE PENTRU ACORDAREA DE LEMNE DE FOC',
    category: 'asistenta-sociala',
    template: 'social'
  },
  'indemnizatie-copil': {
    title: 'CERERE ADEVERINȚĂ INDEMNIZAȚIE CREȘTERE COPIL',
    category: 'asistenta-sociala',
    template: 'social'
  },
  'indemnizatie-somaj': {
    title: 'CERERE ADEVERINȚĂ INDEMNIZAȚIE DE ȘOMAJ',
    category: 'asistenta-sociala',
    template: 'social'
  },
  'consiliere': {
    title: 'CERERE INFORMARE ȘI CONSILIERE',
    category: 'asistenta-sociala',
    template: 'social'
  },
  'modificare-beneficii': {
    title: 'CERERE MODIFICARE BENEFICII SOCIALE',
    category: 'asistenta-sociala',
    template: 'social'
  },
  'alocatie-copii': {
    title: 'CERERE PENTRU ACORDAREA ALOCAȚIEI DE STAT',
    category: 'asistenta-sociala',
    requiresAttachments: true,
    template: 'social'
  },
  'indemnizatie-crestere': {
    title: 'CERERE PENTRU INDEMNIZAȚIE CREȘTERE COPIL',
    category: 'asistenta-sociala',
    requiresAttachments: true,
    template: 'social'
  },
  
  // Registru Agricol
  'adeverinta-rol': {
    title: 'CERERE ELIBERARE ADEVERINȚĂ DE ROL',
    category: 'registru-agricol',
    template: 'agricol'
  },
  'apia-pf': {
    title: 'CERERE ADEVERINȚĂ APIA - PERSOANĂ FIZICĂ',
    category: 'registru-agricol',
    template: 'agricol'
  },
  'apia-pj': {
    title: 'CERERE ADEVERINȚĂ APIA - PERSOANĂ JURIDICĂ',
    category: 'registru-agricol',
    additionalFields: ['numeFirma', 'cui', 'reprezentantLegal'],
    template: 'agricol'
  },
  'declaratie-registru': {
    title: 'DECLARAȚIE PENTRU COMPLETAREA REGISTRULUI AGRICOL',
    category: 'registru-agricol',
    requiresAttachments: true,
    template: 'agricol'
  },
  'nomenclatura-stradala': {
    title: 'CERERE CERTIFICAT DE NOMENCLATURĂ STRADALĂ',
    category: 'registru-agricol',
    template: 'agricol'
  },
  
  // Taxe și Impozite
  'certificat-fiscal-pf': {
    title: 'CERERE ELIBERARE CERTIFICAT FISCAL - PERSOANĂ FIZICĂ',
    category: 'taxe-impozite',
    template: 'fiscal'
  },
  'certificat-fiscal-pj': {
    title: 'CERERE ELIBERARE CERTIFICAT FISCAL - PERSOANĂ JURIDICĂ',
    category: 'taxe-impozite',
    additionalFields: ['numeFirma', 'cui', 'nrRegistruComert', 'reprezentantLegal'],
    template: 'fiscal'
  },
  'radiere-imobile': {
    title: 'CERERE SCOATERE DIN EVIDENȚĂ CLĂDIRI/TERENURI',
    category: 'taxe-impozite',
    requiresAttachments: true,
    template: 'fiscal'
  },
  'radiere-auto': {
    title: 'CERERE SCOATERE DIN EVIDENȚĂ MIJLOACE DE TRANSPORT',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'serieSasiu', 'nrInmatriculare'],
    template: 'fiscal'
  },
  'declaratie-auto': {
    title: 'DECLARAȚIE FISCALĂ - IMPOZIT MIJLOACE DE TRANSPORT',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'anFabricatie', 'capacitateCilindrica', 'nrInmatriculare'],
    template: 'fiscal'
  },
  'declaratie-marfa': {
    title: 'DECLARAȚIE FISCALĂ - MIJLOACE TRANSPORT MARFĂ PESTE 12 TONE',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'masaMaxima', 'nrInmatriculare'],
    template: 'fiscal'
  },
  'declaratie-teren-pf': {
    title: 'DECLARAȚIE FISCALĂ IMPOZIT TEREN - PERSOANĂ FIZICĂ',
    category: 'taxe-impozite',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    template: 'fiscal'
  },
  'declaratie-cladire-pf': {
    title: 'DECLARAȚIE FISCALĂ IMPOZIT CLĂDIRE - PERSOANĂ FIZICĂ',
    category: 'taxe-impozite',
    additionalFields: ['suprafataConstructie', 'anConstructie', 'nrCadastral'],
    template: 'fiscal'
  },
  
  // SPCLEP
  'act-identitate': {
    title: 'CERERE PENTRU ELIBERARE ACT DE IDENTITATE',
    category: 'spclep',
    requiresAttachments: true,
    template: 'standard'
  },
  'stabilire-resedinta': {
    title: 'CERERE PENTRU STABILIREA REȘEDINȚEI',
    category: 'spclep',
    requiresAttachments: true,
    template: 'standard'
  },
  'transcriere-nastere': {
    title: 'CERERE TRANSCRIERE CERTIFICAT DE NAȘTERE',
    category: 'spclep',
    requiresAttachments: true,
    template: 'standard'
  },
  'certificat-nastere': {
    title: 'CERERE ELIBERARE CERTIFICAT DE NAȘTERE',
    category: 'spclep',
    template: 'standard'
  }
};

// Funcție principală pentru generarea PDF
export async function generatePDF(data: RequestData): Promise<Blob> {
  const doc = new jsPDF();
  const config = REQUEST_CONFIGS[data.tipCerere] || { title: 'CERERE', category: 'general', template: 'standard' };
  
  // Setări font și margini
  const marginLeft = 20;
  const marginTop = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * marginLeft;
  let currentY = marginTop;
  
  // Antet
  doc.setFontSize(10);
  doc.text('PRIMĂRIA COMUNEI FILIPEȘTI', marginLeft, currentY);
  currentY += 5;
  doc.text('Județul Bacău', marginLeft, currentY);
  currentY += 5;
  doc.text(`Nr. _____ / ${new Date().toLocaleDateString('ro-RO')}`, pageWidth - marginLeft - 40, marginTop);
  
  // Titlu
  currentY += 20;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  const titleLines = doc.splitTextToSize(config.title, contentWidth);
  titleLines.forEach((line: string) => {
    const textWidth = doc.getTextWidth(line);
    doc.text(line, (pageWidth - textWidth) / 2, currentY);
    currentY += 7;
  });
  
  // Conținut principal
  currentY += 15;
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const content = generateContent(data, config);
  const lines = doc.splitTextToSize(content, contentWidth);
  
  lines.forEach((line: string) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = marginTop;
    }
    doc.text(line, marginLeft, currentY);
    currentY += 6;
  });
  
  // Mențiune despre atașamente dacă există
  if (data.fisiere && data.fisiere.length > 0) {
    currentY += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Anexe:', marginLeft, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 6;
    data.fisiere.forEach((file, index) => {
      doc.text(`${index + 1}. ${file.name}`, marginLeft + 5, currentY);
      currentY += 5;
    });
  }
  
  // Semnătură și dată
  currentY = Math.max(currentY + 20, 240);
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, marginLeft, currentY);
  doc.text('Semnătura: _________________', pageWidth - marginLeft - 50, currentY);
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Contact: ${data.telefon} | ${data.email}`, pageWidth / 2, 285, { align: 'center' });
  doc.text('Document generat electronic prin aplicația Primăriei Filipești', pageWidth / 2, 290, { align: 'center' });
  
  return doc.output('blob');
}

// Generează conținutul specific pentru fiecare tip de cerere
function generateContent(data: RequestData, config: typeof REQUEST_CONFIGS[string]): string {
  const baseInfo = `Subsemnatul(a) ${data.numeComplet}, CNP ${data.cnp}, domiciliat(ă) în ${data.localitate}, la adresa ${data.adresa}, număr de telefon ${data.telefon}, email ${data.email}`;
  
  // Pentru persoane juridice
  const companyInfo = data.numeFirma ? 
    `, în calitate de ${data.reprezentantLegal || 'reprezentant legal'} al ${data.numeFirma}, CUI ${data.cui}, Nr. Reg. Com. ${data.nrRegistruComert || '-'}` : '';
  
  const intro = baseInfo + companyInfo + ',';

  // Template-uri pentru diferite categorii
  switch (config.template) {
    case 'urbanism':
      return `${intro}

Prin prezenta, vă rog să îmi aprobați ${config.title.toLowerCase()}.

${data.tipConstructie ? `Tip construcție: ${data.tipConstructie}` : ''}
${data.suprafataConstructie ? `Suprafață construcție: ${data.suprafataConstructie} mp` : ''}
${data.suprafataTeren ? `Suprafață teren: ${data.suprafataTeren} mp` : ''}
${data.nrCadastral ? `Număr cadastral: ${data.nrCadastral}` : ''}

Scopul cererii: ${data.scopulCererii}

Declar pe propria răspundere că datele furnizate sunt reale și corecte, cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații.

Anexez prezentei cereri documentele necesare conform legislației în vigoare.

Cu respect,`;

    case 'fiscal':
      return `${intro}

Prin prezenta, solicit ${config.title.toLowerCase()}.

${data.marcaAuto ? `Marca și model vehicul: ${data.marcaAuto}` : ''}
${data.serieSasiu ? `Serie șasiu: ${data.serieSasiu}` : ''}
${data.anFabricatie ? `An fabricație: ${data.anFabricatie}` : ''}
${data.capacitateCilindrica ? `Capacitate cilindrică: ${data.capacitateCilindrica} cmc` : ''}
${data.masaMaxima ? `Masa maximă autorizată: ${data.masaMaxima} kg` : ''}
${data.nrInmatriculare ? `Număr înmatriculare: ${data.nrInmatriculare}` : ''}
${data.suprafataConstructie ? `Suprafață construcție: ${data.suprafataConstructie} mp` : ''}
${data.anConstructie ? `An construcție: ${data.anConstructie}` : ''}

Motivul solicitării: ${data.scopulCererii}

Declar că toate informațiile furnizate sunt corecte și complete.

Vă mulțumesc!`;

    case 'social':
      return `${intro}

Prin prezenta, vă rog să îmi aprobați ${config.title.toLowerCase()}.

Motivul solicitării: ${data.scopulCererii}

Declar pe propria răspundere că:
- Nu beneficiez de alte forme de ajutor social pentru aceeași situație
- Toate datele furnizate sunt reale și complete
- Voi anunța orice modificare a situației mele în termen de 15 zile

Cunosc prevederile legale privind acordarea beneficiilor sociale și mă angajez să respect toate condițiile impuse.

Cu respect,`;

    case 'agricol':
      return `${intro}

Prin prezenta, solicit eliberarea ${config.title.toLowerCase()}.

${data.suprafataTeren ? `Suprafață teren agricol: ${data.suprafataTeren} ha` : ''}

Scopul solicitării: ${data.scopulCererii}

Menționez că figurez în registrul agricol al comunei cu terenurile/animalele declarate conform legii.

Declar pe propria răspundere că informațiile furnizate sunt reale și complete.

Vă mulțumesc pentru solicitudine!`;

    default: // standard
      return `${intro}

Prin prezenta, vă adresez respectuos rugămintea de a-mi aproba următoarea solicitare:

${data.scopulCererii}

${data.documente && data.documente.length > 0 ? `Documente necesare:\n${data.documente.map(doc => `- ${doc}`).join('\n')}` : ''}

Declar pe propria răspundere că toate informațiile furnizate sunt reale și corecte, cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații.

Vă rog să analizați cererea mea și să îmi comunicați răspunsul dumneavoastră în termenul legal.

Cu respect,`;
  }
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

// Funcție pentru trimiterea cererii cu atașamente
export async function submitRequest(data: RequestData): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    
    // Adăugăm datele cererii
    formData.append('requestData', JSON.stringify(data));
    
    // Adăugăm fișierele atașate
    if (data.fisiere) {
      data.fisiere.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    }
    
    // Generăm și adăugăm PDF-ul
    const pdfBlob = await generatePDF(data);
    const pdfFilename = `cerere_${data.tipCerere}_${Date.now()}.pdf`;
    formData.append('pdf', pdfBlob, pdfFilename);
    
    const response = await fetch('/api/submit-request', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting request:', error);
    return { success: false, error: 'Eroare la trimiterea cererii' };
  }
}