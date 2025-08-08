import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cereri Online | Primăria Filipești',
  description: 'Trimite cereri online către Primăria Filipești',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function CereriOnlineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
