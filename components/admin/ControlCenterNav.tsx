'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Home,
  FileText,
  Mail,
  Building2,
  Users,
  AlertTriangle,
  Bell,
  Newspaper,
  Briefcase,
} from 'lucide-react';

export function ControlCenterNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home, gradient: 'from-blue-600/20 to-blue-800/20', border: 'border-blue-500/30 hover:border-blue-400/50', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
    { href: '/admin/cereri', label: 'Cereri', icon: FileText, gradient: 'from-cyan-600/20 to-cyan-800/20', border: 'border-cyan-500/30 hover:border-cyan-400/50', iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400' },
    { href: '/admin/registratura', label: 'Registratură', icon: Mail, gradient: 'from-purple-600/20 to-purple-800/20', border: 'border-purple-500/30 hover:border-purple-400/50', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400' },
    { href: '/admin/departments', label: 'Departamente', icon: Building2, gradient: 'from-violet-600/20 to-violet-800/20', border: 'border-violet-500/30 hover:border-violet-400/50', iconBg: 'bg-violet-500/20', iconColor: 'text-violet-400' },
    { href: '/admin/users', label: 'Utilizatori', icon: Users, gradient: 'from-emerald-600/20 to-emerald-800/20', border: 'border-emerald-500/30 hover:border-emerald-400/50', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
    { href: '/admin/issues', label: 'Probleme', icon: AlertTriangle, gradient: 'from-orange-600/20 to-orange-800/20', border: 'border-orange-500/30 hover:border-orange-400/50', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400' },
    { href: '/admin/notificari', label: 'Notificări', icon: Bell, gradient: 'from-amber-600/20 to-amber-800/20', border: 'border-amber-500/30 hover:border-amber-400/50', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400' },
    { href: '/admin/announcements', label: 'Anunțuri', icon: Newspaper, gradient: 'from-pink-600/20 to-pink-800/20', border: 'border-pink-500/30 hover:border-pink-400/50', iconBg: 'bg-pink-500/20', iconColor: 'text-pink-400' },
    { href: '/admin/jobs', label: 'Joburi', icon: Briefcase, gradient: 'from-teal-600/20 to-teal-800/20', border: 'border-teal-500/30 hover:border-teal-400/50', iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link key={item.href} href={item.href}>
            <Card className={`bg-gradient-to-br ${item.gradient} ${item.border} ${isActive ? 'ring-2 ring-white/20' : ''} transition-all cursor-pointer group`}>
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`${item.iconBg} rounded-lg p-3 mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${item.iconColor}`} />
                </div>
                <p className="text-sm font-medium text-white">{item.label}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
