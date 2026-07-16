"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Home,
  Construction,
  School,
  Building,
  Bike,
  BookOpen,
  Zap,
  Droplets,
  Calendar,
  Euro,
  MapPin,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function OngoingWorksPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');


  const [projects, setProjects] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'ongoing_works'))
      .then((snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((error) => console.error('Error loading works:', error))
      .finally(() => setLoaded(true));
  }, []);

  const categories = [
    { id: 'all', name: 'Toate', icon: Construction },
    { id: 'educatie', name: 'Educație', icon: School },
    { id: 'infrastructura', name: 'Infrastructură', icon: Bike },
    { id: 'utilitati', name: 'Utilități', icon: Droplets },
    { id: 'energie', name: 'Energie', icon: Zap },
    { id: 'cultura', name: 'Cultură', icon: Building },
    { id: 'sanatate', name: 'Sănătate', icon: Building },
    { id: 'altele', name: 'Altele', icon: Construction },
  ].filter(c => c.id === 'all' || projects.some(p => p.category === c.id));

  // Style/icon derive from category so admin-created works render
  // identically to the defaults (they store only the category string)
  const categoryStyle = (categoryId: string) => {
    const styles: Record<string, { color: string; border: string; icon: any }> = {
      educatie: { color: 'bg-blue-500', border: 'border-blue-500', icon: School },
      infrastructura: { color: 'bg-orange-500', border: 'border-orange-500', icon: Bike },
      utilitati: { color: 'bg-cyan-500', border: 'border-cyan-500', icon: Droplets },
      energie: { color: 'bg-yellow-500', border: 'border-yellow-500', icon: Zap },
      cultura: { color: 'bg-purple-500', border: 'border-purple-500', icon: Building },
      sanatate: { color: 'bg-rose-500', border: 'border-rose-500', icon: Building },
      altele: { color: 'bg-gray-500', border: 'border-gray-500', icon: Construction },
    };
    return styles[categoryId] || styles.altele;
  };

  const filteredProjects = selectedFilter === 'all' 
    ? projects 
    : projects.filter(project => project.category === selectedFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'În finalizare': return 'text-green-400';
      case 'În execuție': return 'text-yellow-400';
      case 'În pregătire': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const totalBudget = projects.reduce((sum, project) => {
    const budget = parseFloat((project.budget || '0').replace(/[^\d]/g, '')) || 0;
    return sum + budget;
  }, 0);

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
          <div className="inline-flex items-center justify-center p-2.5 bg-yellow-500 rounded-xl mb-4">
            <Construction className="h-9 w-9 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Lucrări în Desfășurare
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Proiecte de modernizare și dezvoltare în implementare
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Total proiecte</p>
                  <p className="text-2xl font-bold text-white">{projects.length}</p>
                </div>
                <Construction className="h-6 w-6 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Buget total</p>
                  <p className="text-xl font-bold text-white">{(totalBudget / 1000000).toFixed(1)}M RON</p>
                </div>
                <Euro className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Programe</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(projects.map((p) => p.program).filter(Boolean)).size}
                  </p>
                </div>
                <Building className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                onClick={() => setSelectedFilter(category.id)}
                className={`flex items-center gap-2 ${
                  selectedFilter === category.id 
                    ? 'bg-white text-slate-900 hover:bg-gray-100' 
                    : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                } border-0`}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* Projects Grid */}
        <div className="grid gap-6 mb-12">
          {filteredProjects.map((project) => {
            const style = categoryStyle(project.category);
            const Icon = style.icon;
            return (
              <Card key={project.id} className={`bg-slate-800 border-2 ${style.border} overflow-hidden`}>
                <div className={`${style.color} h-2`}></div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`${style.color} bg-opacity-20 rounded-xl p-3`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-white mb-2">
                          {project.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {project.location}
                          </span>
                          <Badge className={`${style.color} text-white`}>
                            {project.program}
                          </Badge>
                          <span className={`flex items-center gap-1 ${getStatusColor(project.status)}`}>
                            <CheckCircle2 className="h-4 w-4" />
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Buget</p>
                      <p className="text-xl font-bold text-white">{project.budget}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    {project.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progres</span>
                      <span className="text-white font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${style.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {loaded && filteredProjects.length === 0 && (
          <Card className="bg-slate-800 border-slate-700 text-center py-12 mb-12">
            <CardContent>
              <Construction className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu au fost publicate încă lucrări în desfășurare. Reveniți în curând.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">
                Informații despre proiecte
              </h3>
              <p className="text-gray-300">
                Toate proiectele sunt finanțate prin programe naționale și europene. 
                Progresul și stadiul lucrărilor sunt actualizate periodic. 
                Pentru detalii suplimentare despre un anumit proiect, contactați primăria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}