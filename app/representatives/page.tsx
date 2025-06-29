"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Mail, Phone, User, UserCircle, Home } from 'lucide-react';

const members = [
  { 
    name: "Rusu Constantin", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Aanei Adrian Gabriel", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Asaftei Dumitru", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Borșan Virgil", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "David Amalia", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "female"
  },
  { 
    name: "Tutu Ionela", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "female"
  },
  { 
    name: "Netu Alin Constantin", 
    affiliation: "PSD",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Ouatu Marinică", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Buchir Costel", 
    affiliation: "INDEPENDENT",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Leoreanu Costel", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Leonte Costel", 
    affiliation: "PSD",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Radu Ciprian Vasile", 
    affiliation: "PNL",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
  { 
    name: "Caibulea Constantin", 
    affiliation: "PSD",
    email: "x@gmail.com",
    phone: "07xx.xxx.xxx",
    gender: "male"
  },
];

export default function CouncilPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAffiliation, setSelectedAffiliation] = useState('all');

  const affiliations = ['all', ...new Set(members.map(member => member.affiliation))];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAffiliation = selectedAffiliation === 'all' || member.affiliation === selectedAffiliation;
    return matchesSearch && matchesAffiliation;
  });

  const getAffiliationColor = (affiliation: string) => {
    switch(affiliation) {
      case 'PNL': return 'bg-yellow-500 text-white';
      case 'PSD': return 'bg-red-500 text-white';
      case 'INDEPENDENT': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
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
          <div className="inline-flex items-center justify-center p-2.5 bg-blue-500 rounded-xl mb-4">
            <Users className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Consilieri Locali
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Membrii consiliului local și informațiile de contact
          </p>
        </div>

        {/* Search and Filter Section */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Caută după nume..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {affiliations.map(affiliation => (
                  <Button
                    key={affiliation}
                    variant={selectedAffiliation === affiliation ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAffiliation(affiliation)}
                    className={selectedAffiliation === affiliation 
                      ? "bg-white text-slate-900 hover:bg-gray-100" 
                      : "bg-slate-700 hover:bg-slate-600 text-white border-slate-600"}
                  >
                    {affiliation === 'all' ? 'Toți' : affiliation}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

         {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    member.gender === 'female' 
                      ? 'bg-gradient-to-br from-pink-400/20 to-purple-400/20' 
                      : 'bg-gradient-to-br from-primary/20 to-primary/10'
                  }`}>
                    {member.gender === 'female' ? (
                      <UserCircle className={`h-6 w-6 ${
                        member.gender === 'female' ? 'text-pink-600' : 'text-primary'
                      }`} />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                  </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge className={`${getAffiliationColor(member.affiliation)} w-fit`}>
                  {member.affiliation}
                </Badge>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{member.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{member.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <Card className="text-center py-12 bg-slate-800 border-slate-700">
            <CardContent>
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu s-au găsit membri care să corespundă criteriilor de căutare.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Total: {members.length} consilieri locali • 
          PNL: {members.filter(m => m.affiliation === 'PNL').length} • 
          PSD: {members.filter(m => m.affiliation === 'PSD').length} • 
          Independenți: {members.filter(m => m.affiliation === 'INDEPENDENT').length}
        </div>
      </div>
    </div>
  );
}