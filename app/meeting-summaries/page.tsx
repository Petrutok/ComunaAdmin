"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Home,
  Briefcase,
  Calendar,
  FileText,
  Gavel,
  Users,
  Download,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  FileCheck,
  ScrollText,
  Vote
} from 'lucide-react';

export default function MeetingSummariesPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025');

  const meetings = [
    {
      id: 1,
      date: "30 ianuarie 2025",
      time: "14:00",
      type: "ordinară",
      status: "programată",
      orderItems: [
        "Proiect de hotărâre privind aprobarea bugetului local pe anul 2025",
        "Proiect de hotărâre privind aprobarea organigramei și statului de funcții",
        "Proiect de hotărâre privind stabilirea impozitelor și taxelor locale pentru anul 2025",
        "Diverse - probleme curente ale comunității"
      ],
      decisions: [],
      minutes: null
    },
    {
      id: 2,
      date: "20 decembrie 2024",
      time: "15:00",
      type: "extraordinară",
      status: "finalizată",
      orderItems: [
        "Proiect de hotărâre privind rectificarea bugetului local",
        "Proiect de hotărâre privind aprobarea proiectului 'Modernizare drumuri comunale'",
        "Proiect de hotărâre privind asocierea cu alte UAT-uri pentru servicii publice"
      ],
      decisions: [
        {
          number: "HCL 89/2024",
          title: "Hotărâre privind rectificarea bugetului local pe anul 2024",
          votes: { pentru: 11, contra: 0, abtineri: 2 },
          status: "adoptată"
        },
        {
          number: "HCL 90/2024",
          title: "Hotărâre privind aprobarea proiectului 'Modernizare drumuri comunale'",
          votes: { pentru: 13, contra: 0, abtineri: 0 },
          status: "adoptată"
        },
        {
          number: "HCL 91/2024",
          title: "Hotărâre privind asocierea cu UAT Miroslava pentru servicii de salubrizare",
          votes: { pentru: 12, contra: 1, abtineri: 0 },
          status: "adoptată"
        }
      ],
      minutes: "PV_20_12_2024.pdf"
    },
    {
      id: 3,
      date: "28 noiembrie 2024",
      time: "14:00",
      type: "ordinară",
      status: "finalizată",
      orderItems: [
        "Proiect de hotărâre privind aprobarea Planului Urbanistic Zonal - zona industrială",
        "Proiect de hotărâre privind concesionarea unor terenuri",
        "Proiect de hotărâre privind aprobarea documentației tehnico-economice pentru proiectul de canalizare",
        "Informare privind situația proiectelor cu finanțare europeană"
      ],
      decisions: [
        {
          number: "HCL 85/2024",
          title: "Hotărâre privind aprobarea PUZ - Parc Industrial Filipești",
          votes: { pentru: 10, contra: 2, abtineri: 1 },
          status: "adoptată"
        },
        {
          number: "HCL 86/2024",
          title: "Hotărâre privind concesionarea terenului în suprafață de 5000 mp",
          votes: { pentru: 13, contra: 0, abtineri: 0 },
          status: "adoptată"
        },
        {
          number: "HCL 87/2024",
          title: "Hotărâre privind aprobarea SF pentru extinderea rețelei de canalizare",
          votes: { pentru: 13, contra: 0, abtineri: 0 },
          status: "adoptată"
        },
        {
          number: "HCL 88/2024",
          title: "Hotărâre privind aprobarea indicatorilor tehnico-economici actualizați",
          votes: { pentru: 11, contra: 0, abtineri: 2 },
          status: "adoptată"
        }
      ],
      minutes: "PV_28_11_2024.pdf"
    },
    {
      id: 4,
      date: "31 octombrie 2024",
      time: "14:00",
      type: "ordinară",
      status: "finalizată",
      orderItems: [
        "Proiect de hotărâre privind aprobarea Regulamentului serviciului de salubrizare",
        "Proiect de hotărâre privind stabilirea tarifelor pentru serviciul de salubrizare",
        "Proiect de hotărâre privind aprobarea Strategiei de dezvoltare locală 2024-2030",
        "Raport privind activitatea asistenților personali"
      ],
      decisions: [
        {
          number: "HCL 80/2024",
          title: "Hotărâre privind aprobarea Regulamentului serviciului de salubrizare",
          votes: { pentru: 12, contra: 0, abtineri: 1 },
          status: "adoptată"
        },
        {
          number: "HCL 81/2024",
          title: "Hotărâre privind stabilirea tarifelor pentru colectarea deșeurilor",
          votes: { pentru: 9, contra: 3, abtineri: 1 },
          status: "adoptată"
        },
        {
          number: "HCL 82/2024",
          title: "Hotărâre privind aprobarea Strategiei de dezvoltare locală 2024-2030",
          votes: { pentru: 13, contra: 0, abtineri: 0 },
          status: "adoptată"
        }
      ],
      minutes: "PV_31_10_2024.pdf"
    }
  ];

  const documentTypes = [
    { id: 'all', name: 'Toate', icon: Briefcase },
    { id: 'ordine', name: 'Ordini de zi', icon: ScrollText },
    { id: 'hotarari', name: 'Hotărâri', icon: Gavel },
    { id: 'procese', name: 'Procese verbale', icon: FileCheck }
  ];

  const years = ['2025', '2024', '2023'];

  // Filter meetings based on year
  const filteredMeetings = meetings.filter(meeting => {
    const meetingYear = meeting.date.split(' ')[2];
    return meetingYear === selectedYear;
  });

  // Search in meetings
  const searchedMeetings = searchTerm 
    ? filteredMeetings.filter(meeting => {
        const searchLower = searchTerm.toLowerCase();
        return meeting.orderItems.some(item => item.toLowerCase().includes(searchLower)) ||
               meeting.decisions.some(decision => decision.title.toLowerCase().includes(searchLower));
      })
    : filteredMeetings;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'programată': return 'bg-blue-500';
      case 'finalizată': return 'bg-green-500';
      case 'anulată': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'ordinară': return 'bg-indigo-500';
      case 'extraordinară': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Statistics
  const totalMeetings = meetings.length;
  const totalDecisions = meetings.reduce((sum, meeting) => sum + meeting.decisions.length, 0);
  const meetingsThisYear = meetings.filter(m => m.date.includes(selectedYear)).length;

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
            <span>Acasă</span>
          </div>
        </button>

        {/* Header */}
        <div className="text-center pt-16 pb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-gray-600 rounded-xl mb-4">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Ședințe Consiliu Local
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Ordine de zi, hotărâri adoptate și procese verbale ale ședințelor
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Total ședințe</p>
                  <p className="text-2xl font-bold text-white">{totalMeetings}</p>
                </div>
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Hotărâri adoptate</p>
                  <p className="text-2xl font-bold text-white">{totalDecisions}</p>
                </div>
                <Gavel className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Ședințe în {selectedYear}</p>
                  <p className="text-2xl font-bold text-white">{meetingsThisYear}</p>
                </div>
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex gap-2 flex-wrap flex-1">
                {documentTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`flex items-center gap-2 ${
                        selectedType === type.id 
                          ? 'bg-white text-slate-900 hover:bg-gray-100' 
                          : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                      } border-0`}
                    >
                      <Icon className="h-4 w-4" />
                      {type.name}
                    </Button>
                  );
                })}
              </div>
              
              <div className="flex gap-2">
                {years.map(year => (
                  <Button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    size="sm"
                    className={`${
                      selectedYear === year 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                    } border-0`}
                  >
                    {year}
                  </Button>
                ))}
              </div>
              
              <div className="relative lg:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Caută în documente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meetings List */}
        <div className="space-y-6">
          {searchedMeetings.map((meeting) => (
            <Card key={meeting.id} className="bg-slate-800 border-slate-700 overflow-hidden">
              {/* Meeting Header */}
              <div className="bg-slate-700 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="font-semibold text-white">{meeting.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">{meeting.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getTypeColor(meeting.type)} text-white`}>
                      Ședință {meeting.type}
                    </Badge>
                    <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                      {meeting.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Ordine de zi */}
                {(selectedType === 'all' || selectedType === 'ordine') && (
                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <ScrollText className="h-5 w-5 text-blue-400" />
                      Ordine de zi
                    </h3>
                    <ul className="space-y-2">
                      {meeting.orderItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-blue-400 font-semibold">{index + 1}.</span>
                          <span className="text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hotărâri */}
                {(selectedType === 'all' || selectedType === 'hotarari') && meeting.decisions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-green-400" />
                      Hotărâri adoptate
                    </h3>
                    <div className="space-y-3">
                      {meeting.decisions.map((decision, index) => (
                        <div key={index} className="bg-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-500 text-white">
                                  {decision.number}
                                </Badge>
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              </div>
                              <p className="text-gray-300">{decision.title}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 text-sm">
                                <Vote className="h-4 w-4 text-gray-400" />
                                <span className="text-green-400">{decision.votes.pentru}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-400">{decision.votes.contra}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-yellow-400">{decision.votes.abtineri}</span>
                              </div>
                              <Button 
                                size="sm" 
                                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Descarcă
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proces Verbal */}
                {(selectedType === 'all' || selectedType === 'procese') && meeting.minutes && (
                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-purple-400" />
                      Proces verbal
                    </h3>
                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-300">{meeting.minutes}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {searchedMeetings.length === 0 && (
          <Card className="text-center py-12 bg-slate-800 border-slate-700">
            <CardContent>
              <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu au fost găsite ședințe care să corespundă criteriilor selectate.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mt-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">
                Informații despre ședințele Consiliului Local
              </h3>
              <p className="text-gray-300 text-sm">
                Ședințele ordinare se desfășoară lunar, în ultima joi a lunii, începând cu ora 14:00. 
                Ședințele sunt publice, iar cetățenii interesați pot participa în limita locurilor disponibile. 
                Toate documentele sunt disponibile pentru descărcare în format PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}