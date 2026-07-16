// Global 404: a mistyped URL or an old link lands here instead of a bare
// Next.js not-found page.

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-5">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Pagina nu a fost găsită</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Adresa accesată nu există sau a fost mutată.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Home className="h-4 w-4" />
          Pagina principală
        </Link>
      </div>
    </div>
  );
}
