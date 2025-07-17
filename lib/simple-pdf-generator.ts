// Alternativă simplă pentru generare PDF care funcționează pe Vercel
import { RequestData, RequestType } from '@/lib/types/request-types';

export async function generateSimplePDF(data: RequestData): Promise<Buffer> {
  // Generăm un HTML simplu care poate fi convertit în PDF
  const html = generateHTMLContent(data);
  
  // Pentru Vercel, folosim un API extern pentru conversie HTML->PDF
  // Opțiuni: 
  // 1. Puppeteer (mai complex)
  // 2. API extern (ex: pdfshift.io, pdflayer.com)
  // 3. Generare HTML și lăsăm clientul să printeze
  
  // Pentru simplitate, returnăm HTML ca Buffer pentru moment
  return Buffer.from(html, 'utf-8');
}

function generateHTMLContent(data: RequestData): string {
  const title = getRequestTitle(data.tipCerere);
  const content = getRequestContent(data);
  
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 40px 0;
      text-transform: uppercase;
    }
    .content {
      text-align: justify;
      margin: 30px 0;
      white-space: pre-wrap;
    }
    .signature {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header-info">
    <div>
      <strong>PRIMĂRIA COMUNEI</strong><br>
      Județul _______
    </div>
    <div>
      Nr. _____ / ${new Date().toLocaleDateString('ro-RO')}
    </div>
  </div>
  
  <h1 class="title">${title}</h1>
  
  <div class="content">${content}</div>
  
  <div class="signature">
    <div>
      <strong>Data:</strong> ${new Date().toLocaleDateString('ro-RO')}
    </div>
    <div>
      <strong>Semnătura:</strong> _________________
    </div>
  </div>
  
  <div class="footer">
    Contact: ${data.telefon} | ${data.email}<br>
    Document generat electronic prin aplicația Comuna
  </div>
</body>
</html>
  `;
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