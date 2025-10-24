"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home,
  Recycle,
  Package,
  FileText,
  Leaf,
  Trash2,
  Info,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface TrashBinProps {
  color?: string;
  className?: string;
}

const TrashBin: React.FC<TrashBinProps> = ({ color, className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill={color || 'currentColor'}
  >
    {/* Lid */}
    <path d="M19 6h-1V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1H5a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2zM8 5h8v1H8V5z"/>
    {/* Body */}
    <path d="M6 8v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8H6zm3 10a1 1 0 0 1-2 0v-7a1 1 0 0 1 2 0v7zm4 0a1 1 0 0 1-2 0v-7a1 1 0 0 1 2 0v7zm4 0a1 1 0 0 1-2 0v-7a1 1 0 0 1 2 0v7z"/>
  </svg>
);


export default function ColectareSelectivaPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const wasteCategories = [
    {
      id: 'plastic',
      title: 'PLASTIC/METAL',
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-400',
      bgLight: 'bg-yellow-500/20',
      container: 'Recipient galben (blocuri) sau sac menajer galben (case)',
      icon: Package,
      items: [
        'Sticle PET',
        'Ambalaje plastic',
        'Pungi și folii',
        'Conserve metalice',
        'Doze aluminiu',
        'Capace metalice'
      ],
      instructions: [
        'Recipientele din plastic (PET-urile) se clătesc cu apă rece',
        'Ambalajele din plastic care nu se pot curăța se colectează la deșeurile reziduale',
        'Se scoate dopul și se presează pentru a economisi spațiu'
      ]
    },
    {
      id: 'hartie',
      title: 'HÂRTIE/CARTON',
      color: 'bg-blue-500',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-400',
      bgLight: 'bg-blue-500/20',
      container: 'Recipient albastru (blocuri) sau sac menajer albastru (case)',
      icon: FileText,
      items: [
        'Reviste, ziare, maculatură',
        'Plicuri',
        'Cutii de carton',
        'Fotografii',
        'Cartoane de ouă',
        'Hârtie de ambalaj'
      ],
      instructions: [
        'Prin împărțire se economisește spațiu',
        'Cutiile se desfac și se aplatizează',
        'Hârtia trebuie să fie curată și uscată'
      ]
    },
    {
      id: 'sticla',
      title: 'STICLĂ',
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      textColor: 'text-green-400',
      bgLight: 'bg-green-500/20',
      container: 'Recipient verde (blocuri) sau sac menajer verde (case)',
      icon: Package,
      items: [
        'Sticle de băuturi',
        'Borcane',
        'Sticlă spartă',
        'Ambalaje din sticlă',
        'Damigene'
      ],
      instructions: [
        'Sticla se clătește înainte de aruncare',
        'Se îndepărtează capacele și dopurile',
        'Sticla spartă se ambalează pentru siguranță'
      ]
    },
    {
      id: 'biodegradabil',
      title: 'BIODEGRADABIL',
      color: 'bg-amber-600',
      borderColor: 'border-amber-600',
      textColor: 'text-amber-500',
      bgLight: 'bg-amber-600/20',
      container: 'Recipient maro (blocuri) sau compostor individual (case)',
      icon: Leaf,
      items: [
        'Resturi alimentare',
        'Coji de fructe și legume',
        'Zaț de cafea',
        'Frunze și iarbă',
        'Flori uscate',
        'Cochilii de ouă'
      ],
      instructions: [
        'Deșeurile biodegradabile se colectează separat',
        'Nu se aruncă pungi de plastic în containerul pentru biodegradabile',
        'Se pot composta în grădină pentru îngrășământ natural'
      ]
    },
    {
      id: 'rezidual',
      title: 'REZIDUAL/MENAJER',
      color: 'bg-gray-600',
      borderColor: 'border-gray-600',
      textColor: 'text-gray-400',
      bgLight: 'bg-gray-600/20',
      container: 'Recipient negru/gri sau pubela individuală',
      icon: Trash2,
      items: [
        'Resturi care nu se pot recicla',
        'Ambalaje murdare',
        'Țigări și scrumiere',
        'Produse de igienă personală',
        'Ceramică spartă',
        'Resturi de la aspirator'
      ],
      instructions: [
        'Doar deșeurile care nu pot fi reciclate',
        'Se reduc la minimum deșeurile reziduale',
        'Se verifică dacă nu pot fi reciclate înainte de aruncare'
      ]
    }
  ];

  const filteredCategories = selectedCategory === 'all' 
    ? wasteCategories 
    : wasteCategories.filter(cat => cat.id === selectedCategory);

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
        <div className="text-center pt-20 pb-10">
          <div className="inline-flex items-center justify-center p-3 bg-green-500 rounded-xl mb-6">
            <Recycle className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Cum se face corect colectarea selectivă
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-2">
            Din 1 iulie 2019 este obligatorie colectarea selectivă / separată a deșeurilor pe 4 fracții
          </p>
        </div>

        {/* Calendar Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">Calendar colectare selectivă</h3>
              <p className="text-gray-300 mb-3">
                Consultați programul complet cu zilele de colectare pentru fiecare tip de deșeu, organizat pe zone și tipuri de locuințe.
              </p>
              <a 
                href="https://somabacau.ro/wp-content/uploads/2025/01/Filipesti2025-modificat.png"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-gray-100 font-semibold shadow-md hover:shadow-xl transition-all duration-200 px-5 py-2.5 rounded-lg"
              >
                <FileText className="h-5 w-5" />
                <span>Descarcă Calendar 2025</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          <Button
            onClick={() => setSelectedCategory('all')}
            className={`${
              selectedCategory === 'all' 
                ? 'bg-white text-slate-900 hover:bg-gray-100' 
                : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
            } border-0`}
          >
            Toate categoriile
          </Button>
          {wasteCategories.map(category => (
            <Button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`${
                selectedCategory === category.id 
                  ? `${category.color} text-white hover:opacity-90` 
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              } border-0`}
            >
              {category.title}
            </Button>
          ))}
        </div>

        {/* Waste Categories Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.id} className={`bg-slate-800 border-2 ${category.borderColor} overflow-hidden`}>
                <div className={`${category.color} h-2`}></div>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`relative ${category.bgLight} rounded-xl p-6`}>
                      {/* Trash Bin Icon */}
                      <TrashBin className={`h-16 w-16 ${category.textColor}`} color={undefined} />
                      {/* Recycling symbol overlay */}
                      <div className="absolute bottom-2 right-2 bg-white rounded-full p-1">
                        <Recycle className={`h-6 w-6 ${category.textColor}`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-white">
                        {category.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300 mt-2">
                        {category.container}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Items List */}
                  <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Ce se colectează:
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${category.textColor} flex-shrink-0`} />
                          <span className="text-gray-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Instrucțiuni:
                    </h4>
                    <ul className="space-y-2">
                      {category.instructions.map((instruction, index) => (
                        <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className={`${category.textColor} mt-1`}>•</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

       

        {/* Important Information Section */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Informații importante</h3>
              <p className="text-gray-300">
                Colectarea selectivă este obligatorie prin lege din 1 iulie 2019 și contribuie la protejarea mediului înconjurător. 
                Reciclarea corectă reduce poluarea și economisește resurse naturale valoroase.
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-12">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Sfaturi pentru o reciclare eficientă
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                Spălați ambalajele înainte de a le recicla pentru a evita contaminarea
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                Compactați ambalajele pentru a economisi spațiu în containere
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                Îndepărtați etichetele și capacele diferite de materialul de bază
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                Nu amestecați deșeurile - păstrați-le separate pe categorii
              </p>
            </div>
          </div>
        </div>

        {/* Waste Collection Calendar Section */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 rounded-xl overflow-hidden border border-slate-800 mb-12">
          {/* Calendar Header */}
          <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-center overflow-hidden">
            {/* Background blur effect */}
            <div className="absolute inset-0 bg-green-500/20 blur-2xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                📅 Calendar Colectare Deșeuri 2025
              </h2>
              <p className="text-green-100 text-lg">
                Respectă culorile și colectează separat!
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-6 bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 bg-gray-700 rounded group-hover:scale-110 transition-transform"></div>
              <span className="text-gray-300">Reziduale (neagră)</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 bg-yellow-400 rounded group-hover:scale-110 transition-transform"></div>
              <span className="text-gray-300">Reciclabile (galbenă)</span>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 bg-green-500 rounded group-hover:scale-110 transition-transform"></div>
              <span className="text-gray-300">Vegetale (verde)</span>
            </div>
          </div>

          {/* Calendar Table */}
          <div className="overflow-x-auto px-6 py-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-700">
                  <th className="text-left py-3 px-2 text-white font-semibold">Luna</th>
                  <th className="text-left py-3 px-2 text-white font-semibold">Pubela Neagră</th>
                  <th className="text-left py-3 px-2 text-white font-semibold">Pubela Galbenă</th>
                  <th className="text-left py-3 px-2 text-white font-semibold">Pubela Verde</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { month: 'Ianuarie', black: '10', yellow: '3', green: '15, 25' },
                  { month: 'Februarie', black: '7', yellow: '1', green: '12, 22' },
                  { month: 'Martie', black: '7', yellow: '1', green: '12, 22, 29' },
                  { month: 'Aprilie', black: '11', yellow: '5', green: '9, 19, 26' },
                  { month: 'Mai', black: '9', yellow: '3', green: '14, 24, 30' },
                  { month: 'Iunie', black: '6', yellow: '1', green: '11, 21, 28' },
                  { month: 'Iulie', black: '4', yellow: '-', green: '9, 25' },
                  { month: 'August', black: '8', yellow: '2', green: '13, 30' },
                  { month: 'Septembrie', black: '5', yellow: '-', green: '10, 27' },
                  { month: 'Octombrie', black: '10', yellow: '3', green: '15, 22' },
                  { month: 'Noiembrie', black: '7', yellow: '1', green: '12' },
                  { month: 'Decembrie', black: '10', yellow: '5', green: '13, 20' },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-2 text-white font-semibold">{row.month}</td>
                    <td className="py-4 px-2">
                      <div className="flex flex-wrap gap-1">
                        {row.black.split(', ').map((date, i) => (
                          <span key={i} className="inline-block bg-gray-700 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                            {date}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-wrap gap-1">
                        {row.yellow !== '-' && row.yellow.split(', ').map((date, i) => (
                          <span key={i} className="inline-block bg-yellow-400 text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold">
                            {date}
                          </span>
                        ))}
                        {row.yellow === '-' && <span className="text-gray-500 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-wrap gap-1">
                        {row.green.split(', ').map((date, i) => (
                          <span key={i} className="inline-block bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                            {date}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Section */}
          <div className="px-6 py-6 bg-slate-800/30 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-green-400" />
              Informații despre colectare
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-300 font-semibold text-gray-400 mb-1">Pubela Neagră</p>
                <p className="text-sm text-gray-400">Deșeuri reziduale - colectare săptămânală</p>
              </div>
              <div>
                <p className="text-sm text-gray-300 font-semibold text-gray-400 mb-1">Pubela Galbenă</p>
                <p className="text-sm text-gray-400">Hârtie, carton, plastic, metal - colectare lunară</p>
              </div>
              <div>
                <p className="text-sm text-gray-300 font-semibold text-gray-400 mb-1">Pubela Verde</p>
                <p className="text-sm text-gray-400">Deșeuri vegetale - colectare periodică</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}