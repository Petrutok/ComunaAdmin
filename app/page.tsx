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
      {/* Modern Balanced Header */}
      <header className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        {/* Main Header Content */}
        <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-2xl border border-slate-700/50 shadow-xl">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 48 48" fill="none">
                      <path d="M24 4L6 14V44H18V32H30V44H42V14L24 4Z" fill="url(#gradient1)" stroke="white" strokeWidth="1.5" opacity="0.8"/>
                      <path d="M24 4L42 14H6L24 4Z" fill="url(#gradient2)" stroke="white" strokeWidth="1.5" opacity="0.9"/>
                      <rect x="10" y="20" width="6" height="6" fill="white" fillOpacity="0.9"/>
                      <rect x="21" y="20" width="6" height="6" fill="white" fillOpacity="0.9"/>
                      <rect x="32" y="20" width="6" height="6" fill="white" fillOpacity="0.9"/>
                      <circle cx="24" cy="12" r="3" fill="white" fillOpacity="1"/>
                      <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Title and Subtitle */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Primăria Digitală
                </h1>
                <p className="text-sm md:text-base text-gray-300">
                  Comuna Filipești • Servicii publice moderne
                </p>
              </div>
            </div>
            
            {/* Right Section - CTAs and Info */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-4">
              {/* Quick Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Online 24/7</span>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">Securizat</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Contact</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Bell className="h-4 w-4" />
                  <span className="ml-2">Notificări</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Accent Line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
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