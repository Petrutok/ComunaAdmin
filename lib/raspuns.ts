// Official written response (raspuns) to a citizen request.
// Client-safe: only strings and types, no server dependencies.
// The PDF itself is generated server-side in lib/pdf/generateRaspunsPDF.ts.

export type RaspunsStatus = 'rezolvat' | 'respins';

export const RASPUNS_STATUS_LABELS: Record<RaspunsStatus, string> = {
  rezolvat: 'Soluționare favorabilă',
  respins: 'Respingere motivată',
};

// Categories of cereri (REQUEST_CONFIGS.category) that can carry their
// own response template, editable in Admin -> Sabloane raspuns and
// stored in Firestore at config/raspuns_templates
export const RASPUNS_CATEGORY_LABELS: Record<string, string> = {
  general: 'Cereri generale',
  urbanism: 'Urbanism',
  'taxe-impozite': 'Taxe și impozite',
  'asistenta-sociala': 'Asistență socială',
  'registru-agricol': 'Registru agricol',
  spclep: 'Evidența populației (SPCLEP)',
  adeverinte: 'Adeverințe (răspuns de respingere)',
};

export const RASPUNS_TEMPLATES_DOC = 'config/raspuns_templates';

export const DEFAULT_RASPUNS_CORP = '[ Completați răspunsul instituției ]';

// Professional per-category default bodies, used when no template is
// configured in Admin -> Sabloane raspuns. Each keeps a [ ... ] slot for
// the actual solution, so the editor still warns until it is completed.
export const DEFAULT_RASPUNS_CORPURI: Record<string, string> = {
  general:
    'Solicitarea dumneavoastră a fost analizată de compartimentul de specialitate din cadrul ' +
    'instituției noastre.\n\n' +
    'În urma verificărilor efectuate, vă comunicăm că: [ soluția instituției, cu motivarea în fapt și în drept ].',
  urbanism:
    'Solicitarea dumneavoastră a fost analizată de compartimentul urbanism și amenajarea ' +
    'teritoriului, prin raportare la prevederile Legii nr. 50/1991 privind autorizarea executării ' +
    'lucrărilor de construcții și la documentațiile de urbanism aprobate.\n\n' +
    'În urma verificărilor efectuate, vă comunicăm că: [ soluția instituției, cu motivarea în fapt și în drept ].',
  'taxe-impozite':
    'Solicitarea dumneavoastră a fost analizată de compartimentul impozite și taxe locale, pe baza ' +
    'evidențelor fiscale ale comunei și a prevederilor Legii nr. 227/2015 privind Codul fiscal și ' +
    'ale Legii nr. 207/2015 privind Codul de procedură fiscală.\n\n' +
    'În urma verificărilor efectuate, vă comunicăm că: [ soluția instituției, cu motivarea în fapt și în drept ].',
  'asistenta-sociala':
    'Solicitarea dumneavoastră a fost analizată de compartimentul de asistență socială, prin ' +
    'raportare la legislația aplicabilă beneficiilor de asistență socială.\n\n' +
    'În urma verificării dosarului și a condițiilor de eligibilitate, vă comunicăm că: ' +
    '[ soluția instituției, cu motivarea în fapt și în drept ].',
  'registru-agricol':
    'Solicitarea dumneavoastră a fost analizată de compartimentul registrul agricol, pe baza ' +
    'datelor înscrise în registrul agricol al comunei, ținut în conformitate cu prevederile ' +
    'OG nr. 28/2008.\n\n' +
    'În urma verificărilor efectuate, vă comunicăm că: [ soluția instituției, cu motivarea în fapt și în drept ].',
  spclep:
    'Solicitarea dumneavoastră a fost analizată de serviciul public comunitar local de evidență a ' +
    'persoanelor / compartimentul de stare civilă, în conformitate cu legislația privind actele de ' +
    'stare civilă și evidența persoanelor.\n\n' +
    'În urma verificărilor efectuate, vă comunicăm că: [ soluția instituției, cu motivarea în fapt și în drept ].',
  adeverinte:
    'Solicitarea dumneavoastră privind eliberarea adeverinței a fost analizată de compartimentul ' +
    'de specialitate.\n\n' +
    'În urma verificării evidențelor aflate la dispoziția instituției, vă comunicăm că cererea nu ' +
    'poate fi soluționată favorabil, pentru următoarele motive: [ motivarea respingerii, în fapt și în drept ].',
};

export interface RaspunsTemplateData {
  numeComplet: string;
  adresa?: string;
  numarCerere?: string;
  dataCerere?: string;
  tipCerere?: string;
}

// Prefilled body the clerk edits before issuing. [ ... ] marks the
// parts that must be completed, same convention as buildAdeverintaBody.
// `corp` replaces the middle section - the per-category template goes
// there; header and legal footer stay identical for every response.
export function buildRaspunsBody(c: RaspunsTemplateData, corp?: string): string {
  const ref = c.numarCerere
    ? `cererii dumneavoastră înregistrate cu nr. ${c.numarCerere}${c.dataCerere ? ` din data de ${c.dataCerere}` : ''}`
    : 'cererii dumneavoastră';

  return (
    `Către: ${c.numeComplet}` +
    (c.adresa ? `\nAdresa: ${c.adresa}` : '') +
    `\n\nCa urmare a ${ref}${c.tipCerere ? `, având ca obiect ${c.tipCerere},` : ','} vă comunicăm următoarele:\n\n` +
    `${corp?.trim() || DEFAULT_RASPUNS_CORP}\n\n` +
    `Prezentul răspuns a fost formulat în termenul legal, în conformitate cu prevederile ` +
    `Ordonanței Guvernului nr. 27/2002 privind reglementarea activității de soluționare a petițiilor, ` +
    `aprobată cu modificări prin Legea nr. 233/2002.\n\n` +
    `Împotriva prezentului răspuns vă puteți adresa instanței de contencios administrativ competente, ` +
    `în condițiile Legii nr. 554/2004.`
  );
}
