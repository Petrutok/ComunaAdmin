'use client';

// Boundary for the citizen-facing segment. Catches runtime errors in any
// public page so a citizen never hits a blank "Application error" screen.

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">A apărut o eroare neașteptată</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Ne pare rău, pagina nu a putut fi afișată. Încercați din nou; dacă problema persistă,
          reveniți la pagina principală.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Încearcă din nou
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 text-gray-300 hover:bg-slate-800 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Home className="h-4 w-4" />
            Pagina principală
          </Link>
        </div>
        {error?.digest && (
          <p className="text-slate-600 text-xs mt-6">Cod eroare: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
