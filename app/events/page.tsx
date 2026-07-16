"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home,
  Calendar,
  MapPin,
  Clock,
  Users,
  Music,
  Sparkles,
  Heart,
  Trophy,
  Flower2,
  Church,
  PartyPopper,
  Baby,
  BookOpen,
  TreePine,
  Ticket
} from 'lucide-react';

export default function EventsPage() {
  const [selectedMonth, setSelectedMonth] = useState('all');


  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'events'))
      .then((snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((error) => console.error('Error loading events:', error))
      .finally(() => setLoaded(true));
  }, []);

  // Month filter derived from whatever events exist
  const monthOrder = [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  ];
  const months = [
    { id: 'all', name: 'Toate' },
    ...monthOrder
      .filter((m) => events.some((e) => e.month === m))
      .map((m) => ({ id: m, name: m.charAt(0).toUpperCase() + m.slice(1) })),
  ];

  const filteredEvents = selectedMonth === 'all' 
    ? events 
    : events.filter(event => event.month === selectedMonth);

  // Style and icon derive from category, so admin-created events (which
  // store only the category string) render identically to the defaults
  const getCategoryBadge = (category: string) => {
    const categories = {
      'cultural': { name: 'Cultural', color: 'bg-purple-500', border: 'border-purple-500', icon: PartyPopper },
      'social': { name: 'Social', color: 'bg-yellow-500', border: 'border-yellow-500', icon: Trophy },
      'religios': { name: 'Religios', color: 'bg-red-500', border: 'border-red-500', icon: Church },
      'familie': { name: 'Familie', color: 'bg-pink-500', border: 'border-pink-500', icon: Baby },
      'oficial': { name: 'Oficial', color: 'bg-blue-500', border: 'border-blue-500', icon: Sparkles },
      'sportiv': { name: 'Sportiv', color: 'bg-green-500', border: 'border-green-500', icon: Trophy },
    };
    return categories[category as keyof typeof categories]
      || { name: category, color: 'bg-gray-500', border: 'border-gray-500', icon: Calendar };
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-7xl mx-auto">
        {/* Home Button */}
          <button
 onClick={() => window.location.href = '/'}
  className="fixed top-4 left-4 z-50 group"
>
  <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
    <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-semibold">
      Acasă
    </span>
  </div>
  {/* Glow effect */}
  <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity -z-10"></div>
          </button>

        {/* Header */}
        <div className="text-center pt-16 pb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-orange-500 rounded-xl mb-4">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Evenimente
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Calendar cu toate evenimentele culturale și sociale din comună
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{events.length}</p>
            <p className="text-sm text-gray-400">Evenimente planificate</p>
          </div>
          <div className="w-px bg-gray-700"></div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{months.length - 1}</p>
            <p className="text-sm text-gray-400">Luni cu evenimente</p>
          </div>
        </div>

        {/* Month Filter */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {months.map(month => (
            <Button
              key={month.id}
              onClick={() => setSelectedMonth(month.id)}
              className={`${
                selectedMonth === month.id 
                  ? 'bg-white text-slate-900 hover:bg-gray-100' 
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              } border-0`}
            >
              {month.name}
            </Button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {filteredEvents.map((event) => {
            const category = getCategoryBadge(event.category);
            const Icon = category.icon;

            return (
              <Card key={event.id} className={`bg-slate-800 border-2 ${category.border} overflow-hidden hover:shadow-xl transition-all duration-300`}>
                <div className={`${category.color} h-2`}></div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`${category.color} bg-opacity-20 rounded-xl p-3`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-white mb-2">
                          {event.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge className={`${category.color} text-white`}>
                            {category.name}
                          </Badge>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300 font-medium">{event.location}</span>
                  </div>
                  
                  <p className="text-gray-300 mb-4">
                    {event.description}
                  </p>
                  
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      Program:
                    </p>
                    <ul className="space-y-1">
                      {(event.activities || []).map((activity: string, index: number) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-gray-500 mt-0.5">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Intrare liberă
                    </span>
                    <Button className="bg-white/10 hover:bg-white/20 text-white border-0">
                      <Ticket className="h-4 w-4 mr-2" />
                      Detalii
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {loaded && filteredEvents.length === 0 && (
          <Card className="bg-slate-800 border-slate-700 text-center py-12 mb-8">
            <CardContent>
              <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu au fost publicate încă evenimente. Reveniți în curând.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">
                Participă la evenimentele comunei!
              </h3>
              <p className="text-gray-300">
                Toate evenimentele sunt organizate de primărie și partenerii locali.
                Intrarea este liberă la majoritatea evenimentelor. Pentru detalii suplimentare 
                și eventuale modificări de program, urmăriți site-ul primăriei și paginile de social media.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}