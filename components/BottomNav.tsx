"use client";

// Floating capsule bottom navigation (mobile). Dark rounded pill that floats
// above content with side margins; icon-only, with the active tab highlighted
// by a filled pill that expands to show its label (Material-3 expressive
// style) - keeps the aesthetic icon-only while telling the user where they are.
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
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/90 px-2 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-full transition-all duration-300 ${
                  active
                    ? 'bg-white/15 px-4 py-2.5 text-white'
                    : 'px-3 py-2.5 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                {active && (
                  <span className="whitespace-nowrap text-sm font-semibold">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
