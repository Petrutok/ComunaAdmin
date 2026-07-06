"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';
import { Home, UserCircle, LogOut, FolderOpen, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register' | 'reset';

// Firebase auth error codes -> friendly Romanian messages
function friendlyError(code: string): string {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Email sau parolă greșită.';
  }
  if (code.includes('email-already-in-use')) {
    return 'Există deja un cont cu acest email. Încearcă să te autentifici.';
  }
  if (code.includes('weak-password')) {
    return 'Parola trebuie să aibă cel puțin 6 caractere.';
  }
  if (code.includes('invalid-email')) {
    return 'Adresa de email nu este validă.';
  }
  if (code.includes('too-many-requests')) {
    return 'Prea multe încercări. Așteaptă câteva minute și încearcă din nou.';
  }
  return 'A apărut o eroare. Încearcă din nou.';
}

export default function ContPage() {
  const { user, profile, loading, login, register, logout, resetPassword, resendVerificationEmail } = useCitizenAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [numeComplet, setNumeComplet] = useState('');
  const [telefon, setTelefon] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        router.push('/dosarul-meu');
      } else if (mode === 'register') {
        if (numeComplet.trim().length < 3) {
          toast({ title: 'Completează numele', description: 'Numele complet este obligatoriu.', variant: 'destructive' });
          return;
        }
        await register(email, password, numeComplet.trim(), telefon.trim() || undefined);
        toast({ title: 'Cont creat', description: 'Bine ai venit!' });
        router.push('/dosarul-meu');
      } else {
        await resetPassword(email);
        toast({ title: 'Email trimis', description: 'Verifică-ți emailul pentru linkul de resetare a parolei.' });
        setMode('login');
      }
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: friendlyError(error?.code || String(error)),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-lg mx-auto">
        <Link href="/" className="fixed top-4 left-4 z-50">
          <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Acasă</span>
          </div>
        </Link>

        <div className="text-center pt-20 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-xl mb-4">
            <UserCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Contul meu</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : user ? (
          /* Logged in: quick links */
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">
                {profile?.numeComplet || user.displayName || user.email}
              </CardTitle>
              <CardDescription className="text-gray-300">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!user.emailVerified && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 px-4 py-3 text-sm">
                  <p className="text-amber-300 font-medium">Emailul nu este confirmat</p>
                  <p className="text-gray-400 mt-1">
                    Ți-am trimis un email de confirmare la înregistrare. Fără confirmare,
                    resetarea parolei poate fi nesigură.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await resendVerificationEmail();
                        toast({ title: 'Email trimis', description: 'Verifică-ți căsuța de email (și folderul Spam).' });
                      } catch {
                        toast({ title: 'Eroare', description: 'Încearcă din nou peste câteva minute.', variant: 'destructive' });
                      }
                    }}
                    className="mt-2 text-amber-400 hover:underline font-medium"
                  >
                    Retrimite emailul de confirmare
                  </button>
                </div>
              )}
              <Button
                onClick={() => router.push('/dosarul-meu')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-base py-6"
              >
                <FolderOpen className="mr-2 h-5 w-5" />
                Dosarul meu
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await logout();
                  toast({ title: 'Te-ai deconectat' });
                }}
                className="w-full border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white py-6 text-base"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Deconectare
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">
                {mode === 'login' && 'Autentificare'}
                {mode === 'register' && 'Creează cont'}
                {mode === 'reset' && 'Resetare parolă'}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {mode === 'login' && 'Intră în cont ca să-ți urmărești cererile și sesizările.'}
                {mode === 'register' && 'Contul îți permite să urmărești starea cererilor trimise la primărie.'}
                {mode === 'reset' && 'Îți trimitem un email cu linkul de resetare.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === 'register' && (
                <ul className="mb-5 space-y-2 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-gray-300">
                  <li className="flex gap-2"><span className="text-green-400">✓</span> Vezi stadiul cererilor și sesizărilor tale în „Dosarul meu"</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> Primești notificare când primăria îți rezolvă cererea</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> Formularele se completează automat cu datele tale</li>
                </ul>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="numeComplet" className="text-gray-200">Nume complet *</Label>
                    <Input
                      id="numeComplet"
                      value={numeComplet}
                      onChange={(e) => setNumeComplet(e.target.value)}
                      placeholder="Ion Popescu"
                      required
                      className="bg-slate-700 border-slate-600 text-white text-base py-5"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplu@email.com"
                    required
                    className="bg-slate-700 border-slate-600 text-white text-base py-5"
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-200">Parolă *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="minim 6 caractere"
                      required
                      minLength={6}
                      className="bg-slate-700 border-slate-600 text-white text-base py-5"
                    />
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="telefon" className="text-gray-200">Telefon (opțional)</Label>
                    <Input
                      id="telefon"
                      type="tel"
                      value={telefon}
                      onChange={(e) => setTelefon(e.target.value)}
                      placeholder="07xx xxx xxx"
                      className="bg-slate-700 border-slate-600 text-white text-base py-5"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base"
                >
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {mode === 'login' && 'Intră în cont'}
                  {mode === 'register' && 'Creează contul'}
                  {mode === 'reset' && 'Trimite email de resetare'}
                </Button>
              </form>

              <div className="mt-6 space-y-2 text-center text-sm">
                {mode === 'login' && (
                  <>
                    <p className="text-gray-400">
                      Nu ai cont?{' '}
                      <button onClick={() => setMode('register')} className="text-blue-400 hover:underline font-medium">
                        Înregistrează-te
                      </button>
                    </p>
                    <p className="text-gray-400">
                      Ai uitat parola?{' '}
                      <button onClick={() => setMode('reset')} className="text-blue-400 hover:underline font-medium">
                        Resetează parola
                      </button>
                    </p>
                  </>
                )}
                {mode !== 'login' && (
                  <p className="text-gray-400">
                    Ai deja cont?{' '}
                    <button onClick={() => setMode('login')} className="text-blue-400 hover:underline font-medium">
                      Autentifică-te
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
