"use client";

import { useState } from 'react';
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

  const projects = [
    {
      id: 1,
      title: "Creșterea eficienței energetice la școala din satul Filipești",
      location: "Sat Filipești",
      program: "PNRR",
      category: "educatie",
      icon: School,
      color: "bg-blue-500",
      borderColor: "border-blue-500",
      progress: 45,
      description: "Modernizarea sistemului de încălzire, izolarea termică a clădirii și înlocuirea tâmplăriei pentru reducerea consumului energetic și creșterea confortului elevilor.",
      budget: "2.500.000 RON",
      status: "În execuție"
    },
    {
      id: 2,
      title: "Eficientizare energetică moderată la Căminul Cultural din satul Cârligi",
      location: "Sat Cârligi",
      program: "PNRR",
      category: "cultura",
      icon: Building,
      color: "bg-purple-500",
      borderColor: "border-purple-500",
      progress: 30,
      description: "Reabilitarea termică a căminului cultural, modernizarea instalațiilor și îmbunătățirea eficienței energetice pentru reducerea costurilor de întreținere.",
      budget: "1.800.000 RON",
      status: "În execuție"
    },
    {
      id: 3,
      title: "Amenajare piste de biciclete în comuna Filipești",
      location: "Comuna Filipești",
      program: "PNRR",
      category: "infrastructura",
      icon: Bike,
      color: "bg-green-500",
      borderColor: "border-green-500",
      progress: 20,
      description: "Construirea unei rețele de piste de biciclete moderne pentru încurajarea transportului ecologic și îmbunătățirea siguranței cicliștilor în comună.",
      budget: "3.200.000 RON",
      status: "În pregătire"
    },
    {
      id: 4,
      title: "Dotarea cu mobilier, materiale didactice și echipamente digitale a Școlii Gimnaziale",
      location: "Comuna Filipești",
      program: "PNRR",
      category: "educatie",
      icon: BookOpen,
      color: "bg-indigo-500",
      borderColor: "border-indigo-500",
      progress: 60,
      description: "Modernizarea completă a dotărilor școlare cu mobilier nou, table interactive, calculatoare și materiale didactice moderne pentru îmbunătățirea procesului educațional.",
      budget: "850.000 RON",
      status: "În execuție"
    },
    {
      id: 5,
      title: "Producerea energiei electrice din surse regenerabile în comuna Filipești",
      location: "Comuna Filipești",
      program: "MEFM",
      category: "energie",
      icon: Zap,
      color: "bg-yellow-500",
      borderColor: "border-yellow-500",
      progress: 15,
      description: "Instalarea de panouri fotovoltaice pe clădirile publice pentru producerea energiei verzi și reducerea dependenței de rețeaua națională.",
      budget: "4.500.000 RON",
      status: "În pregătire"
    },
    {
      id: 6,
      title: "Demolare și construire școală nouă în comuna Filipești",
      location: "Comuna Filipești",
      program: "PNSS 2024",
      category: "educatie",
      icon: School,
      color: "bg-red-500",
      borderColor: "border-red-500",
      progress: 10,
      description: "Construirea unei școli moderne cu toate facilitățile necesare, inclusiv laboratoare, sală de sport și spații verzi pentru o educație de calitate.",
      budget: "12.000.000 RON",
      status: "În pregătire"
    },
    {
      id: 7,
      title: "Canalizare și stații de pompare în localitățile Onișcani, Boanta, Cornești și Hîrlești",
      location: "Satele Onișcani, Boanta, Cornești, Hîrlești",
      program: "PNDL II 2017",
      category: "utilitati",
      icon: Droplets,
      color: "bg-cyan-500",
      borderColor: "border-cyan-500",
      progress: 75,
      description: "Extinderea rețelei de canalizare și construirea stațiilor de pompare pentru conectarea tuturor gospodăriilor la sistemul de canalizare.",
      budget: "8.900.000 RON",
      status: "În execuție"
    },
    {
      id: 8,
      title: "Alimentare cu apă în localitățile Onișcani, Boanta, Cornești și Hîrlești",
      location: "Satele Onișcani, Boanta, Cornești, Hîrlești",
      program: "PNDL II 2017",
      category: "utilitati",
      icon: Droplets,
      color: "bg-blue-500",
      borderColor: "border-blue-500",
      progress: 85,
      description: "Extinderea rețelei de alimentare cu apă potabilă pentru asigurarea accesului tuturor locuitorilor la apă curentă de calitate.",
      budget: "7.200.000 RON",
      status: "În finalizare"
    }
  ];

  const categories = [
    { id: 'all', name: 'Toate', icon: Construction },
    { id: 'educatie', name: 'Educație', icon: School },
    { id: 'infrastructura', name: 'Infrastructură', icon: Bike },
    { id: 'utilitati', name: 'Utilități', icon: Droplets },
    { id: 'energie', name: 'Energie', icon: Zap },
    { id: 'cultura', name: 'Cultură', icon: Building }
  ];

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
    const budget = parseFloat(project.budget.replace(/[^\d]/g, ''));
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
                  <p className="text-2xl font-bold text-white">4</p>
                </div>
                <Badge className="bg-blue-500 text-white text-xs">PNRR+</Badge>
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
            const Icon = project.icon;
            return (
              <Card key={project.id} className={`bg-slate-800 border-2 ${project.borderColor} overflow-hidden`}>
                <div className={`${project.color} h-2`}></div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`${project.color} bg-opacity-20 rounded-xl p-3`}>
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
                          <Badge className={`${project.color} text-white`}>
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
                        className={`${project.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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