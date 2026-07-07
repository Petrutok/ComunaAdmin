"use client";

// Mobile bottom navigation - the standard pattern for app-like navigation.
// Hidden on desktop (md+) and in the admin panel, which has its own nav.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, CalendarClock, FolderOpen, UserCircle } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Acasă', icon: Home, exact: true },
  { href: '/cereri-online', label: 'Cereri', icon: FileText },
  { href: '/programari', label: 'Programări', icon: CalendarClock },
  { href: '/dosarul-meu', label: 'Dosar', icon: FolderOpen },
  { href: '/cont', label: 'Cont', icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;

  return (
    <>
      {/* Spacer keeps page content clear of the fixed bar on mobile */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
