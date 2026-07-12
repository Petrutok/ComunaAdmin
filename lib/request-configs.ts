// Pure data: request form types, labels and per-type UI hints.
// Kept separate from lib/simple-pdf-generator.ts so pages that only need
// the configs (form pages, admin lists) don't pull jsPDF into their bundle.

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
