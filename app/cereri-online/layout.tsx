import { Metadata } from 'next';
import { TENANT } from '@/lib/tenant';

export const metadata: Metadata = {
  title: `Cereri Online | ${TENANT.numePrimarie}`,
  description: `Trimite cereri online către ${TENANT.numePrimarie}`,
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
