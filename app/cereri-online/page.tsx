'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileText, 
  Home,
  Building2,
  Heart,
  Wheat,
  Receipt,
  Users,
  Globe,
  ArrowRight,
  Send,
  Loader2
} from 'lucide-react';

export default function CereriOnlinePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingRequest, setLoadingRequest] = useState<string | null>(null);

  const requestsData = [
    {
      category: "Solicitări Generale",
      icon: Globe,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500",
      requests: [
        {
          title: "Trimite cerere către orice compartiment de specialitate din instituție",
          description: "Cerere generală pentru diverse compartimente",
          formType: "cerere-generala"
        },
        {
          title: "Cerere permis de lucru cu foc",
          description: "Pentru lucrări care implică foc deschis",
          formType: "permis-foc"
        }
      ]
    },
    {
      category: "Urbanism",
      icon: Building2,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500",
      requests: [
        {
          title: "Cerere pentru emiterea autorizației de construire/desființare",
          description: "Pentru construcții noi sau demolări",
          formType: "autorizatie-construire"
        },
        {
          title: "Cerere pentru emiterea certificatului de urbanism",
          description: "Persoane fizice/juridice",
          formType: "certificat-urbanism"
        },
        {
          title: "Cerere pentru prelungirea valabilității autorizației de construire/desființare",
          description: "Extindere perioadă autorizație",
          formType: "prelungire-autorizatie"
        },
        {
          title: "Cerere pentru prelungirea valabilității certificatului de urbanism",
          description: "Extindere perioadă certificat",
          formType: "prelungire-certificat"
        },
        {
          title: "Comunicare privind începerea execuției lucrărilor",
          description: "Notificare către primărie",
          formType: "incepere-lucrari"
        },
        {
          title: "Comunicare privind încheierea execuției lucrărilor",
          description: "Notificare finalizare lucrări",
          formType: "incheiere-lucrari"
        }
      ]
    },
    {
      category: "Asistență Socială",
      icon: Heart,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500",
      requests: [
        {
          title: "Cerere lemne foc",
          description: "Ajutor pentru încălzirea locuinței",
          formType: "lemne-foc"
        },
        {
          title: "Adeverință indemnizație creștere copil",
          description: "Pentru părinți cu copii mici",
          formType: "indemnizatie-copil"
        },
        {
          title: "Adeverință indemnizație de șomaj",
          description: "Pentru persoane fără loc de muncă",
          formType: "indemnizatie-somaj"
        },
        {
          title: "Cerere informare și consiliere",
          description: "Asistență și îndrumare socială",
          formType: "consiliere"
        },
        {
          title: "Cerere modificare beneficii sociale (ASF, VMG, etc)",
          description: "Actualizare beneficii existente",
          formType: "modificare-beneficii"
        },
        {
          title: "Cerere pentru acordarea alocației de stat pentru copii",
          description: "Alocație lunară pentru copii",
          formType: "alocatie-copii"
        },
        {
          title: "Cerere pentru acordarea indemnizației de creștere a copilului",
          description: "Indemnizație/stimulent de inserție",
          formType: "indemnizatie-crestere"
        }
      ]
    },
    {
      category: "Registru Agricol",
      icon: Wheat,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500",
      requests: [
        {
          title: "Cerere eliberare adeverință de rol",
          description: "Confirmare proprietăți înregistrate",
          formType: "adeverinta-rol"
        },
        {
          title: "Cerere adeverință APIA - Persoană fizică",
          description: "Pentru subvenții agricole persoane fizice",
          formType: "apia-pf"
        },
        {
          title: "Cerere adeverință APIA - Persoană juridică",
          description: "Pentru subvenții agricole persoane juridice",
          formType: "apia-pj"
        },
        {
          title: "Declarație pentru completarea registrului agricol",
          description: "Actualizare date registru agricol",
          formType: "declaratie-registru"
        },
        {
          title: "Cerere privind eliberarea certificatului de nomenclatură stradală",
          description: "Certificat denumire stradă",
          formType: "nomenclatura-stradala"
        }
      ]
    },
    {
      category: "Taxe și Impozite",
      icon: Receipt,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500",
      requests: [
        {
          title: "Cerere eliberare certificat fiscal - Persoană fizică",
          description: "Situație fiscală persoane fizice",
          formType: "certificat-fiscal-pf"
        },
        {
          title: "Cerere eliberare certificat fiscal - Persoană juridică",
          description: "Situație fiscală persoane juridice",
          formType: "certificat-fiscal-pj"
        },
        {
          title: "Cerere pentru scoaterea din evidențele fiscale a clădirilor/terenurilor",
          description: "Radiere imobile din evidențe",
          formType: "radiere-imobile"
        },
        {
          title: "Cerere pentru scoaterea din evidență a mijloacelor de transport",
          description: "Radiere vehicule din evidențe",
          formType: "radiere-auto"
        },
        {
          title: "Declarație fiscală pentru stabilirea impozitului pe mijloace de transport",
          description: "Persoane fizice/juridice",
          formType: "declaratie-auto"
        },
        {
          title: "Declarație fiscală pentru stabilirea impozitului pe mijloace de transport marfă peste 12 tone",
          description: "Vehicule de mare tonaj",
          formType: "declaratie-marfa"
        },
        {
          title: "Declarație fiscală pentru stabilirea impozitului pe teren - Persoane fizice",
          description: "ITL-003",
          formType: "declaratie-teren-pf"
        },
        {
          title: "Declarație fiscală pentru stabilirea impozitului pe clădire - Persoane fizice",
          description: "Impozit clădiri rezidențiale",
          formType: "declaratie-cladire-pf"
        }
      ]
    },
    {
      category: "SPCLEP (Stare Civilă)",
      icon: Users,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500",
      requests: [
        {
          title: "Cerere pentru eliberare act de identitate",
          description: "CI/Buletin nou sau duplicat",
          formType: "act-identitate"
        },
        {
          title: "Cerere pentru stabilirea reședinței",
          description: "Viză de reședință",
          formType: "stabilire-resedinta"
        },
        {
          title: "Cerere transcriere certificat de naștere",
          description: "Pentru acte emise în străinătate",
          formType: "transcriere-nastere"
        },
        {
          title: "Cerere eliberare certificat de naștere",
          description: "Original sau duplicat",
          formType: "certificat-nastere"
        }
      ]
    }
  ];

  // Get unique categories
  const categories = useMemo(() => {
    return ['all', ...requestsData.map(cat => cat.category)];
  }, []);

  // Flatten all requests for searching
  const allRequests = useMemo(() => {
    return requestsData.flatMap(category => 
      category.requests.map(req => ({
        ...req,
        category: category.category,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        borderColor: category.borderColor
      }))
    );
  }, []);

  // Filter requests based on search and category
  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           req.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || req.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allRequests, searchTerm, selectedCategory]);

  // Group filtered requests by category
  const groupedRequests = useMemo(() => {
    return requestsData.map(category => ({
      ...category,
      requests: filteredRequests.filter(req => req.category === category.category)
    })).filter(category => category.requests.length > 0);
  }, [filteredRequests]);

  const handleRequestClick = async (formType: string) => {
    try {
      setLoadingRequest(formType);
      // Folosim Next.js router pentru navigare
      await router.push(`/cereri-online/formular/${formType}`);
    } catch (error) {
      console.error('Eroare la navigare:', error);
      setLoadingRequest(null);
      // Fallback la window.location dacă router-ul eșuează
      window.location.href = `/cereri-online/formular/${formType}`;
    }
  };

  const handleHomeClick = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-7xl mx-auto">
        {/* Home Button */}
        <button
          onClick={handleHomeClick}
          className="fixed top-4 left-4 z-50 group"
        >
          <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
            <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-semibold">
              Acasă
            </span>
          </div>
        </button>

        {/* Header */}
        <div className="text-center pt-16 pb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-blue-500 rounded-xl mb-4">
            <Send className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Cereri Online
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Trimite cereri și solicitări direct către primărie
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
                  placeholder="Caută cereri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category 
                      ? "bg-white text-slate-900 hover:bg-gray-100" 
                      : "bg-slate-700 hover:bg-slate-600 text-white border-slate-600"}
                  >
                    {category === 'all' ? 'Toate' : category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests by Category */}
        <div className="space-y-6">
          {groupedRequests.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={`category-${index}`} className={`bg-slate-800 border-2 ${category.borderColor} overflow-hidden`}>
                <CardHeader className={`${category.bgColor} pb-4`}>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-full p-3 shadow-md">
                      <Icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <CardTitle className="text-xl text-white">
                      {category.category}
                    </CardTitle>
                    <Badge className="ml-auto bg-slate-700 text-white border-0">
                      {category.requests.length} {category.requests.length === 1 ? 'cerere' : 'cereri'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {category.requests.map((request, reqIndex) => (
                      <div 
                        key={`req-${reqIndex}`}
                        className="group cursor-pointer"
                        onClick={() => handleRequestClick(request.formType)}
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-700/50 transition-all duration-200 border border-slate-700 hover:border-slate-600">
                          <div className="flex items-start gap-3 flex-1">
                            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                {request.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {request.description}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={loadingRequest === request.formType}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 group-hover:gap-3 disabled:opacity-50"
                          >
                            {loadingRequest === request.formType ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium hidden sm:inline">
                                  Se încarcă...
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-medium hidden sm:inline">
                                  Completează
                                </span>
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <Card className="text-center py-12 bg-slate-800 border-slate-700">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu s-au găsit cereri care să corespundă criteriilor de căutare.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card className="mt-6 bg-blue-900/20 border-blue-700">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Cum funcționează?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/20 rounded-full p-2 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Alege tipul cererii</p>
                    <p className="text-xs text-gray-400">Selectează din categoriile disponibile</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/20 rounded-full p-2 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Completează formularul</p>
                    <p className="text-xs text-gray-400">Introdu toate datele necesare</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/20 rounded-full p-2 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Primești confirmarea</p>
                    <p className="text-xs text-gray-400">Pe email și în maxim 30 de zile răspunsul</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total requests info */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Total: {allRequests.length} tipuri de cereri disponibile
        </div>
      </div>
    </div>
  );
}