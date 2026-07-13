import type { Timestamp } from 'firebase/firestore';

// Monitorul Oficial Local - the legally mandated public register of
// local administrative acts (OUG 57/2019 - Codul administrativ,
// art. 197-200 + Anexa 1). Documents are PUBLIC by law: the Firestore
// collection and the Storage folder allow unauthenticated reads.

// The six standard sections from Anexa 1 la Codul administrativ
export type MolCategorie =
  | 'statut'
  | 'regulamente'
  | 'hotarari'
  | 'dispozitii'
  | 'financiare'
  | 'alte';

export const MOL_CATEGORII: Record<
  MolCategorie,
  { label: string; descriere: string }
> = {
  statut: {
    label: 'Statutul unității administrativ-teritoriale',
    descriere: 'Statutul comunei și actele de modificare a acestuia',
  },
  regulamente: {
    label: 'Regulamentele privind procedurile administrative',
    descriere: 'Regulamente privind proceduri administrative, ROF, alte regulamente',
  },
  hotarari: {
    label: 'Hotărârile autorității deliberative',
    descriere: 'Hotărârile Consiliului Local, cu anexele acestora',
  },
  dispozitii: {
    label: 'Dispozițiile autorității executive',
    descriere: 'Dispozițiile Primarului cu caracter normativ',
  },
  financiare: {
    label: 'Documente și informații financiare',
    descriere: 'Buget local, execuție bugetară, situații financiare, achiziții',
  },
  alte: {
    label: 'Alte documente',
    descriere: 'Minute ședințe, procese-verbale, declarații de căsătorie, alte publicații',
  },
};

export interface MolDocument {
  id: string;
  titlu: string;
  categorie: MolCategorie;
  /** Act number, ex: "HCL 12" -> "12"; free text (some acts have none) */
  numar?: string;
  /** Date of the act itself (dd.mm.yyyy input, stored as string) */
  dataAct?: string;
  /** Year used for filtering/grouping, derived at publish time */
  an: number;
  fisier: {
    name: string;
    storagePath: string;
    size?: number;
  };
  activ: boolean;
  publicatLa: Timestamp;
  publicatDe?: string;
  publicatDeNume?: string;
}
