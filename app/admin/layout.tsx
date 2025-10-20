'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';
import { ControlCenterNav } from '@/components/admin/ControlCenterNav';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isEmployee, userRole } = useAdminAuth();
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

  // If not authenticated and not on login page, show access denied
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
  if (!userRole && !isLoginPage) {
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
        <main className="max-w-7xl mx-auto px-4 py-8">
          {pathname !== '/admin/login' && pathname !== '/admin/login/' && <ControlCenterNav />}
          <ProtectedContent>{children}</ProtectedContent>
        </main>
      </div>
    </AdminAuthProvider>
  );
}

// Helper Card components
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
