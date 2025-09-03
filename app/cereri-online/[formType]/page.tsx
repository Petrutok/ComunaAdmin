import CerereFormularClient from './CerereFormularClient';
import { REQUEST_CONFIGS } from '@/lib/simple-pdf-generator';

export async function generateStaticParams() {
  const formTypes = Object.keys(REQUEST_CONFIGS);
  return formTypes.map((formType) => ({
    formType: formType,
  }));
}

export async function generateMetadata({ params }: { params: { formType: string } }) {
  const config = REQUEST_CONFIGS[params.formType];
  
  if (!config) {
    return {
      title: 'Cerere Online - Primăria Digitală',
      description: 'Completează cererea online'
    };
  }
  
  return {
    title: `${config.title} - Primăria Digitală`,
    description: config.scopPlaceholder || `Completează formularul pentru ${config.title}`
  };
}

interface PageProps {
  params: { formType: string }
}

export default function CerereFormularPage({ params }: PageProps) {
  return <CerereFormularClient formType={params.formType} />;
}