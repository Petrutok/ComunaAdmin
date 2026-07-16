'use client';

// Boundary for the admin (staff) segment. A malformed document or a failed
// query in an admin page no longer leaves the clerk on a blank screen —
// they get a clear message and a way back to work.

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin-error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-slate-800 border border-slate-700 rounded-xl p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">A apărut o eroare</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Această pagină nu a putut fi afișată. Încercați din nou; dacă problema persistă,
          reveniți la panoul principal sau contactați administratorul.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Încearcă din nou
          </button>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Înapoi la panou
          </a>
        </div>
        {error?.digest && (
          <p className="text-slate-600 text-xs mt-6">Cod eroare: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
