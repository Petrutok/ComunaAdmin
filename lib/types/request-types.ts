// Tipuri de cereri disponibile
export const REQUEST_TYPES = {
  'adeverinta-domiciliu': 'Adeverință de domiciliu',
  'adeverinta-apia': 'Cerere eliberare adeverință APIA',
  'declaratie-proprie': 'Declarație pe propria răspundere',
  'audienta-primar': 'Cerere pentru audiență la primar',
  'spatiu-verde': 'Solicitare spațiu verde / teren agricol',
  'eliberare-documente': 'Cerere pentru eliberare documente',
  'alte-cereri': 'Alte cereri'
} as const;

export type RequestType = keyof typeof REQUEST_TYPES;

export interface RequestData {
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