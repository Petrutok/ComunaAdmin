import PDFDocument from 'pdfkit';

// Export tipurile din fișierul route
export type RequestType = 'adeverinta-domiciliu' | 'adeverinta-apia' | 'declaratie-proprie' | 
                         'audienta-primar' | 'spatiu-verde' | 'eliberare-documente' | 'alte-cereri';

export const REQUEST_TYPES = {
  'adeverinta-domiciliu': 'Adeverință de domiciliu',
  'adeverinta-apia': 'Cerere eliberare adeverință APIA',
  'declaratie-proprie': 'Declarație pe propria răspundere',
  'audienta-primar': 'Cerere pentru audiență la primar',
  'spatiu-verde': 'Solicitare spațiu verde / teren agricol',
  'eliberare-documente': 'Cerere pentru eliberare documente',
  'alte-cereri': 'Alte cereri'
} as const;

interface RequestData {
  numeComplet: string;
  cnp: string;
  localitate: string;
  adresa: string;
  telefon: string;
  email: string;
  tipCerere: RequestType;
  scopulCererii: string;
  documente?: string[];
}

export async function generatePDF(data: RequestData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Antet
      doc.fontSize(10)
         .text('PRIMĂRIA COMUNEI', 50, 50)
         .text('Județul ______', 50, 65)
         .text(`Nr. _____ / ${new Date().toLocaleDateString('ro-RO')}`, 450, 65);

      // Titlu cerere
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(getRequestTitle(data.tipCerere).toUpperCase(), 50, 120, { align: 'center' });

      // Reset font
      doc.font('Helvetica')
         .fontSize(11);

      // Conținut specific tipului de cerere
      const content = getRequestContent(data);
      doc.text(content, 50, 180, {
        align: 'justify',
        width: 495,
        lineGap: 5
      });

      // Semnătură și dată
      const bottomY = doc.page.height - 150;
      
      doc.text('Data:', 50, bottomY)
         .text(new Date().toLocaleDateString('ro-RO'), 100, bottomY);

      doc.text('Semnătura:', 350, bottomY)
         .text('_________________', 420, bottomY);

      // Footer cu date de contact
      doc.fontSize(9)
         .fillColor('#666666')
         .text(`Contact: ${data.telefon} | ${data.email}`, 50, doc.page.height - 50, {
           align: 'center',
           width: 495
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getRequestTitle(tipCerere: RequestType): string {
  const titles: Record<RequestType, string> = {
    'adeverinta-domiciliu': 'CERERE PENTRU ELIBERARE ADEVERINȚĂ DE DOMICILIU',
    'adeverinta-apia': 'CERERE PENTRU ELIBERARE ADEVERINȚĂ APIA',
    'declaratie-proprie': 'DECLARAȚIE PE PROPRIA RĂSPUNDERE',
    'audienta-primar': 'CERERE PENTRU AUDIENȚĂ',
    'spatiu-verde': 'CERERE PENTRU ATRIBUIRE SPAȚIU VERDE/TEREN',
    'eliberare-documente': 'CERERE PENTRU ELIBERARE DOCUMENTE',
    'alte-cereri': 'CERERE'
  };
  
  return titles[tipCerere] || 'CERERE';
}

function getRequestContent(data: RequestData): string {
  const baseInfo = `Subsemnatul(a) ${data.numeComplet}, CNP ${data.cnp}, domiciliat(ă) în ${data.localitate}, la adresa ${data.adresa}, număr de telefon ${data.telefon}, email ${data.email},`;

  switch (data.tipCerere) {
    case 'adeverinta-domiciliu':
      return `${baseInfo}

Prin prezenta, vă rog să îmi aprobați eliberarea unei adeverințe de domiciliu.

Menționez că am nevoie de această adeverință pentru: ${data.scopulCererii}

Declar pe propria răspundere că datele furnizate sunt reale și corecte, cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații.

Vă mulțumesc anticipat!`;

    case 'adeverinta-apia':
      return `${baseInfo}

Prin prezenta, vă rog să îmi eliberați o adeverință necesară pentru dosarul APIA.

Scopul cererii: ${data.scopulCererii}

Menționez că dețin terenuri agricole în extravilanul/intravilanul comunei, conform registrului agricol.

Vă mulțumesc!`;

    case 'declaratie-proprie':
      return `${baseInfo}

Declar pe propria răspundere, cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații, următoarele:

${data.scopulCererii}

Dau prezenta declarație spre a-mi servi la cele legale.`;

    case 'audienta-primar':
      return `${baseInfo}

Prin prezenta, vă rog să îmi aprobați o audiență la domnul/doamna Primar.

Motivul solicitării audienței: ${data.scopulCererii}

Sunt disponibil(ă) în zilele de audiență stabilite de primărie și voi respecta programul stabilit.

Vă mulțumesc pentru înțelegere!`;

    case 'spatiu-verde':
      return `${baseInfo}

Prin prezenta, vă adresez respectuos rugămintea de a-mi aproba atribuirea în folosință a unui spațiu verde/teren agricol aparținând domeniului public/privat al comunei.

Scopul utilizării: ${data.scopulCererii}

Mă angajez să respect toate condițiile impuse de primărie și să întrețin terenul în mod corespunzător.

Vă mulțumesc!`;

    case 'eliberare-documente':
      return `${baseInfo}

Prin prezenta, vă rog să îmi aprobați eliberarea următoarelor documente:

${data.scopulCererii}

${data.documente && data.documente.length > 0 ? `Documente solicitate:\n${data.documente.map(doc => `- ${doc}`).join('\n')}` : ''}

Vă mulțumesc pentru solicitudine!`;

    default:
      return `${baseInfo}

Prin prezenta, vă adresez următoarea solicitare:

${data.scopulCererii}

Vă rog să analizați cererea mea și să îmi comunicați răspunsul dumneavoastră.

Cu respect,`;
  }
}