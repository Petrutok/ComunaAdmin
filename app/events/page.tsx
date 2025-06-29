"use client";

import { useState } from 'react';
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

  const events = [
    {
      id: 1,
      title: "Ziua Comunei Filipești",
      date: "20 iunie 2025",
      time: "10:00 - 23:00",
      location: "Stadionul din Filipești",
      month: "iunie",
      category: "cultural",
      icon: PartyPopper,
      color: "bg-purple-500",
      borderColor: "border-purple-500",
      description: "Cea mai mare sărbătoare a anului! Program artistic cu artiști locali și invitați speciali, târg de meșteșugari, activități pentru copii, foc de artificii și multe surprize.",
      activities: [
        "Concert muzică populară",
        "Dansuri tradiționale",
        "Târg de produse locale",
        "Concursuri și premii",
        "Foc de artificii"
      ]
    },
    {
      id: 2,
      title: "Balul Gospodarilor",
      date: "10 septembrie 2025",
      time: "18:00 - 02:00",
      location: "Căminul Cultural Filipești",
      month: "septembrie",
      category: "social",
      icon: Trophy,
      color: "bg-yellow-500",
      borderColor: "border-yellow-500",
      description: "Eveniment de premiere a celor mai harnici gospodari din comună. Seară festivă cu muzică live, dans și voie bună.",
      activities: [
        "Premierea gospodarilor",
        "Muzică live",
        "Cină festivă",
        "Tombolă cu premii",
        "DJ și muzică de dans"
      ]
    },
    {
      id: 3,
      title: "Sărbătoarea Învierii - Paște",
      date: "20 aprilie 2025",
      time: "00:00 - 03:00",
      location: "Biserica din Filipești",
      month: "aprilie",
      category: "religios",
      icon: Church,
      color: "bg-red-500",
      borderColor: "border-red-500",
      description: "Slujba de Înviere și procesiune cu lumânări. După slujbă, toți credincioșii sunt invitați să ia lumină și să ciocnească ouă roșii.",
      activities: [
        "Slujba de Înviere",
        "Procesiune cu lumânări",
        "Împărțirea luminii sfinte",
        "Ciocnirea ouălor",
        "Agapă frățească"
      ]
    },
    {
      id: 4,
      title: "Ziua Copilului",
      date: "1 iunie 2025", 
      time: "10:00 - 18:00",
      location: "Parcul Central Filipești",
      month: "iunie",
      category: "familie",
      icon: Baby,
      color: "bg-pink-500",
      borderColor: "border-pink-500",
      description: "O zi plină de distracție pentru cei mici! Teatru de păpuși, concursuri, ateliere creative, gonflabile și multe surprize dulci.",
      activities: [
        "Teatru de păpuși",
        "Pictura pe față",
        "Gonflabile și tobogane",
        "Ateliere creative",
        "Concurs de talente"
      ]
    },
    {
      id: 5,
      title: "Festivalul Toamnei",
      date: "15 octombrie 2025",
      time: "12:00 - 20:00",
      location: "Piața Centrală",
      month: "octombrie",
      category: "cultural",
      icon: Flower2,
      color: "bg-orange-500",
      borderColor: "border-orange-500",
      description: "Sărbătorim bogăția toamnei cu expoziție de produse agricole, degustări de vinuri și preparate tradiționale, muzică populară.",
      activities: [
        "Expoziție produse agricole",
        "Degustare vinuri locale",
        "Preparate tradiționale",
        "Muzică populară live",
        "Târg de toamnă"
      ]
    },
    {
      id: 6,
      title: "Ziua Femeii",
      date: "8 martie 2025",
      time: "17:00 - 22:00",
      location: "Căminul Cultural Cârligi",
      month: "martie",
      category: "social",
      icon: Heart,
      color: "bg-rose-500",
      borderColor: "border-rose-500",
      description: "Eveniment dedicat tuturor femeilor din comună. Spectacol artistic, flori și surprize pentru toate doamnele și domnișoarele.",
      activities: [
        "Program artistic",
        "Momente poetice",
        "Muzică și dans",
        "Flori pentru toate doamnele",
        "Cocktail festiv"
      ]
    },
    {
      id: 7,
      title: "Serbarea Pomului de Crăciun",
      date: "20 decembrie 2025",
      time: "16:00 - 20:00",
      location: "Casa de Cultură Filipești",
      month: "decembrie",
      category: "familie",
      icon: TreePine,
      color: "bg-green-500",
      borderColor: "border-green-500",
      description: "Moș Crăciun vine în comună! Spectacol de colinde, împărțirea cadourilor și aprinderea luminițelor în bradul din centru.",
      activities: [
        "Sosirea lui Moș Crăciun",
        "Concert de colinde",
        "Împărțirea cadourilor",
        "Aprinderea bradului",
        "Ciocolată caldă gratuită"
      ]
    },
    {
      id: 8,
      title: "Ziua Națională a României",
      date: "1 decembrie 2025",
      time: "11:00 - 14:00",
      location: "Monumentul Eroilor",
      month: "decembrie",
      category: "oficial",
      icon: Sparkles,
      color: "bg-blue-500",
      borderColor: "border-blue-500",
      description: "Ceremonial militar și religios de Ziua Națională. Depuneri de coroane, defilare și program artistic patriotic.",
      activities: [
        "Ceremonial militar",
        "Depuneri de coroane",
        "Intonarea imnului",
        "Program artistic",
        "Recepție oficială"
      ]
    }
  ];

  const months = [
    { id: 'all', name: 'Toate' },
    { id: 'martie', name: 'Martie' },
    { id: 'aprilie', name: 'Aprilie' },
    { id: 'iunie', name: 'Iunie' },
    { id: 'septembrie', name: 'Septembrie' },
    { id: 'octombrie', name: 'Octombrie' },
    { id: 'decembrie', name: 'Decembrie' }
  ];

  const filteredEvents = selectedMonth === 'all' 
    ? events 
    : events.filter(event => event.month === selectedMonth);

  const getCategoryBadge = (category: string) => {
    const categories = {
      'cultural': { name: 'Cultural', color: 'bg-purple-500' },
      'social': { name: 'Social', color: 'bg-yellow-500' },
      'religios': { name: 'Religios', color: 'bg-red-500' },
      'familie': { name: 'Familie', color: 'bg-pink-500' },
      'oficial': { name: 'Oficial', color: 'bg-blue-500' }
    };
return categories[category as keyof typeof categories] || { name: category, color: 'bg-gray-500' };
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
            Evenimente 2025
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
            <p className="text-2xl font-bold text-white">6</p>
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
            const Icon = event.icon;
            const category = getCategoryBadge(event.category);
            
            return (
              <Card key={event.id} className={`bg-slate-800 border-2 ${event.borderColor} overflow-hidden hover:shadow-xl transition-all duration-300`}>
                <div className={`${event.color} h-2`}></div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`${event.color} bg-opacity-20 rounded-xl p-3`}>
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
                      {event.activities.map((activity, index) => (
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

        {/* Info Section */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">
                Participă la evenimentele comunei!
              </h3>
              <p className="text-gray-300">
                Toate evenimentele sunt organizate de Primăria Filipești și partenerii locali. 
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