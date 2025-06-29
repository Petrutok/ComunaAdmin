'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Briefcase,
  Home,
  LogOut,
  Menu,
  Newspaper,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/notifications', label: 'Notificări', icon: Bell },
    { href: '/admin/announcements', label: 'Anunțuri', icon: Newspaper },
    { href: '/admin/jobs', label: 'Joburi', icon: Briefcase },
  ];

  // Pentru login page, nu afișa navigația
  if (pathname === '/admin/login') {
    return null;
  }

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden md:block">
              admin@primaria.ro
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hidden md:flex"
              onClick={() => window.location.href = '/admin/login'}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-slate-900">
        {pathname !== '/admin/login' && <AdminNav />}
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </div>
    </AdminAuthProvider>
  );
}
