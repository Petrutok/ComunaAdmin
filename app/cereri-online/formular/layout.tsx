import { Metadata } from 'next';

// Viewport configuration separat de metadata
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a', // Mutat aici din metadata
};

export const metadata: Metadata = {
  title: 'Completare Cerere | Primăria Comunei',
  description: 'Completează cererea online',
  // NU pune themeColor aici!
};

export default function FormularLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}