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

// Every entry carries `obiect`: the formal object of the request, used in
// the generated petition PDF ("prin prezenta vă solicit respectuos {obiect}").
// Diacritics are fine here - the PDF generator strips them itself.
export const REQUEST_CONFIGS: { [key: string]: any } = {
  // Adeverințe (eliberate digital, cu semnătură și verificare QR)
  // requiresAccount: PDF-ul emis conține date personale și se livrează
  // exclusiv în "Dosarul meu", deci cetățeanul trebuie să fie autentificat
  'adeverinta-rol-agricol': {
    title: 'Adeverință de Rol Agricol',
    category: 'adeverinte',
    requiresAccount: true,
    obiect: 'eliberarea unei adeverințe de rol agricol',
    scopPlaceholder: 'Menționează scopul (ex: notariat, bancă, instanță) și, dacă știi, poziția de rol...',
  },
  'adeverinta-apia': {
    title: 'Adeverință pentru APIA',
    category: 'adeverinte',
    requiresAccount: true,
    obiect: 'eliberarea unei adeverințe privind terenurile înscrise în registrul agricol, necesară la dosarul de subvenții APIA',
    scopPlaceholder: 'Menționează campania APIA și suprafețele pentru care soliciți adeverința...',
  },
  'adeverinta-domiciliu': {
    title: 'Adeverință de Domiciliu / Componență Familie',
    category: 'adeverinte',
    requiresAccount: true,
    obiect: 'eliberarea unei adeverințe de domiciliu / componență a familiei',
    scopPlaceholder: 'Menționează scopul (școală, angajare, bursă) și persoanele din gospodărie...',
  },
  'adeverinta-ajutor-social': {
    title: 'Adeverință Ajutor Social / Alocație',
    category: 'adeverinte',
    requiresAccount: true,
    obiect: 'eliberarea unei adeverințe privind beneficiile de asistență socială',
    scopPlaceholder: 'Menționează tipul de beneficiu și instituția care solicită adeverința...',
  },
  'adeverinta-fara-datorii': {
    title: 'Adeverință Fără Datorii la Bugetul Local',
    category: 'adeverinte',
    requiresAccount: true,
    obiect: 'eliberarea unei adeverințe din care să rezulte că nu figurez cu datorii la bugetul local',
    scopPlaceholder: 'Menționează scopul (notariat, vânzare imobil, licitație)...',
  },

  // Solicitări Generale
  'cerere-generala': {
    title: 'Cerere Generală',
    category: 'general',
    obiect: 'soluționarea solicitării descrise în cele ce urmează',
    scopPlaceholder: 'Descrie detaliat cererea ta către primărie...'
  },
  'permis-foc': {
    title: 'Cerere Permis de Lucru cu Foc',
    category: 'general',
    obiect: 'eliberarea permisului de lucru cu focul pentru lucrările descrise în cele ce urmează',
    scopPlaceholder: 'Descrie lucrările care necesită permis de foc, locația și perioada...',
    requiresAttachments: true
  },
  'taiere-arbori': {
    title: 'Cerere Aviz Tăiere / Toaletare Arbori',
    category: 'general',
    obiect: 'eliberarea avizului pentru tăierea/toaletarea arborilor menționați în cele ce urmează',
    scopPlaceholder: 'Menționează numărul și specia arborilor, locația exactă și motivul (pericol, uscare, construcție)...'
  },
  'copie-arhiva': {
    title: 'Cerere Eliberare Copii din Arhivă',
    category: 'general',
    obiect: 'eliberarea unor copii certificate de pe documentele aflate în arhiva instituției',
    scopPlaceholder: 'Menționează documentul solicitat (tip, an, număr dacă îl cunoști) și scopul pentru care îl soliciți...'
  },
  'loc-veci': {
    title: 'Cerere Atribuire / Concesiune Loc de Veci',
    category: 'general',
    obiect: 'atribuirea în concesiune a unui loc de înhumare în cimitirul aflat în administrarea comunei',
    scopPlaceholder: 'Menționează cimitirul și dacă soliciți un loc nou sau reînnoirea unei concesiuni existente...'
  },

  // Urbanism
  'autorizatie-construire': {
    title: 'Cerere Autorizație de Construire',
    category: 'urbanism',
    obiect: 'emiterea autorizației de construire/desființare pentru imobilul descris în documentația anexată, în conformitate cu prevederile Legii nr. 50/1991',
    additionalFields: ['suprafataTeren', 'tipConstructie', 'suprafataConstructie'],
    requiresAttachments: true
  },
  'certificat-urbanism': {
    title: 'Cerere Certificat de Urbanism',
    category: 'urbanism',
    obiect: 'emiterea certificatului de urbanism pentru imobilul descris în documentația anexată, în conformitate cu prevederile Legii nr. 50/1991',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    requiresAttachments: true
  },
  'prelungire-autorizatie': {
    title: 'Cerere Prelungire Autorizație de Construire',
    category: 'urbanism',
    obiect: 'prelungirea termenului de valabilitate al autorizației de construire menționate în cele ce urmează',
    scopPlaceholder: 'Menționează numărul autorizației existente și motivul prelungirii...',
    requiresAttachments: true
  },
  'prelungire-certificat': {
    title: 'Cerere Prelungire Certificat de Urbanism',
    category: 'urbanism',
    obiect: 'prelungirea termenului de valabilitate al certificatului de urbanism menționat în cele ce urmează',
    scopPlaceholder: 'Menționează numărul certificatului existent și motivul prelungirii...',
    requiresAttachments: true
  },
  'incepere-lucrari': {
    title: 'Comunicare Începere Lucrări',
    category: 'urbanism',
    obiect: 'luarea în evidență a prezentei comunicări privind începerea execuției lucrărilor autorizate',
    scopPlaceholder: 'Menționează numărul autorizației de construire și data estimată de începere...'
  },
  'incheiere-lucrari': {
    title: 'Comunicare Încheiere Lucrări',
    category: 'urbanism',
    obiect: 'luarea în evidență a prezentei comunicări privind încheierea execuției lucrărilor autorizate',
    scopPlaceholder: 'Menționează numărul autorizației de construire și data finalizării...'
  },
  'ocupare-domeniu-public': {
    title: 'Cerere Ocupare Temporară Domeniu Public',
    category: 'urbanism',
    obiect: 'aprobarea ocupării temporare a domeniului public al comunei, în condițiile descrise în cele ce urmează',
    scopPlaceholder: 'Menționează suprafața, perioada și scopul (materiale de construcții, schelă, comerț stradal, eveniment)...'
  },

  // Asistență Socială
  'lemne-foc': {
    title: 'Cerere Lemne de Foc',
    category: 'asistenta-sociala',
    obiect: 'acordarea unui ajutor constând în lemne de foc pentru încălzirea locuinței',
    scopPlaceholder: 'Menționează situația ta socială și necesitatea ajutorului pentru încălzire...'
  },
  'ajutor-incalzire': {
    title: 'Cerere Ajutor pentru Încălzirea Locuinței',
    category: 'asistenta-sociala',
    obiect: 'acordarea ajutorului pentru încălzirea locuinței și, după caz, a suplimentului pentru energie, în conformitate cu prevederile Legii nr. 226/2021',
    scopPlaceholder: 'Menționează tipul de încălzire (lemne, gaze naturale, energie electrică) și componența familiei...',
    requiresAttachments: true
  },
  'indemnizatie-copil': {
    title: 'Adeverință Indemnizație Creștere Copil',
    category: 'asistenta-sociala',
    obiect: 'eliberarea unei adeverințe necesare la dosarul de indemnizație pentru creșterea copilului',
    scopPlaceholder: 'Menționează datele copilului și perioada pentru care soliciți adeverința...'
  },
  'indemnizatie-somaj': {
    title: 'Adeverință Indemnizație de Șomaj',
    category: 'asistenta-sociala',
    obiect: 'eliberarea unei adeverințe necesare la dosarul de indemnizație de șomaj',
    scopPlaceholder: 'Menționează perioada și scopul pentru care soliciți adeverința...'
  },
  'consiliere': {
    title: 'Cerere Informare și Consiliere',
    category: 'asistenta-sociala',
    obiect: 'acordarea de informare și consiliere de specialitate în situația descrisă în cele ce urmează',
    scopPlaceholder: 'Descrie situația ta și tipul de consiliere de care ai nevoie...'
  },
  'modificare-beneficii': {
    title: 'Cerere Modificare Beneficii Sociale',
    category: 'asistenta-sociala',
    obiect: 'modificarea beneficiilor de asistență socială de care beneficiez, conform celor descrise în cele ce urmează',
    scopPlaceholder: 'Menționează beneficiile actuale și modificările solicitate...',
    requiresAttachments: true
  },
  'alocatie-copii': {
    title: 'Cerere Alocație de Stat pentru Copii',
    category: 'asistenta-sociala',
    obiect: 'acordarea alocației de stat pentru copii, în conformitate cu prevederile Legii nr. 61/1993',
    scopPlaceholder: 'Menționează datele copilului/copiilor pentru care soliciți alocația...',
    requiresAttachments: true
  },
  'indemnizatie-crestere': {
    title: 'Cerere Indemnizație/Stimulent de Inserție',
    category: 'asistenta-sociala',
    obiect: 'acordarea indemnizației pentru creșterea copilului / stimulentului de inserție, în conformitate cu prevederile OUG nr. 111/2010',
    scopPlaceholder: 'Menționează datele copilului și tipul de indemnizație solicitat...',
    requiresAttachments: true
  },

  // Registru Agricol
  'adeverinta-rol': {
    title: 'Cerere Adeverință de Rol',
    category: 'registru-agricol',
    obiect: 'eliberarea unei adeverințe de rol, conform datelor din registrul agricol',
    scopPlaceholder: 'Menționează scopul pentru care soliciți adeverința de rol...'
  },
  'apia-pf': {
    title: 'Cerere Adeverință APIA - Persoană Fizică',
    category: 'registru-agricol',
    obiect: 'eliberarea adeverinței necesare la dosarul de subvenții APIA',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    scopPlaceholder: 'Menționează terenurile pentru care soliciți adeverința APIA...'
  },
  'apia-pj': {
    title: 'Cerere Adeverință APIA - Persoană Juridică',
    category: 'registru-agricol',
    obiect: 'eliberarea adeverinței necesare la dosarul de subvenții APIA pentru persoana juridică pe care o reprezint',
    additionalFields: ['numeFirma', 'cui', 'reprezentantLegal', 'suprafataTeren'],
    scopPlaceholder: 'Menționează terenurile pentru care soliciți adeverința APIA...'
  },
  'declaratie-registru': {
    title: 'Declarație pentru Registrul Agricol',
    category: 'registru-agricol',
    obiect: 'înregistrarea declarației pentru completarea/actualizarea datelor din registrul agricol, conform OG nr. 28/2008',
    scopPlaceholder: 'Declară modificările pentru actualizarea registrului agricol...',
    requiresAttachments: true
  },
  'nomenclatura-stradala': {
    title: 'Cerere Certificat Nomenclatură Stradală',
    category: 'registru-agricol',
    obiect: 'eliberarea certificatului de nomenclatură stradală și adresă pentru imobilul menționat în cele ce urmează',
    scopPlaceholder: 'Menționează adresa pentru care soliciți certificatul...'
  },
  'atestat-producator': {
    title: 'Cerere Atestat de Producător / Carnet de Comercializare',
    category: 'registru-agricol',
    obiect: 'eliberarea atestatului de producător și a carnetului de comercializare a produselor din sectorul agricol, în conformitate cu prevederile Legii nr. 145/2014',
    scopPlaceholder: 'Menționează produsele agricole pe care le comercializezi și suprafețele/efectivele din care provin...'
  },

  // Taxe și Impozite
  'certificat-fiscal-pf': {
    title: 'Cerere Certificat Fiscal - Persoană Fizică',
    category: 'taxe-impozite',
    obiect: 'eliberarea unui certificat de atestare fiscală, în conformitate cu prevederile art. 159 din Legea nr. 207/2015 privind Codul de procedură fiscală',
    scopPlaceholder: 'Menționează scopul pentru care soliciți certificatul fiscal...'
  },
  'certificat-fiscal-pj': {
    title: 'Cerere Certificat Fiscal - Persoană Juridică',
    category: 'taxe-impozite',
    obiect: 'eliberarea unui certificat de atestare fiscală pentru persoana juridică pe care o reprezint, în conformitate cu prevederile art. 159 din Legea nr. 207/2015',
    additionalFields: ['numeFirma', 'cui', 'nrRegistruComert', 'reprezentantLegal'],
    scopPlaceholder: 'Menționează scopul pentru care soliciți certificatul fiscal...'
  },
  'radiere-imobile': {
    title: 'Cerere Radiere Clădiri/Terenuri',
    category: 'taxe-impozite',
    obiect: 'scoaterea din evidențele fiscale ale comunei a imobilului descris în cele ce urmează',
    scopPlaceholder: 'Menționează imobilele pe care dorești să le radiezi și motivul...',
    requiresAttachments: true
  },
  'radiere-auto': {
    title: 'Cerere Radiere Mijloc de Transport',
    category: 'taxe-impozite',
    obiect: 'scoaterea din evidențele fiscale ale comunei a mijlocului de transport descris în cele ce urmează',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'serieSasiu', 'anFabricatie'],
    scopPlaceholder: 'Menționează motivul radierii (vânzare, casare, etc.)...',
    requiresAttachments: true
  },
  'declaratie-auto': {
    title: 'Declarație Fiscală Mijloace de Transport',
    category: 'taxe-impozite',
    obiect: 'înregistrarea declarației fiscale pentru stabilirea impozitului pe mijloacele de transport',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'serieSasiu', 'anFabricatie', 'capacitateCilindrica'],
    scopPlaceholder: 'Declară mijlocul de transport pentru stabilirea impozitului...',
    requiresAttachments: true
  },
  'declaratie-marfa': {
    title: 'Declarație Fiscală Transport Marfă',
    category: 'taxe-impozite',
    obiect: 'înregistrarea declarației fiscale pentru stabilirea impozitului pe mijloacele de transport de marfă cu masa totală autorizată de peste 12 tone',
    additionalFields: ['marcaAuto', 'nrInmatriculare', 'masaMaxima'],
    scopPlaceholder: 'Declară vehiculul de marfă peste 12 tone...',
    requiresAttachments: true
  },
  'declaratie-teren-pf': {
    title: 'Declarație Fiscală Teren - Persoană Fizică',
    category: 'taxe-impozite',
    obiect: 'înregistrarea declarației fiscale pentru stabilirea impozitului pe teren',
    additionalFields: ['suprafataTeren', 'nrCadastral'],
    scopPlaceholder: 'Declară terenul pentru stabilirea impozitului...',
    requiresAttachments: true
  },
  'declaratie-cladire-pf': {
    title: 'Declarație Fiscală Clădire - Persoană Fizică',
    category: 'taxe-impozite',
    obiect: 'înregistrarea declarației fiscale pentru stabilirea impozitului pe clădiri',
    additionalFields: ['tipConstructie', 'suprafataConstructie', 'anConstructie'],
    scopPlaceholder: 'Declară clădirea pentru stabilirea impozitului...',
    requiresAttachments: true
  },

  // SPCLEP (Stare Civilă)
  'act-identitate': {
    title: 'Cerere Eliberare Act de Identitate',
    category: 'spclep',
    obiect: 'eliberarea unui act de identitate',
    scopPlaceholder: 'Menționează tipul actului (CI/buletin) și motivul (prima eliberare, expirare, pierdere)...',
    requiresAttachments: true
  },
  'stabilire-resedinta': {
    title: 'Cerere Stabilire Reședință',
    category: 'spclep',
    obiect: 'înscrierea mențiunii de stabilire a reședinței în actul de identitate',
    scopPlaceholder: 'Menționează noua adresă de reședință și perioada...',
    requiresAttachments: true
  },
  'transcriere-nastere': {
    title: 'Cerere Transcriere Certificat de Naștere',
    category: 'spclep',
    obiect: 'transcrierea în registrele de stare civilă române a certificatului de naștere emis de autoritățile străine',
    scopPlaceholder: 'Menționează țara unde a fost emis certificatul și datele persoanei...',
    requiresAttachments: true
  },
  'certificat-nastere': {
    title: 'Cerere Certificat de Naștere',
    category: 'spclep',
    obiect: 'eliberarea certificatului de naștere (original sau duplicat)',
    scopPlaceholder: 'Menționează dacă este original sau duplicat și motivul solicitării...',
    requiresAttachments: true
  },
  'anexa-24': {
    title: 'Cerere Anexa 24 - Deschidere Procedură Succesorală',
    category: 'spclep',
    obiect: 'eliberarea sesizării pentru deschiderea procedurii succesorale (Anexa nr. 24) după defunctul/defuncta menționat(ă) în cele ce urmează',
    scopPlaceholder: 'Menționează numele defunctului, data decesului, ultimul domiciliu și moștenitorii cunoscuți...',
    requiresAttachments: true
  }
};
