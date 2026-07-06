"use client";

import { useState, useEffect } from 'react'; // Am adaugat useEffect
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Home,
  Search,
  Calendar,
  AlertTriangle,
  FileText,
  Megaphone,
  Clock,
  ArrowLeft
} from 'lucide-react';

type CategoryType = 'urgent' | 'eveniment' | 'administrativ' | 'proiect';

// Structura trebuie să fie compatibilă cu Adminul
interface Notice {
  id: number;
  title: string;
  date: string;
  category: CategoryType;
  content: string;
  imageUrl?: string;
  status?: string; // Important pentru filtrare
}

export default function DigitalNoticeBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  // ÎNCĂRCARE DIN LOCAL STORAGE (Sincronizare cu Admin)
  useEffect(() => {
    // Încercăm să luăm datele din Admin Panel
    const savedData = localStorage.getItem('app_announcements');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Filtrăm doar ce este "published"
      const published = parsedData.filter((p: any) => p.status === 'published');
      setNotices(published);
    } else {
      // Date default doar dacă nu există nimic salvat
      setNotices([
        {
          id: 1,
          category: 'administrativ',
          title: "Bine ați venit",
          date: "Azi",
          content: "Momentan nu există anunțuri publicate din panoul de administrare.",
          status: 'published'
        }
      ]);
    }
  }, []);

  const getCategoryTheme = (type: CategoryType) => {
    switch (type) {
      case 'urgent': return { style: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle, label: 'Urgent' };
      case 'eveniment': return { style: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Calendar, label: 'Eveniment' };
      case 'administrativ': return { style: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: FileText, label: 'Info' };
      case 'proiect': return { style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Megaphone, label: 'Investiții' };
      default: return { style: 'bg-slate-500/20 text-slate-300', icon: FileText, label: 'Info' };
    }
  };

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // VIZUALIZARE DETALIATĂ
  if (selectedNotice) {
    const theme = getCategoryTheme(selectedNotice.category);
    const ThemeIcon = theme.icon;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-10">
        <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedNotice(null)} className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2 gap-2">
              <ArrowLeft className="h-5 w-5" /> Înapoi
            </Button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className={`${theme.style} px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-medium`}>
              <ThemeIcon className="h-4 w-4" /> {theme.label}
            </Badge>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Clock className="h-4 w-4" /> {selectedNotice.date}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">{selectedNotice.title}</h1>
          {selectedNotice.imageUrl && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 mb-8 shadow-2xl">
              <img src={selectedNotice.imageUrl} alt={selectedNotice.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="prose prose-invert prose-lg max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
            {selectedNotice.content}
          </div>
        </div>
      </div>
    );
  }

  // LISTA NORMALĂ
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-10">
      <button onClick={() => window.location.href = '/'} className="hidden md:block fixed top-6 left-6 z-50 group">
        <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
          <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-semibold">Acasă</span>
        </div>
      </button>

      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => window.location.href = '/'} className="md:hidden p-2 -ml-2 hover:bg-slate-800 rounded-xl transition-colors">
            <Home className="h-5 w-5 text-slate-400" />
          </button>
          <h1 className="font-semibold text-lg ml-2 md:ml-0">Noutăți Publice</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input placeholder="Caută în anunțuri..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-slate-800 border-slate-700 text-base rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500" />
        </div>

        <div className="space-y-6">
          {filteredNotices.map((notice) => {
            const theme = getCategoryTheme(notice.category);
            const ThemeIcon = theme.icon;
            return (
              <Card key={notice.id} onClick={() => setSelectedNotice(notice)} className="bg-slate-800 border-slate-700 overflow-hidden shadow-lg rounded-xl transition-all hover:border-slate-500 hover:shadow-2xl cursor-pointer group">
                <div className="px-5 pt-5 flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`${theme.style} px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium`}>
                    <ThemeIcon className="h-3.5 w-3.5" /> {theme.label}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> {notice.date}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{notice.title}</h2>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base line-clamp-3">{notice.content}</p>
                  <div className="mt-3 text-sm text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Citește tot <ArrowLeft className="h-3 w-3 rotate-180" />
                  </div>
                </div>
                {notice.imageUrl && (
                  <div className="w-full h-56 md:h-64 relative bg-slate-700 border-t border-slate-700/50">
                    <img src={notice.imageUrl} alt={notice.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
              </Card>
            );
          })}
          {filteredNotices.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nu s-au găsit anunțuri.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}