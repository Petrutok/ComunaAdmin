import Link from 'next/link';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
  AlertTriangle,
  Users,
  FileText,
  CalendarDays,
  Construction,
  Receipt,
  Leaf,
  Calendar,
  Briefcase,
  Home,
  Recycle,
  Newspaper,
  Bell,
  Menu,
  MapPin,
  Phone,
  Shield
} from 'lucide-react';
import { Resend } from 'resend';
import Image from 'next/image';

export default function HomePage() {
  const cards = [
    {
      title: "Raportează o Problemă",
      description: "Semnalează probleme din comună: gropi, iluminat defect, alte defecțiuni",
      icon: AlertTriangle,
      link: "/report-issue",
      buttonText: "Raportează",
      color: "text-red-400",
      iconBg: "bg-red-500/10"
    },
    {
      title: "Anunțuri Locale",
      description: "Publică și găsește anunțuri de vânzare, cumpărare sau schimb",
      icon: Newspaper,
      link: "/anunturi",
      buttonText: "Vezi Anunțuri",
      color: "text-blue-400",
      iconBg: "bg-blue-500/10"
    },
    {
      title: "Locuri de Muncă",
      description: "Oportunități de angajare în comună și împrejurimi",
      icon: Briefcase,
      link: "/joburi",
      buttonText: "Vezi Joburi",
      color: "text-green-400",
      iconBg: "bg-green-500/10"
    },
    {
      title: "Colectare Selectivă",
      description: "Calendar colectare deșeuri și informații despre reciclare",
      icon: Recycle,
      link: "/colectare-selectiva",
      buttonText: "Vezi Calendar",
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/10"
    },
    {
      title: "Plată Impozite",
      description: "Plătește online taxele și impozitele locale",
      icon: Receipt,
      link: "/taxes",
      buttonText: "Plătește Online",
      color: "text-purple-400",
      iconBg: "bg-purple-500/10"
    },
    {
      title: "Evenimente",
      description: "Evenimente culturale și activități în comunitate",
      icon: CalendarDays,
      link: "/events",
      buttonText: "Vezi Evenimente",
      color: "text-orange-400",
      iconBg: "bg-orange-500/10"
    },
    {
      title: "Consilieri Locali",
      description: "Găsește informații de contact pentru consilierii locali",
      icon: Users,
      link: "/representatives",
      buttonText: "Vezi Lista",
      color: "text-sky-400",
      iconBg: "bg-sky-500/10"
    },
    {
      title: "Lucrări în Desfășurare",
      description: "Proiecte de infrastructură și modernizare în derulare",
      icon: Construction,
      link: "/ongoing-works",
      buttonText: "Vezi Lucrări",
      color: "text-yellow-400",
      iconBg: "bg-yellow-500/10"
    },
   {
     title: "Cereri Online",
     description: "Completează și trimite cereri direct din aplicație",
     icon: FileText,
     link: "/cereri-online",
     buttonText: "Completează Cerere",
     color: "text-indigo-400",
     iconBg: "bg-indigo-500/10"
},
    {
      title: "Ședințe Consiliu",
      description: "Ordine de zi, hotărâri și procese verbale",
      icon: Calendar,
      link: "/meeting-summaries",
      buttonText: "Vezi Ședințe",
      color: "text-gray-400",
      iconBg: "bg-gray-500/10"
    }
  ];
    
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Modern Redesigned Header */}
      <header className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Main Header Content */}
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-10">
          <div className="flex justify-center">
            {/* Logo Section - Centrat */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-30"></div>
                <div className="relative bg-slate-900/50 backdrop-blur-sm p-1 rounded-2xl border border-white/10">
                  <Image 
                    src="/logo.jpg" 
                    alt="Logo Primăria Filipești"
                    width={100}
                    height={100}
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl"
                    priority
                  />
                </div>
              </div>
              
              {/* Title and Subtitle */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                  Primăria Digitală
                </h1>
                <p className="text-base md:text-lg text-gray-300">
                  Comuna Filipești
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Servicii publice moderne • Online 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Key Features - mic și discret */}
          <div className="flex items-center justify-center gap-3 mt-6 text-xs md:text-sm">
            <span className="text-gray-400">Digitalizare</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Accesibilitate</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Transparență</span>
            <span className="text-gray-600 hidden md:inline">•</span>
            <span className="text-gray-400 hidden md:inline">Servicii fără drumuri inutile</span>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-blue-400 rounded-full"></div>
              <span className="text-blue-400 font-medium">Accesează rapid</span>
              <span className="text-gray-400">serviciile locale</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-medium">Economisește timp</span>
              <span className="text-gray-400">cu soluții digitale</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-purple-400 rounded-full"></div>
              <span className="text-purple-400 font-medium">Fii informat</span>
              <span className="text-gray-400">în timp real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid - Stil similar cu imaginea */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            // Define border colors for each card
            const borderColors = [
              'border-t-red-500',      // Raportează o Problemă
              'border-t-blue-500',     // Anunțuri Locale
              'border-t-green-500',    // Locuri de Muncă
              'border-t-emerald-500',  // Colectare Selectivă
              'border-t-purple-500',   // Plată Impozite
              'border-t-orange-500',   // Evenimente
              'border-t-sky-500',      // Consilieri Locali
              'border-t-yellow-500',   // Lucrări în Desfășurare
              'border-t-indigo-500',   // Cereri Online
              'border-t-gray-500'      // Ședințe Consiliu
            ];
            
            return (
              <Link href={card.link} key={index} className="block group">
                <Card className={`h-full bg-slate-800 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden rounded-2xl flex flex-col border-t-4 ${borderColors[index]}`}>
                  <div className="p-6 sm:p-8 flex flex-col h-full">
                    {/* Icon centered */}
                    <div className="flex justify-center mb-6">
                      <div className={`p-4 rounded-2xl ${card.iconBg} border border-slate-700`}>
                        <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${card.color}`} strokeWidth={1.5} />
                      </div>
                    </div>
                    
                    {/* Title centered */}
                    <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-4">
                      {card.title}
                    </h3>
                    
                    {/* Description centered */}
                    <p className="text-sm text-gray-300 text-center mb-6 flex-1 line-clamp-3">
                      {card.description}
                    </p>

                    {/* Button */}
                    <Button 
                      className="w-full bg-slate-100 hover:bg-white text-slate-900 font-semibold py-3 rounded-full transition-all group-hover:scale-105 border border-slate-600"
                    >
                      <span className="text-sm sm:text-base">{card.buttonText}</span>
                      <span className="ml-2">→</span>
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Link href="/debug-mobile">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
            🔧 Debug Mobile (Dev Only)
          </Button>
        </Link>
      </div>
      
{/* BUTON TEMPORAR PENTRU TEST */}
<div className="fixed top-4 right-4 z-50 flex gap-2">
  <Link href="/notify-test">
    <button className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
      🔔 Test Notif
    </button>
  </Link>
</div>
      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-gray-300">
            <p className="mb-2">
              <strong className="text-white">Program cu publicul:</strong> Luni - Vineri: 08:00 - 16:00
            </p>
            <p className="text-sm">
              Pentru urgențe, sunați la <a href="tel:112" className="text-blue-400 hover:underline">112</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}