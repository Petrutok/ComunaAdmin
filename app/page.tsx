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
  FolderOpen,
  Phone,
  Shield,
  Heart,
  Code
} from 'lucide-react';
import Image from 'next/image';
import { ActiveAlertsBanner } from '@/components/ActiveAlertsBanner';
import { AccountButton } from '@/components/AccountButton';
import { HeaderGreeting } from '@/components/HeaderGreeting';
import { TENANT } from '@/lib/tenant';

export default function HomePage() {
  // Services grouped by intent - quick actions live above, in the hero
  const serviceGroups = [
    {
      heading: "Servicii",
      items: [
        { title: "Programare la primărie", description: "Ghișeu sau audiență, fără așteptare", icon: CalendarDays, link: "/programari", color: "text-cyan-400", iconBg: "bg-cyan-500/10" },
        { title: "Plată impozite", description: "Online, prin Ghișeul.ro", icon: Receipt, link: "/taxes", color: "text-purple-400", iconBg: "bg-purple-500/10" },
        { title: "Colectare selectivă", description: "Calendar și reguli de reciclare", icon: Recycle, link: "/colectare-selectiva", color: "text-emerald-400", iconBg: "bg-emerald-500/10" },
        { title: "Alerte locale", description: "Întreruperi, drumuri, urgențe", icon: Bell, link: "/alerte", color: "text-red-400", iconBg: "bg-red-500/10" },
      ],
    },
    {
      heading: "Comunitate",
      items: [
        { title: "Anunțuri locale", description: "Vânzare, cumpărare, servicii", icon: Newspaper, link: "/anunturi", color: "text-blue-400", iconBg: "bg-blue-500/10" },
        { title: "Locuri de muncă", description: "Joburi din comună și împrejurimi", icon: Briefcase, link: "/joburi", color: "text-green-400", iconBg: "bg-green-500/10" },
        { title: "Evenimente", description: "Ce se întâmplă în comună", icon: CalendarDays, link: "/events", color: "text-orange-400", iconBg: "bg-orange-500/10" },
        { title: "Lucrări în desfășurare", description: "Proiecte și stadiul lor", icon: Construction, link: "/ongoing-works", color: "text-yellow-400", iconBg: "bg-yellow-500/10" },
      ],
    },
    {
      heading: "Primărie",
      items: [
        { title: "Consilieri locali", description: "Contactele aleșilor tăi", icon: Users, link: "/representatives", color: "text-sky-400", iconBg: "bg-sky-500/10" },
        { title: "Ședințe de consiliu", description: "Ordine de zi și hotărâri", icon: Calendar, link: "/meeting-summaries", color: "text-gray-400", iconBg: "bg-gray-500/10" },
      ],
    },
  ];
    
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Urgent alerts banner (renders only while an alert is live) */}
      <ActiveAlertsBanner />

      {/* Modern Redesigned Header */}
      <header className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Main Header Content */}
        <div className="relative max-w-7xl mx-auto px-4 pb-8 pt-4 md:pb-10">
          {/* Top bar: local greeting on the left, account chip on the right */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <HeaderGreeting />
            <AccountButton />
          </div>
          <div className="flex justify-center">
            {/* Logo Section - Centrat */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                <div className="relative bg-slate-900/60 backdrop-blur-md p-1 rounded-2xl border border-white/20 hover:border-white/40 transition-colors duration-300 shadow-2xl">
                  <Image
                    src={TENANT.logoUrl}
                    alt={`Logo ${TENANT.numePrimarie}`}
                    width={100}
                    height={100}
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl"
                    priority
                  />
                </div>
              </div>

              {/* Title and Subtitle */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent mb-1">
                  Primăria Digitală
                </h1>
                <p className="text-base md:text-lg text-gray-200 font-medium">
                  {TENANT.numeComuna}
                </p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">
                  Servicii publice moderne • Online 24/7
                </p>
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Quick actions - same tile size as the service cards below,
          distinguished only by the gradient background */}
      <div className="max-w-7xl mx-auto px-4 -mt-2 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/report-issue" className="group">
            <div className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-r from-red-600/80 to-rose-700/80 p-5 shadow transition-all group-hover:shadow-lg group-hover:brightness-110">
              <div className="shrink-0 rounded-xl bg-white/15 p-3.5">
                <AlertTriangle className="h-8 w-8 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-snug">Raportează o problemă</p>
                <p className="mt-1 text-sm text-red-100 leading-snug">Groapă, iluminat, gunoi — cu poză</p>
              </div>
            </div>
          </Link>
          <Link href="/cereri-online" className="group">
            <div className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-indigo-700/80 p-5 shadow transition-all group-hover:shadow-lg group-hover:brightness-110">
              <div className="shrink-0 rounded-xl bg-white/15 p-3.5">
                <FileText className="h-8 w-8 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-snug">Trimite o cerere</p>
                <p className="mt-1 text-sm text-blue-100 leading-snug">Adeverințe și cereri, cu număr pe loc</p>
              </div>
            </div>
          </Link>
          <Link href="/dosarul-meu" className="group">
            <div className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-600/80 to-purple-700/80 p-5 shadow transition-all group-hover:shadow-lg group-hover:brightness-110">
              <div className="shrink-0 rounded-xl bg-white/15 p-3.5">
                <FolderOpen className="h-8 w-8 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-snug">Dosarul meu</p>
                <p className="mt-1 text-sm text-violet-100 leading-snug">Stadiul cererilor și sesizărilor tale</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Service groups */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        {serviceGroups.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
              {group.heading}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.link} key={item.link} className="group">
                    <div className="flex h-full items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/80 p-5 transition-all group-hover:border-slate-500 group-hover:bg-slate-800 group-hover:shadow-lg">
                      <div className={`shrink-0 rounded-xl p-3.5 ${item.iconBg}`}>
                        <Icon className={`h-8 w-8 ${item.color}`} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white leading-snug">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-400 leading-snug">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Contact Info */}
          <div className="text-center text-gray-300 mb-6">
            <p className="mb-2">
              <strong className="text-white">Program cu publicul:</strong> Luni - Vineri: 08:00 - 16:00
            </p>
            <p className="text-sm">
              Pentru urgențe, sunați la <a href="tel:112" className="text-blue-400 hover:underline">112</a>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800 pt-6">
            {/* Powered By Section */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <span>Ⓒ Powered by</span>
                <a 
                  href="https://primaria.digital" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  <Code className="h-4 w-4" />
                  <span>primaria.digital</span>
                </a>
                <span>for</span>
                <span className="text-gray-300 font-medium">{TENANT.numePrimarie}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Digitalizarea administrației publice locale
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}