"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Loader2, Phone, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment, SERVICE_CONFIG, nextWorkingDays } from '@/types/appointments';

export default function AdminProgramariPage() {
  const { toast } = useToast();
  const days = nextWorkingDays(10);
  const today = new Date().toISOString().slice(0, 10);
  const allDays = [today, ...days];

  const [dayIndex, setDayIndex] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDay = allDays[dayIndex];

  const load = async (date: string) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'appointments'), where('date', '==', date))
      );
      setAppointments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Appointment))
          .sort((a, b) => a.time.localeCompare(b.time))
      );
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const setStatus = async (appt: Appointment, status: 'finalizata' | 'anulata') => {
    try {
      if (status === 'anulata') {
        // Delete frees the slot for rebooking (deterministic slot IDs)
        await deleteDoc(doc(db, 'appointments', appt.id));
        setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
      } else {
        await updateDoc(doc(db, 'appointments', appt.id), { status, updatedAt: Timestamp.now() });
        setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status } : a)));
      }
      toast({ title: status === 'finalizata' ? 'Programare finalizată' : 'Programare anulată' });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({ title: 'Eroare', description: 'Operațiunea a eșuat.', variant: 'destructive' });
    }
  };

  const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('ro-RO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/20 rounded-xl">
          <CalendarClock className="h-7 w-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Programări</h1>
          <p className="text-gray-400 text-sm">Programările cetățenilor la ghișee și audiențe</p>
        </div>
      </div>

      {/* Day navigation */}
      <div className="flex items-center justify-between rounded-lg bg-slate-800 border border-slate-700 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={dayIndex === 0}
          onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
          className="text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="font-semibold text-white capitalize">
          {formatDay(selectedDay)}
          {selectedDay === today && <Badge className="ml-2 bg-cyan-600 text-white">azi</Badge>}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={dayIndex === allDays.length - 1}
          onClick={() => setDayIndex((i) => Math.min(allDays.length - 1, i + 1))}
          className="text-gray-300"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-10 text-center text-gray-400">
            Nicio programare pentru această zi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const config = SERVICE_CONFIG[appt.service];
            return (
              <Card key={appt.id} className="bg-slate-800 border-slate-700">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="text-center shrink-0">
                        <p className="text-xl font-bold text-cyan-300">{appt.time}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {config?.icon} {appt.nume}
                        </p>
                        <p className="text-sm text-gray-400">{config?.label}</p>
                        <p className="text-sm text-gray-300 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3.5 w-3.5" /> {appt.telefon}
                        </p>
                        {appt.motiv && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{appt.motiv}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {appt.status === 'confirmata' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setStatus(appt, 'finalizata')}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4" /> Finalizată
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus(appt, 'anulata')}
                            className="border-red-500/40 text-red-300 hover:bg-red-900/20"
                          >
                            <XCircle className="mr-1.5 h-4 w-4" /> Anulează
                          </Button>
                        </>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Finalizată
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
