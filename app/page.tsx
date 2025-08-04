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
      {/* Modern Header */}
      <header className="relative bg-gradient-to-b from-slate-900 via-slate-800/95 to-slate-800/90 backdrop-blur-lg border-b border-slate-700/50">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4 border-b border-slate-700/30">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <a href="tel:0232123456" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">0232 123 456</span>
              </a>
              <span className="hidden sm:inline text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Comuna Filipești, Bacău</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-slate-700/50"
            >
              <Bell className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Notificări</span>
            </Button>
          </div>
          
          {/* Main Header Content */}
          <div className="py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Logo Container */}
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                
                {/* Logo Background */}
                <div className="relative bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1 border border-slate-700/50 shadow-2xl">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4">
                    {/* Aici ar trebui să fie logo-ul tău real */}
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                      <svg 
                        viewBox="0 0 100 100" 
                        className="w-16 h-16 md:w-20 md:h-20"
                        fill="none"
                      >
                        {/* Simplified representation of your logo */}
                        <rect x="10" y="30" width="80" height="50" rx="8" fill="#3B82F6" opacity="0.2"/>
                        <rect x="20" y="40" width="60" height="30" rx="4" fill="#1E40AF" opacity="0.4"/>
                        <circle cx="30" cy="25" r="15" fill="#60A5FA" opacity="0.3"/>
                        <path d="M25 55 L35 45 L45 50 L55 40 L65 48 L75 45" stroke="#3B82F6" strokeWidth="2"/>
                        <circle cx="50" cy="25" r="8" fill="#DBEAFE"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Title Section */}
              <div className="text-center md:text-left flex-1">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                    Primăria Digitală
                  </h1>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 hidden md:inline-flex">
                    v2.0
                  </Badge>
                </div>
                
                <p className="text-lg md:text-xl text-gray-300 mb-4">
                  Comuna Filipești — Servicii publice la un click distanță
                </p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Disponibil 24/7</span>
                  </div>
                  <span className="text-slate-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>Pentru toți cetățenii</span>
                  </div>
                  <span className="text-slate-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Shield className="h-4 w-4" />
                    <span>100% Securizat</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions (Desktop) */}
              <div className="hidden lg:flex items-center gap-3">
                <Button
                  variant="outline"
                  className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg">
                  <Bell className="h-4 w-4 mr-2" />
                  Activează Notificări
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
      </header>

      {/* Subtitle Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-gray-300">
            <span className="text-blue-400 font-medium">Accesează rapid</span> serviciile locale • 
            <span className="text-green-400 font-medium"> Economisește timp</span> • 
            <span className="text-purple-400 font-medium"> Fii informat</span>
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="transform transition-all duration-300">
                <Card className="h-full bg-slate-800 border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden group rounded-2xl relative flex flex-col">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    index % 4 === 0 ? 'from-red-400 to-red-600' :
                    index % 4 === 1 ? 'from-blue-400 to-blue-600' :
                    index % 4 === 2 ? 'from-green-400 to-green-600' :
                    'from-purple-400 to-purple-600'
                  }`} />

                  <CardHeader className="pb-3 md:pb-4 text-center pt-6 md:pt-8 flex-1 flex flex-col">
                    <CardTitle className="text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 text-white">
                      {card.title}
                    </CardTitle>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg bg-slate-700">
                      <div className={`${card.bgColor} w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center`}>
                        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 ${card.color}`} strokeWidth={2} />
                      </div>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-gray-300 leading-relaxed px-1 sm:px-2 font-medium flex-1">
                      {card.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 pb-4 md:pb-6 px-3 md:px-6">
                    <Link href={card.link} className="block">
                      <Button 
                        className="w-full bg-white text-slate-900 hover:bg-gray-100 font-semibold shadow-md hover:shadow-xl transition-all duration-200 text-xs md:text-sm py-2 md:py-3 rounded-lg flex items-center justify-center gap-1 md:gap-2"
                        size="sm"
                      >
                        <span>{card.buttonText}</span>
                        <span className="text-base md:text-lg">→</span>
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