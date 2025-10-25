// app/cereri-online/[formType]/page.tsx
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import Client Component cu dynamic import pentru a evita probleme de hidratare
const CerereFormularClient = dynamic(
  () => import('./CerereFormularClient'),
  { ssr: true }
);

// Tipurile corecte pentru Next.js Page Component
interface PageProps {
  params: Promise<{
    formType: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Metadata pentru fiecare tip de formular
const formMetadata: Record<string, { title: string; description: string }> = {
  // Solicitări Generale
  'cerere-generala': {
    title: 'Cerere Generală',
    description: 'Trimite o cerere către orice compartiment de specialitate din instituție'
  },
  'permis-foc': {
    title: 'Permis de Lucru cu Foc',
    description: 'Solicită permis pentru lucrări care implică foc deschis'
  },

  // Urbanism
  'certificat-urbanism': {
    title: 'Certificat de Urbanism',
    description: 'Solicită certificat de urbanism online'
  },
  'autorizatie-construire': {
    title: 'Autorizație de Construire',
    description: 'Depune cerere pentru autorizație de construire/desființare'
  },
  'prelungire-autorizatie': {
    title: 'Prelungire Autorizație',
    description: 'Solicită prelungirea valabilității autorizației de construire'
  },
  'prelungire-certificat': {
    title: 'Prelungire Certificat',
    description: 'Solicită prelungirea valabilității certificatului de urbanism'
  },
  'incepere-lucrari': {
    title: 'Comunicare Începere Lucrări',
    description: 'Notificare privind începerea execuției lucrărilor'
  },
  'incheiere-lucrari': {
    title: 'Comunicare Încheierea Lucrări',
    description: 'Notificare privind încheierea execuției lucrărilor'
  },

  // Asistență Socială
  'lemne-foc': {
    title: 'Cerere Lemne Foc',
    description: 'Ajutor pentru încălzirea locuinței'
  },
  'indemnizatie-copil': {
    title: 'Adeverință Indemnizație Creștere Copil',
    description: 'Pentru părinți cu copii mici'
  },
  'indemnizatie-somaj': {
    title: 'Adeverință Indemnizație de Șomaj',
    description: 'Pentru persoane fără loc de muncă'
  },
  'consiliere': {
    title: 'Cerere Informare și Consiliere',
    description: 'Asistență și îndrumare socială'
  },
  'modificare-beneficii': {
    title: 'Cerere Modificare Beneficii Sociale',
    description: 'Actualizare beneficii existente (ASF, VMG, etc)'
  },
  'alocatie-copii': {
    title: 'Cerere Alocație de Stat',
    description: 'Solicită alocația de stat pentru copii'
  },
  'indemnizatie-crestere': {
    title: 'Cerere Indemnizație Creștere Copil',
    description: 'Solicită indemnizație/stimulent de inserție'
  },

  // Registru Agricol
  'adeverinta-rol': {
    title: 'Cerere Adeverință de Rol',
    description: 'Confirmare proprietăți înregistrate'
  },
  'apia-pf': {
    title: 'Cerere Adeverință APIA - Persoană Fizică',
    description: 'Pentru subvenții agricole persoane fizice'
  },
  'apia-pj': {
    title: 'Cerere Adeverință APIA - Persoană Juridică',
    description: 'Pentru subvenții agricole persoane juridice'
  },
  'declaratie-registru': {
    title: 'Declarație Registru Agricol',
    description: 'Actualizare date registru agricol'
  },
  'nomenclatura-stradala': {
    title: 'Cerere Certificat Nomenclatură Stradală',
    description: 'Certificat denumire stradă'
  },

  // Taxe și Impozite
  'certificat-fiscal-pf': {
    title: 'Certificat Fiscal - Persoană Fizică',
    description: 'Situație fiscală persoane fizice'
  },
  'certificat-fiscal-pj': {
    title: 'Certificat Fiscal - Persoană Juridică',
    description: 'Situație fiscală persoane juridice'
  },
  'radiere-imobile': {
    title: 'Cerere Radiere Imobile',
    description: 'Scoaterea din evidențele fiscale a clădirilor/terenurilor'
  },
  'radiere-auto': {
    title: 'Cerere Radiere Vehicule',
    description: 'Scoaterea din evidență a mijloacelor de transport'
  },
  'declaratie-auto': {
    title: 'Declarație Fiscală Auto',
    description: 'Pentru stabilirea impozitului pe mijloace de transport'
  },
  'declaratie-marfa': {
    title: 'Declarație Fiscală Auto Marfă',
    description: 'Pentru vehicule de mare tonaj peste 12 tone'
  },
  'declaratie-teren-pf': {
    title: 'Declarație Impozit Teren - PF',
    description: 'Impozit pe teren pentru persoane fizice (ITL-003)'
  },
  'declaratie-cladire-pf': {
    title: 'Declarație Impozit Clădire - PF',
    description: 'Impozit clădiri rezidențiale pentru persoane fizice'
  },

  // SPCLEP (Stare Civilă)
  'act-identitate': {
    title: 'Cerere Act de Identitate',
    description: 'CI/Buletin nou sau duplicat'
  },
  'stabilire-resedinta': {
    title: 'Cerere Stabilire Reședința',
    description: 'Viză de reședință'
  },
  'transcriere-nastere': {
    title: 'Cerere Transcriere Certificat Naștere',
    description: 'Pentru acte emise în străinătate'
  },
  'certificat-nastere': {
    title: 'Certificat de Naștere',
    description: 'Solicită certificat de naștere original sau duplicat'
  },
  'certificat-deces': {
    title: 'Certificat de Deces',
    description: 'Solicită certificat de deces'
  },
  'certificat-casatorie': {
    title: 'Certificat de Căsătorie',
    description: 'Solicită certificat de căsătorie'
  },
  'autorizatie-functionare': {
    title: 'Autorizație de Funcționare',
    description: 'Solicită autorizație de funcționare pentru afacerea ta'
  },
  'certificat-proprietate': {
    title: 'Certificat de Proprietate',
    description: 'Solicită certificat de atestare a dreptului de proprietate'
  },
  'adeverinta-fiscala': {
    title: 'Adeverință Fiscală',
    description: 'Obține adeverință fiscală online'
  }
};

// Server Component - Page principal
export default async function Page({ params }: PageProps) {
  // Await params deoarece în Next.js 15 params este Promise
  const resolvedParams = await params;
  const formType = resolvedParams.formType;

  // Verifică dacă tipul de formular există
  if (!formMetadata[formType]) {
    notFound();
  }

  // Pass formType to Client Component
  return <CerereFormularClient formType={formType} />;
}

// Generează rutele statice pentru toate tipurile de formulare
export async function generateStaticParams() {
  return Object.keys(formMetadata).map((formType) => ({
    formType,
  }));
}

// Metadata dinamică pentru SEO
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const formType = resolvedParams.formType;
  
  const metadata = formMetadata[formType];
  
  if (!metadata) {
    return {
      title: 'Formular Inexistent | Primăria Digitală',
      description: 'Formularul solicitat nu a fost găsit'
    };
  }

  return {
    title: `${metadata.title} | Primăria Digitală Filipești`,
    description: metadata.description,
    openGraph: {
      title: `${metadata.title} | Primăria Digitală Filipești`,
      description: metadata.description,
      type: 'website',
    },
  };
}

// Revalidare la fiecare 24 de ore
export const revalidate = 86400;