import jsPDF from 'jspdf';
import { TENANT } from '@/lib/tenant';

export interface RequestData {
  numeComplet: string;
  nume: string;
  prenume: string;
  cnp: string;
  email: string;
  telefon: string;
  telefonMobil?: string;
  telefonFix?: string;
  judet: string;
  localitate: string;
  strada?: string;
  numar?: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
  adresa: string;
  tipCerere: string;
  scopulCererii: string;
  fisiere?: Array<{ name: string; buffer?: Buffer; type?: string }>;
  attachmentUrls?: string[];
  // Câmpuri adiționale opționale
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

// Map pentru tipurile de cereri
export const REQUEST_CONFIGS: { [key: string]: any } = {
  // Adeverințe (eliberate digital, cu semnătură și verificare QR)
  // requiresAccount: PDF-ul emis conține date personale și se livrează
  // exclusiv în "Dosarul meu", deci cetățeanul trebuie să fie autentificat
  'adeverinta-rol-agricol': {
    title: 'Adeverință de Rol Agricol',
    category: 'adeverinte',
    requiresAccount: true,
    scopPlaceholder: 'Menționează scopul (ex: notariat, bancă, instanță) și, dacă știi, poziția de rol...',
  },
  'adeverinta-apia': {
    title: 'Adeverință pentru APIA',
    category: 'adeverinte',
    requiresAccount: true,
    scopPlaceholder: 'Menționează campania APIA și suprafețele pentru care soliciți adeverința...',
  },
  'adeverinta-domiciliu': {
    title: 'Adeverință de Domiciliu / Componență Familie',
    category: 'adeverinte',
    requiresAccount: true,
    scopPlaceholder: 'Menționează scopul (școală, angajare, bursă) și persoanele din gospodărie...',
  },
  'adeverinta-ajutor-social': {
    title: 'Adeverință Ajutor Social / Alocație',
    category: 'adeverinte',
    requiresAccount: true,
    scopPlaceholder: 'Menționează tipul de beneficiu și instituția care solicită adeverința...',
  },
  'adeverinta-fara-datorii': {
    title: 'Adeverință Fără Datorii la Bugetul Local',
    category: 'adeverinte',
    requiresAccount: true,
    scopPlaceholder: 'Menționează scopul (notariat, vânzare imobil, licitație)...',
  },

  // Solicitări Generale
  'cerere-generala': {
    title: 'Cerere Generală',
    category: 'general',
    scopPlaceholder: 'Descrie detaliat cererea ta către primărie...'
  },
  'permis-foc': {
    title: 'Cerere Permis de Lucru cu Foc',
    category: 'general',
    scopPlaceholder: 'Descrie lucrările care necesită permis de foc, locația și perioada...',
    requiresAttachments: true
  },

  // Urbanism
  'autorizatie-construire': {
    title: 'Cerere Autorizație de Construire',
    category: 'urbanism',
    additionalFields: ['suprafataTeren', 'tipConstructie', 'suprafataConstructie'],
    requiresAttachments: true
  },
  'certificat-urbanism': {
    title: 'Cerere Certificat de Urbanism',
    category: 'urbanism',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    requiresAttachments: true
  },
  'prelungire-autorizatie': {
    title: 'Cerere Prelungire Autorizație de Construire',
    category: 'urbanism',
    scopPlaceholder: 'Menționează numărul autorizației existente și motivul prelungirii...',
    requiresAttachments: true
  },
  'prelungire-certificat': {
    title: 'Cerere Prelungire Certificat de Urbanism',
    category: 'urbanism',
    scopPlaceholder: 'Menționează numărul certificatului existent și motivul prelungirii...',
    requiresAttachments: true
  },
  'incepere-lucrari': {
    title: 'Comunicare Începere Lucrări',
    category: 'urbanism',
    scopPlaceholder: 'Menționează numărul autorizației de construire și data estimată de începere...'
  },
  'incheiere-lucrari': {
    title: 'Comunicare Încheiere Lucrări',
    category: 'urbanism',
    scopPlaceholder: 'Menționează numărul autorizației de construire și data finalizării...'
  },

  // Asistență Socială
  'lemne-foc': {
    title: 'Cerere Lemne de Foc',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează situația ta socială și necesitatea ajutorului pentru încălzire...'
  },
  'indemnizatie-copil': {
    title: 'Adeverință Indemnizație Creștere Copil',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează datele copilului și perioada pentru care soliciți adeverința...'
  },
  'indemnizatie-somaj': {
    title: 'Adeverință Indemnizație de Șomaj',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează perioada și scopul pentru care soliciți adeverința...'
  },
  'consiliere': {
    title: 'Cerere Informare și Consiliere',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Descrie situația ta și tipul de consiliere de care ai nevoie...'
  },
  'modificare-beneficii': {
    title: 'Cerere Modificare Beneficii Sociale',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează beneficiile actuale și modificările solicitate...',
    requiresAttachments: true
  },
  'alocatie-copii': {
    title: 'Cerere Alocație de Stat pentru Copii',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează datele copilului/copiilor pentru care soliciți alocația...',
    requiresAttachments: true
  },
  'indemnizatie-crestere': {
    title: 'Cerere Indemnizație/Stimulent de Inserție',
    category: 'asistenta-sociala',
    scopPlaceholder: 'Menționează datele copilului și tipul de indemnizație solicitat...',
    requiresAttachments: true
  },

  // Registru Agricol
  'adeverinta-rol': {
    title: 'Cerere Adeverință de Rol',
    category: 'registru-agricol',
    scopPlaceholder: 'Menționează scopul pentru care soliciți adeverința de rol...'
  },
  'apia-pf': {
    title: 'Cerere Adeverință APIA - Persoană Fizică',
    category: 'registru-agricol',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    scopPlaceholder: 'Menționează terenurile pentru care soliciți adeverința APIA...'
  },
  'apia-pj': {
    title: 'Cerere Adeverință APIA - Persoană Juridică',
    category: 'registru-agricol',
    additionalFields: ['numeFirma', 'cui', 'reprezentantLegal', 'suprafataTeren'],
    scopPlaceholder: 'Menționează terenurile pentru care soliciți adeverința APIA...'
  },
  'declaratie-registru': {
    title: 'Declarație pentru Registrul Agricol',
    category: 'registru-agricol',
    scopPlaceholder: 'Declară modificările pentru actualizarea registrului agricol...',
    requiresAttachments: true
  },
  'nomenclatura-stradala': {
    title: 'Cerere Certificat Nomenclatură Stradală',
    category: 'registru-agricol',
    scopPlaceholder: 'Menționează adresa pentru care soliciți certificatul...'
  },

  // Taxe și Impozite
  'certificat-fiscal-pf': {
    title: 'Cerere Certificat Fiscal - Persoană Fizică',
    category: 'taxe-impozite',
    scopPlaceholder: 'Menționează scopul pentru care soliciți certificatul fiscal...'
  },
  'certificat-fiscal-pj': {
    title: 'Cerere Certificat Fiscal - Persoană Juridică',
    category: 'taxe-impozite',
    additionalFields: ['numeFirma', 'cui', 'nrRegistruComert', 'reprezentantLegal'],
    scopPlaceholder: 'Menționează scopul pentru care soliciți certificatul fiscal...'
  },
  'radiere-imobile': {
    title: 'Cerere Radiere Clădiri/Terenuri',
    category: 'taxe-impozite',
    scopPlaceholder: 'Menționează imobilele pe care dorești să le radiezi și motivul...',
    requiresAttachments: true
  },
  'radiere-auto': {
    title: 'Cerere Radiere Mijloc de Transport',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'serieSasiu', 'anFabricatie'],
    scopPlaceholder: 'Menționează motivul radierii (vânzare, casare, etc.)...',
    requiresAttachments: true
  },
  'declaratie-auto': {
    title: 'Declarație Fiscală Mijloace de Transport',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'serieSasiu', 'anFabricatie', 'capacitateCilindrica'],
    scopPlaceholder: 'Declară mijlocul de transport pentru stabilirea impozitului...',
    requiresAttachments: true
  },
  'declaratie-marfa': {
    title: 'Declarație Fiscală Transport Marfă',
    category: 'taxe-impozite',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'masaMaxima'],
    scopPlaceholder: 'Declară vehiculul de marfă peste 12 tone...',
    requiresAttachments: true
  },
  'declaratie-teren-pf': {
    title: 'Declarație Fiscală Teren - Persoană Fizică',
    category: 'taxe-impozite',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    scopPlaceholder: 'Declară terenul pentru stabilirea impozitului...',
    requiresAttachments: true
  },
  'declaratie-cladire-pf': {
    title: 'Declarație Fiscală Clădire - Persoană Fizică',
    category: 'taxe-impozite',
    additionalFields: ['tipConstructie', 'suprafataConstructie', 'anConstructie'],
    scopPlaceholder: 'Declară clădirea pentru stabilirea impozitului...',
    requiresAttachments: true
  },

  // SPCLEP (Stare Civilă)
  'act-identitate': {
    title: 'Cerere Eliberare Act de Identitate',
    category: 'spclep',
    scopPlaceholder: 'Menționează tipul actului (CI/buletin) și motivul (prima eliberare, expirare, pierdere)...',
    requiresAttachments: true
  },
  'stabilire-resedinta': {
    title: 'Cerere Stabilire Reședință',
    category: 'spclep',
    scopPlaceholder: 'Menționează noua adresă de reședință și perioada...',
    requiresAttachments: true
  },
  'transcriere-nastere': {
    title: 'Cerere Transcriere Certificat de Naștere',
    category: 'spclep',
    scopPlaceholder: 'Menționează țara unde a fost emis certificatul și datele persoanei...',
    requiresAttachments: true
  },
  'certificat-nastere': {
    title: 'Cerere Certificat de Naștere',
    category: 'spclep',
    scopPlaceholder: 'Menționează dacă este original sau duplicat și motivul solicitării...',
    requiresAttachments: true
  }
};

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

  // ANTET INSTITUȚIE (per-tenant, from lib/tenant.ts)
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(removeDiacritics(TENANT.antetOficial), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(removeDiacritics(TENANT.judet), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  pdf.text(removeDiacritics(`Tel: ${TENANT.telefon} | Email: ${TENANT.email}`), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

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

  // Către
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(removeDiacritics('Catre: PRIMARIA COMUNEI FILIPESTI'), margin, yPosition);
  yPosition += 6;
  pdf.text(removeDiacritics('In atentia: ________________________'), margin, yPosition);
  yPosition += 10;

  // SOLICITANT
  pdf.setFont('helvetica', 'bold');
  pdf.text(removeDiacritics('SOLICITANT:'), margin, yPosition);
  yPosition += 7;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(removeDiacritics(`Nume si prenume: ${data.numeComplet || ''}`), margin, yPosition);
  yPosition += 6;
  pdf.text(`CNP: ${data.cnp || ''}`, margin, yPosition);
  yPosition += 6;
  
  // Domiciliu pe o singură linie mai compactă
  let domiciliuText = `Domiciliul: Jud. ${data.judet || ''}, Loc. ${data.localitate || ''}`;
  if (data.strada) domiciliuText += `, Str. ${data.strada}`;
  if (data.numar) domiciliuText += ` nr. ${data.numar}`;
  if (data.bloc) domiciliuText += `, Bl. ${data.bloc}`;
  if (data.scara) domiciliuText += `, Sc. ${data.scara}`;
  if (data.apartament) domiciliuText += `, Ap. ${data.apartament}`;
  
  yPosition = addWrappedText(removeDiacritics(domiciliuText), margin, yPosition, pageWidth - 2 * margin);
  yPosition += 1;
  
  if (data.telefon || data.telefonMobil) {
    pdf.text(`Telefon: ${data.telefonMobil || data.telefon || ''}`, margin, yPosition);
    yPosition += 6;
  }
  pdf.text(`Email: ${data.email || ''}`, margin, yPosition);
  yPosition += 12;

  // CONȚINUT CERERE - dezvoltat în fraze
  let continutCerere = '';
  
  // Adaptează textul în funcție de tipul cererii
  switch(config.category) {
    case 'urbanism':
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, va rog sa aprobati eliberarea documentatiei necesare pentru ${config.title.toLowerCase()}.`;
      break;
    case 'asistenta-sociala':
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, solicit acordarea drepturilor prevazute de lege.`;
      break;
    case 'registru-agricol':
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, va rog sa-mi eliberati documentele solicitate din registrul agricol.`;
      break;
    case 'taxe-impozite':
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, solicit solutionarea favorabila a cererii privind situatia fiscala.`;
      break;
    case 'spclep':
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, solicit eliberarea actelor de stare civila.`;
      break;
    default:
      continutCerere = `Subsemnatul/a, ${data.numeComplet || ''}, va rog sa binevoiti a-mi aproba urmatoarea solicitare.`;
  }
  
  // Adaugă scopul specific dacă există
  if (data.scopulCererii && data.scopulCererii.trim()) {
    continutCerere += ' ' + data.scopulCererii;
  }
  
  // Adaugă date specifice în text continuu
  if (data.numeFirma) {
    continutCerere += ` Mentionez ca reprezint societatea ${data.numeFirma || ''}${data.cui ? ', CUI ' + data.cui : ''}${data.reprezentantLegal ? ', in calitate de ' + data.reprezentantLegal : ''}.`;
  }
  if (data.suprafataTeren) {
    continutCerere += ` Terenul in cauza are suprafata de ${data.suprafataTeren || ''}${data.nrCadastral ? ', numar cadastral ' + data.nrCadastral : ''}.`;
  }
  if (data.marcaAuto) {
    continutCerere += ` Vehiculul vizat este marca ${data.marcaAuto || ''}${data.nrInmatriculare ? ', numar inmatriculare ' + data.nrInmatriculare : 'neinmatriculat'}${data.anFabricatie ? ', an fabricatie ' + data.anFabricatie : ''}.`;
  }

  yPosition = addWrappedText(removeDiacritics(continutCerere), margin, yPosition, pageWidth - 2 * margin);
  yPosition += 10;

  // Documente anexate - NU afișa numele fișierelor, doar numărul
  if (data.fisiere && data.fisiere.length > 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.text(removeDiacritics(`Anexez ${data.fisiere.length} document${data.fisiere.length > 1 ? 'e' : ''} la prezenta cerere.`), margin, yPosition);
    yPosition += 10;
  }

  // Declarație pe proprie răspundere
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const declaratieText = 'Declar pe propria raspundere, cunoscand prevederile art. 326 din Codul Penal privind falsul in declaratii, ca datele furnizate sunt corecte si complete.';
  yPosition = addWrappedText(removeDiacritics(declaratieText), margin, yPosition, pageWidth - 2 * margin);
  yPosition += 12;

  // Semnătură și data - aliniate
  pdf.setFontSize(10);
  pdf.text(`Data: ${currentDate}`, margin, yPosition);
  pdf.text(removeDiacritics('Semnatura'), pageWidth - margin - 30, yPosition);
  yPosition += 8;
  pdf.text('_________________', margin, yPosition);
  pdf.text('_________________', pageWidth - margin - 30, yPosition);
  yPosition += 12;

  // Notă finală
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  const notaText = 'Nota: Cererea dumneavoastra va fi procesata in conformitate cu prevederile legale in vigoare. Termenul legal de solutionare este de 30 de zile de la data inregistrarii.';
  yPosition = addWrappedText(removeDiacritics(notaText), margin, yPosition, pageWidth - 2 * margin);

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