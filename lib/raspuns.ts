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
