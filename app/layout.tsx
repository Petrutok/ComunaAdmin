import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { NotificationProvider } from '@/components/NotificationProvider';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
 title: 'Comuna - Primăria Digitală',
 description: 'Platformă digitală pentru cetățeni',
 manifest: '/manifest.json',
 appleWebApp: {
   capable: true,
   statusBarStyle: 'black-translucent',
   title: 'Comuna',
 },
 viewport: {
   width: 'device-width',
   initialScale: 1,
   maximumScale: 1,
   userScalable: false,
   viewportFit: 'cover',
 },
 themeColor: '#1e293b',
 other: {
   'apple-mobile-web-app-capable': 'yes',
   'apple-mobile-web-app-status-bar-style': 'black-translucent',
   'apple-mobile-web-app-title': 'Comuna',
 }
};

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
   <html lang="ro">
     <head>
       <link rel="apple-touch-icon" href="/icon-192x192.png" />
       <link rel="apple-touch-icon" sizes="152x152" href="/icon-192x192.png" />
       <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
       <link rel="apple-touch-icon" sizes="167x167" href="/icon-192x192.png" />
       <meta name="apple-mobile-web-app-capable" content="yes" />
       <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
       <meta name="apple-mobile-web-app-title" content="Comuna" />
     </head>
     <body className={inter.className}>
       <NotificationProvider>
         {children}
         <PWAInstallPrompt />
       </NotificationProvider>
       <Toaster />
     </body>
   </html>
 );
}