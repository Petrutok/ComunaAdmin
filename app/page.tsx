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
      bgColor: "bg-red-500/20"
    },
    {
      title: "Anunțuri Locale",
      description: "Publică și găsește anunțuri de vânzare, cumpărare sau schimb",
      icon: Newspaper,
      link: "/anunturi",
      buttonText: "Vezi Anunțuri",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    {
      title: "Locuri de Muncă",
      description: "Oportunități de angajare în comună și împrejurimi",
      icon: Briefcase,
      link: "/joburi",
      buttonText: "Vezi Joburi",
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      title: "Colectare Selectivă",
      description: "Calendar colectare deșeuri și informații despre reciclare",
      icon: Recycle,
      link: "/colectare-selectiva",
      buttonText: "Vezi Calendar",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20"
    },
    {
      title: "Plată Impozite",
      description: "Plătește online taxele și impozitele locale",
      icon: Receipt,
      link: "/taxes",
      buttonText: "Plătește Online",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      title: "Evenimente",
      description: "Evenimente culturale și activități în comunitate",
      icon: CalendarDays,
      link: "/events",
      buttonText: "Vezi Evenimente",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20"
    },
    {
      title: "Consilieri Locali",
      description: "Găsește informații de contact pentru consilierii locali",
      icon: Users,
      link: "/representatives",
      buttonText: "Vezi Lista",
      color: "text-sky-400",
      bgColor: "bg-sky-500/20"
    },
    {
      title: "Lucrări în Desfășurare",
      description: "Proiecte de infrastructură și modernizare în derulare",
      icon: Construction,
      link: "/ongoing-works",
      buttonText: "Vezi Lucrări",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20"
    },
   {
     title: "Cereri Online",
     description: "Completează și trimite cereri direct din aplicație",
     icon: FileText,
     link: "/cereri-online",
     buttonText: "Completează cerere",
     color: "text-purple-400",
     bgColor: "bg-purple-500/20"
},
    {
      title: "Ședințe Consiliu",
      description: "Ordine de zi, hotărâri și procese verbale",
      icon: Calendar,
      link: "/meeting-summaries",
      buttonText: "Vezi Ședințe",
      color: "text-gray-400",
      bgColor: "bg-gray-500/20"
    }
  ];
    
  return (
    <div className="min-h-screen bg-slate-900">
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
      <div className="bg-gradient-to-r from-slate-800 via-slate-800/95 to-slate-800 border-b border-slate-700/50">
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

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const colorClasses: Record<string, string> = {
              red: 'from-red-500/20 to-red-600/20 border-red-500/30 hover:border-red-400/50',
              blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-400/50',
              green: 'from-green-500/20 to-green-600/20 border-green-500/30 hover:border-green-400/50',
              emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-400/50',
              purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:border-purple-400/50',
              orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:border-orange-400/50',
              sky: 'from-sky-500/20 to-sky-600/20 border-sky-500/30 hover:border-sky-400/50',
              yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 hover:border-yellow-400/50',
              indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 hover:border-indigo-400/50',
              gray: 'from-gray-500/20 to-gray-600/20 border-gray-500/30 hover:border-gray-400/50'
            };
            const colorKey = card.color.split('-')[1];
            const cardColorClass = colorClasses[colorKey] || colorClasses.gray;
            
            return (
              <div key={index} className="transform transition-all duration-300 hover:scale-105">
                <Card className={`h-full bg-gradient-to-br ${cardColorClass} backdrop-blur-sm border-2 transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden group rounded-2xl relative flex flex-col`}>
                  {/* Animated gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      {/* Icon with glow effect */}
                      <div className="relative mb-4">
                        <div className={`absolute inset-0 ${card.bgColor} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                        <div className={`relative p-4 rounded-2xl ${card.bgColor} border border-white/20 shadow-lg group-hover:shadow-xl transition-all`}>
                          <Icon className={`h-8 w-8 md:h-10 md:w-10 ${card.color} drop-shadow-md`} strokeWidth={2.5} />
                        </div>
                      </div>
                      
                      {/* Title with enhanced visibility */}
                      <CardTitle className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-lg">
                        {card.title}
                      </CardTitle>
                      
                      {/* Description with better contrast */}
                      <CardDescription className="text-sm md:text-base text-gray-200 leading-relaxed font-medium">
                        {card.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 mt-auto relative z-10">
                    <Link href={card.link} className="block">
                      <Button 
                        className={`w-full bg-white/90 hover:bg-white text-slate-900 font-bold shadow-lg hover:shadow-xl transition-all duration-200 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 group/btn text-base md:text-lg border-2 border-white/20`}
                        size="lg"
                      >
                        <span>{card.buttonText}</span>
                        <span className="group-hover/btn:translate-x-1 transition-transform text-xl">→</span>
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
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

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-12">
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