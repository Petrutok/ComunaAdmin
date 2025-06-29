"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileText, 
  Home, 
  Download,
  TreePine,
  Building,
  Car,
  Users,
  Heart
} from 'lucide-react';

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const documentsData = [
    {
      category: "Direcția Agricolă",
      icon: TreePine,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500",
      documents: [
        {
          title: "Declarație privind înregistrarea/modificarea datelor în registrul agricol",
          link: "#",
        }
      ]
    },
    {
      category: "Urbanism",
      icon: Building,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500",
      documents: [
        {
          title: "Comunicare începere lucrări",
          link: "#",
        },
        {
          title: "Comunicare încheiere lucrări",
          link: "#",
        }
      ]
    },
    {
      category: "Rabla Local",
      icon: Car,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500",
      documents: [
        {
          title: "Acte necesare Rabla Local",
          link: "#",
        }
      ]
    },
    {
      category: "Stare Civilă",
      icon: Users,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500",
      documents: [
        {
          title: "Cerere alocație monoparentală sau complementară",
          link: "#",
        },
        {
          title: "Model cerere pentru eliberarea actului de identitate cetățenilor cu domiciliul în străinătate și reședința în România",
          link: "#",
        },
        {
          title: "Model cerere pentru eliberarea actului de identitate, ca urmare a schimbării domiciliului din străinătate în România",
          link: "#",
        },
        {
          title: "Model cerere pentru eliberarea actului de identitate",
          link: "#",
        },
        {
          title: "Model cerere pentru înscrierea în actul de identitate a mențiunii privind stabilirea reședinței",
          link: "#",
        }
      ]
    },
    {
      category: "Asistență Socială",
      icon: Heart,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500",
      documents: [
        {
          title: "Acte necesare în situația în care se solicită modificarea din indemnizație în stimulent sau din stimulent în indemnizație",
          link: "#",
        },
        {
          title: "Cerere alocație monoparentală sau complementară",
          link: "#",
        },
        {
          title: "Model cerere de alocație de stat pentru copil",
          link: "#",
        },
        {
          title: "Model cerere și declarație pe propria răspundere pentru acordarea de ajutor social",
          link: "#",
        },
        {
          title: "Model cerere și declarație pe propria răspundere pentru acordarea indemnizației-stimulentului-alocației pentru creșterea copilului",
          link: "#",
        },
        {
          title: "Model cerere și declarație pe propria răspundere pentru acordarea trusoului pentru nou-născuți",
          link: "#",
        },
        {
          title: "Acte necesare pentru acordarea indemnizației de creștere a copilului",
          link: "#",
        },
        {
          title: "Acte necesare pentru acordarea stimulentului pentru creștere copil - de inserție",
          link: "#",
        },
        {
          title: "Acte necesare pentru acordarea ajutoarelor pentru încălzirea locuinței",
          link: "#",
        },
        {
          title: "Acte necesare acordării ajutorului social",
          link: "#",
        }
      ]
    }
  ];

  // Get unique categories
  const categories = useMemo(() => {
    return ['all', ...documentsData.map(doc => doc.category)];
  }, []);

  // Flatten all documents for searching
  const allDocuments = useMemo(() => {
    return documentsData.flatMap(category => 
      category.documents.map(doc => ({
        ...doc,
        category: category.category,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        borderColor: category.borderColor
      }))
    );
  }, []);

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allDocuments, searchTerm, selectedCategory]);

  // Group filtered documents by category
  const groupedDocuments = useMemo(() => {
    return documentsData.map(category => ({
      ...category,
      documents: filteredDocuments.filter(doc => doc.category === category.category)
    })).filter(category => category.documents.length > 0);
  }, [filteredDocuments]);

  const handleDownload = (e) => {
    if (e.currentTarget.href.endsWith('#')) {
      e.preventDefault();
      alert('Link-ul pentru acest document nu este încă disponibil. Contactați primăria pentru mai multe informații.');
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
          <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500 rounded-xl mb-4">
            <FileText className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Documente și Formulare
          </h1>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Descarcă documentele și formularele necesare pentru diverse servicii
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
                  placeholder="Caută documente..."
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

        {/* Documents by Category */}
        <div className="space-y-6">
          {groupedDocuments.map((category, index) => {
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
                      {category.documents.length} {category.documents.length === 1 ? 'document' : 'documente'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {category.documents.map((doc, docIndex) => (
                      <div 
                        key={`doc-${docIndex}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 border border-slate-700"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-300">
                            {doc.title}
                          </p>
                        </div>
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleDownload}
                          className="flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors duration-200 flex-shrink-0"
                        >
                          <span className="text-sm font-medium hidden sm:inline">
                            Descarcă
                          </span>
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <Card className="text-center py-12 bg-slate-800 border-slate-700">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Nu s-au găsit documente care să corespundă criteriilor de căutare.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Total documents info */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Total: {allDocuments.length} documente disponibile
        </div>
      </div>
    </div>
  );
}