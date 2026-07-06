"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useCitizenAuth } from '@/contexts/CitizenAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Home, CalendarClock, Loader2, CheckCircle, ChevronLeft } from 'lucide-react';
import {
  SERVICE_CONFIG,
  TIME_SLOTS,
  nextWorkingDays,
  AppointmentService,
} from '@/types/appointments';

export default function ProgramariPage() {
  const { user, profile, loading: authLoading } = useCitizenAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [service, setService] = useState<AppointmentService | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [telefon, setTelefon] = useState('');
  const [motiv, setMotiv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);

  const workingDays = nextWorkingDays(10);

  useEffect(() => {
    if (profile?.telefon && !telefon) setTelefon(profile.telefon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Load taken slots when a day is picked
  useEffect(() => {
    if (!service || !date) return;
    setLoadingSlots(true);
    setTime(null);
    fetch(`/api/programari?service=${service}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setTakenSlots(data.takenSlots || []))
      .catch(() => setTakenSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [service, date]);

  const handleBook = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/programari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ service, date, time, telefon, motiv }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setConfirmed({ date, time });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Programarea a eșuat',
        variant: 'destructive',
      });
      // Refresh availability in case the slot was just taken
      if (service && date) {
        fetch(`/api/programari?service=${service}&date=${date}`)
          .then((r) => r.json())
          .then((data) => setTakenSlots(data.takenSlots || []))
          .catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-2xl mx-auto">
        <Link href="/" className="fixed top-4 left-4 z-50">
          <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Acasă</span>
          </div>
        </Link>

        <div className="text-center pt-20 pb-8">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-500 rounded-xl mb-4">
            <CalendarClock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Programare la primărie</h1>
          <p className="text-gray-400 mt-2">Alege serviciul, ziua și ora — fără așteptare la ghișeu</p>
        </div>

        {authLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !user ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Ai nevoie de cont</CardTitle>
              <CardDescription className="text-gray-300">
                Programările se fac din contul tău, ca să le poți vedea și anula din „Dosarul meu".
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/cont')} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base">
                Intră în cont sau înregistrează-te
              </Button>
            </CardContent>
          </Card>
        ) : confirmed ? (
          <Card className="bg-emerald-950/40 border-emerald-500 border-2">
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle className="mx-auto h-14 w-14 text-emerald-400" />
              <h2 className="text-2xl font-bold text-emerald-300">Programare confirmată!</h2>
              <p className="text-gray-200">
                {service && SERVICE_CONFIG[service].icon} {service && SERVICE_CONFIG[service].label}
                <br />
                <span className="text-xl font-semibold text-white">
                  {formatDay(confirmed.date)}, ora {confirmed.time}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                Programarea apare în „Dosarul meu", de unde o poți anula dacă nu mai ajungi.
                Te rugăm să vii cu 5 minute înainte.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/dosarul-meu')} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Vezi în Dosarul meu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setConfirmed(null); setService(null); setDate(null); setTime(null); setMotiv(''); }}
                  className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Altă programare
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !service ? (
          /* Step 1: pick service */
          <div className="space-y-3">
            {(Object.keys(SERVICE_CONFIG) as AppointmentService[]).map((s) => (
              <button key={s} onClick={() => setService(s)} className="w-full text-left">
                <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500/50 transition-colors">
                  <CardContent className="py-4 flex items-center gap-4">
                    <span className="text-3xl">{SERVICE_CONFIG[s].icon}</span>
                    <div>
                      <p className="font-semibold text-white">{SERVICE_CONFIG[s].label}</p>
                      <p className="text-sm text-gray-400">{SERVICE_CONFIG[s].description}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        ) : (
          /* Step 2+3: pick day, slot, confirm */
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <button
                onClick={() => { setService(null); setDate(null); setTime(null); }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
              >
                <ChevronLeft className="h-4 w-4" /> Alt serviciu
              </button>
              <CardTitle className="text-white text-xl">
                {SERVICE_CONFIG[service].icon} {SERVICE_CONFIG[service].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-gray-200 mb-2 block">Alege ziua</Label>
                <div className="grid grid-cols-5 gap-2">
                  {workingDays.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDate(d)}
                      className={`rounded-lg border px-1 py-2 text-center text-sm transition-colors ${
                        date === d
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                      }`}
                    >
                      {formatDay(d)}
                    </button>
                  ))}
                </div>
              </div>

              {date && (
                <div>
                  <Label className="text-gray-200 mb-2 block">Alege ora</Label>
                  {loadingSlots ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {TIME_SLOTS.map((t) => {
                        const taken = takenSlots.includes(t);
                        return (
                          <button
                            key={t}
                            disabled={taken}
                            onClick={() => setTime(t)}
                            className={`rounded-lg border px-1 py-2 text-center text-sm transition-colors ${
                              taken
                                ? 'border-slate-700 bg-slate-800 text-gray-600 line-through cursor-not-allowed'
                                : time === t
                                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                                : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {time && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-200">Telefon de contact *</Label>
                    <Input
                      type="tel"
                      value={telefon}
                      onChange={(e) => setTelefon(e.target.value)}
                      placeholder="07xx xxx xxx"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-200">Motivul vizitei (opțional)</Label>
                    <Textarea
                      value={motiv}
                      onChange={(e) => setMotiv(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Pe scurt, cu ce te putem ajuta"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleBook}
                    disabled={submitting || !telefon.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 py-6 text-base"
                  >
                    {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Confirmă programarea — {formatDay(date!)}, ora {time}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
