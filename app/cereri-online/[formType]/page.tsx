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
  'certificat-urbanism': {
    title: 'Certificat de Urbanism',
    description: 'Solicită certificat de urbanism online'
  },
  'autorizatie-construire': {
    title: 'Autorizație de Construire',
    description: 'Depune cerere pentru autorizație de construire'
  },
  'adeverinta-fiscala': {
    title: 'Adeverință Fiscală',
    description: 'Obține adeverință fiscală online'
  },
  'certificat-deces': {
    title: 'Certificat de Deces',
    description: 'Solicită certificat de deces'
  },
  'certificat-nastere': {
    title: 'Certificat de Naștere',
    description: 'Solicită certificat de naștere'
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