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
  FileText,
  AlertTriangle,
  Shield,
  User,
  Mail, // ADĂUGAT: Import pentru iconița Mail
  Building2,
  Users as UsersIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';

function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newEmailsCount, setNewEmailsCount] = useState(0); // ADĂUGAT: State pentru numărul de email-uri noi
  const { user, logout, isAdmin } = useAdminAuth();

  // ADĂUGAT: Effect pentru a obține numărul de email-uri noi
  useEffect(() => {
    const fetchNewEmailsCount = async () => {
      try {
        // Aici ar trebui să faci un call la API pentru a obține numărul real
        // const response = await fetch('/api/registratura/count-new');
        // const data = await response.json();
        // setNewEmailsCount(data.count);
        
        // Pentru test, setăm o valoare mock
        setNewEmailsCount(3);
      } catch (error) {
        console.error('Error fetching new emails count:', error);
      }
    };

    fetchNewEmailsCount();
    // Refresh la fiecare 30 de secunde
    const interval = setInterval(fetchNewEmailsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/cereri', label: 'Cereri', icon: FileText },
    {
      href: '/admin/registratura',
      label: 'Registratură',
      icon: Mail,
      badge: newEmailsCount // Badge pentru email-uri noi
    },
    { href: '/admin/departments', label: 'Departamente', icon: Building2 },
    { href: '/admin/users', label: 'Utilizatori', icon: UsersIcon },
    { href: '/admin/issues', label: 'Probleme Raportate', icon: AlertTriangle },
    { href: '/admin/notificari', label: 'Notificări', icon: Bell },
    { href: '/admin/announcements', label: 'Anunțuri', icon: Newspaper },
    { href: '/admin/jobs', label: 'Joburi', icon: Briefcase },
  ];

  // Pentru login page, nu afișa navigația
  if (pathname === '/admin/login' || !isAdmin) {
    return null;
  }

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 rounded-lg p-2">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {/* ADĂUGAT: Afișare badge pentru email-uri noi */}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}

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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {/* ADĂUGAT: Badge și pentru mobile */}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {user && (
              <div className="mt-4 pt-4 border-t border-slate-700 px-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-gray-300 hover:text-white"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAdminAuth();
  const pathname = usePathname();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
            <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-400">Se verifică autentificarea...</p>
        </div>
      </div>
    );
  }

  // Dacă nu e admin și nu e pe pagina de login, arată mesaj
  if (!isAdmin && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Acces Restricționat</h2>
            <p className="text-gray-400 mb-4">
              Nu aveți permisiunea de a accesa această pagină.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = '/admin/login'}
            >
              Mergi la Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
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
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ProtectedContent>{children}</ProtectedContent>
        </main>
      </div>
    </AdminAuthProvider>
  );
}

// Import Card dacă nu există
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}