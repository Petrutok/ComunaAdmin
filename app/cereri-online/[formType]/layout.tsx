import { Metadata } from 'next';

// Metadata fără viewport și themeColor
export const metadata: Metadata = {
  title: 'Completare Cerere | Primăria Comunei',
  description: 'Completează cererea online',
};

// Viewport configuration separat
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function FormularLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}