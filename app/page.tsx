import Link from 'next/link';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
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
  Newspaper
} from 'lucide-react';
import { NotificationButton } from '@/components/NotificationButton';

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
      title: "Documente și Formulare",
      description: "Descarcă documente oficiale și formulare necesare",
      icon: FileText,
      link: "/documents",
      buttonText: "Vezi Documente",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/20"
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
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-800 shadow-2xl border-b border-slate-700/50 relative overflow-hidden">
        {/* Background decorativ */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          {/* Butonul de notificări în colțul din dreapta sus */}
          <div className="absolute top-4 right-4">
            <NotificationButton />
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-6 space-x-4">
              {/* Logo SVG Primărie */}
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12"
                  >
                    {/* Clădire primărie */}
                    <path d="M24 4L6 14V44H18V32H30V44H42V14L24 4Z" fill="url(#gradient1)" stroke="white" strokeWidth="2"/>
                    {/* Acoperiș */}
                    <path d="M24 4L42 14H6L24 4Z" fill="url(#gradient2)" stroke="white" strokeWidth="2"/>
                    {/* Uși și ferestre */}
                    <rect x="10" y="20" width="6" height="6" fill="white" fillOpacity="0.8"/>
                    <rect x="21" y="20" width="6" height="6" fill="white" fillOpacity="0.8"/>
                    <rect x="32" y="20" width="6" height="6" fill="white" fillOpacity="0.8"/>
                    {/* Turn cu ceas */}
                    <circle cx="24" cy="12" r="4" fill="white" fillOpacity="0.9"/>
                    <circle cx="24" cy="12" r="3" fill="#1e293b"/>
                    <line x1="24" y1="12" x2="24" y2="10" stroke="white" strokeWidth="1"/>
                    <line x1="24" y1="12" x2="26" y2="12" stroke="white" strokeWidth="1"/>
                    
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1e40af" />
                      </linearGradient>
                      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="#991b1b" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              
              {/* Titlu */}
              <div className="text-left">
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                  Comuna
                </h1>
                <p className="text-sm text-blue-400 font-semibold uppercase tracking-wider">
                  Primăria Digitală
                </p>
              </div>
            </div>
            
            {/* Separator animat */}
            <div className="flex items-center justify-center mb-6">
              <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent w-64"></div>
              <div className="mx-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent w-64"></div>
            </div>
            
            {/* Descriere */}
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Platformă digitală pentru cetățeni - raportează probleme, plătește taxe, 
              informează-te despre evenimente și proiecte locale
            </p>
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
                  {/* Decorative gradient line at top */}
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