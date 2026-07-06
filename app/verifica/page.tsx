"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

interface VerifyResult {
  valid: boolean;
  numarIesire?: string;
  tipLabel?: string;
  emisLa?: string | null;
  numeMascat?: string;
  error?: string;
}

function VerificaContent() {
  const params = useSearchParams();
  const nr = params.get('nr');
  const cod = params.get('c');

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nr || !cod) {
      setResult({ valid: false, error: 'Link de verificare incomplet.' });
      setLoading(false);
      return;
    }
    fetch(`/api/verifica?nr=${encodeURIComponent(nr)}&c=${encodeURIComponent(cod)}`)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult({ valid: false, error: 'Verificarea a eșuat. Încercați din nou.' }))
      .finally(() => setLoading(false));
  }, [nr, cod]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card
          className={`border-2 ${
            loading
              ? 'bg-slate-800 border-slate-700'
              : result?.valid
              ? 'bg-emerald-950/40 border-emerald-500'
              : 'bg-red-950/40 border-red-500'
          }`}
        >
          <CardContent className="py-10 text-center space-y-4">
            {loading ? (
              <>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-400" />
                <p className="text-gray-300">Se verifică documentul...</p>
              </>
            ) : result?.valid ? (
              <>
                <ShieldCheck className="mx-auto h-16 w-16 text-emerald-400" />
                <h1 className="text-2xl font-bold text-emerald-300">Document autentic</h1>
                <div className="rounded-lg bg-slate-800/80 p-4 text-left text-sm space-y-2">
                  <p><span className="text-gray-400">Document:</span> <span className="text-white font-medium">{result.tipLabel}</span></p>
                  <p><span className="text-gray-400">Număr:</span> <span className="text-white font-mono">{result.numarIesire}</span></p>
                  <p><span className="text-gray-400">Titular:</span> <span className="text-white">{result.numeMascat}</span></p>
                  {result.emisLa && (
                    <p>
                      <span className="text-gray-400">Emis la:</span>{' '}
                      <span className="text-white">
                        {new Date(result.emisLa).toLocaleDateString('ro-RO', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Acest document a fost emis electronic de primărie prin platforma Primăria Digitală.
                </p>
              </>
            ) : (
              <>
                <ShieldX className="mx-auto h-16 w-16 text-red-400" />
                <h1 className="text-2xl font-bold text-red-300">Document neverificabil</h1>
                <p className="text-gray-300 text-sm">
                  {result?.error ||
                    'Nu există nicio adeverință emisă cu acest număr și cod de verificare. Documentul poate fi fals sau linkul este greșit.'}
                </p>
              </>
            )}

            <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm">
              <Home className="h-4 w-4" /> Primăria Digitală
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerificaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <VerificaContent />
    </Suspense>
  );
}
