"use client";

// Floating capsule bottom navigation (mobile). Dark rounded pill that floats
// above content with side margins; every tab shows icon + label, and the
// active tab is highlighted by a filled pill behind it.
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
      {/* Spacer keeps page content clear of the floating bar on mobile */}
      <div className="h-24 md:hidden" aria-hidden="true" />

      <nav
        aria-label="Navigare principală"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
      >
        <div className="flex items-center gap-0.5 rounded-[1.75rem] border border-white/10 bg-slate-950/90 px-1.5 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-3xl px-2.5 py-1.5 transition-colors duration-200 ${
                  active ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
