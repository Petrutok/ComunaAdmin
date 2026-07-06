"use client";

import { useState, useEffect } from 'react'; // Am adaugat useEffect
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  ArrowLeft,
  Image as ImageIcon,
  AlertTriangle,
  Calendar,
  FileText,
  Megaphone,
  Clock,
  CheckCircle2
} from 'lucide-react';

type CategoryType = 'urgent' | 'eveniment' | 'administrativ' | 'proiect';
type PostStatus = 'published' | 'draft';

interface AdminPost {
  id: number;
  title: string;
  content: string;
  category: CategoryType;
  status: PostStatus;
  date: string;
  createdAt: string;
  imageUrl?: string;
}

const getCategoryTheme = (type: CategoryType) => {
  switch (type) {
    case 'urgent': return { style: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle, label: 'Urgent' };
    case 'eveniment': return { style: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Calendar, label: 'Eveniment' };
    case 'administrativ': return { style: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: FileText, label: 'Info' };
    case 'proiect': return { style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Megaphone, label: 'Investiții' };
    default: return { style: 'bg-slate-500/20 text-slate-300', icon: FileText, label: 'General' };
  }
};

export default function AdminFeedPage() {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Date inițiale default (dacă nu avem nimic salvat)
  const initialPosts: AdminPost[] = [
    {
      id: 1,
      title: "Bine ați venit pe noua platformă",
      content: "Acesta este un exemplu de anunț. Puteți șterge acest anunț și adăuga altele noi din panoul de administrare.",
      category: 'administrativ',
      status: 'published',
      date: "Azi, 10:00",
      createdAt: new Date().toISOString(),
      imageUrl: "https://images.unsplash.com/photo-1596386461350-326ea7750550?q=80&w=1000"
    }
  ];

  const [posts, setPosts] = useState<AdminPost[]>(initialPosts);

  // 1. ÎNCĂRCARE DIN LOCAL STORAGE LA PORNIRE
  useEffect(() => {
    const savedData = localStorage.getItem('app_announcements');
    if (savedData) {
      setPosts(JSON.parse(savedData));
    }
  }, []);

  // 2. FUNCȚIE DE SALVARE ÎN STORAGE
  const saveToStorage = (updatedPosts: AdminPost[]) => {
    setPosts(updatedPosts);
    localStorage.setItem('app_announcements', JSON.stringify(updatedPosts));
  };

  const defaultFormState: AdminPost = {
    id: 0,
    title: '',
    content: '',
    category: 'administrativ',
    status: 'draft',
    date: 'Azi, ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    createdAt: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState<AdminPost>(defaultFormState);

  const handleCreateNew = () => {
    setFormData({ ...defaultFormState, id: Date.now() });
    setEditingId(null);
    setView('editor');
  };

  const handleEdit = (post: AdminPost) => {
    setFormData(post);
    setEditingId(post.id);
    setView('editor');
  };

  const handleDelete = (id: number) => {
    if (confirm('Sigur doriți să ștergeți acest anunț?')) {
      const updated = posts.filter(p => p.id !== id);
      saveToStorage(updated); // Salvăm modificarea
    }
  };

  const handleSave = (targetStatus: PostStatus) => {
    if (!formData.title || !formData.content) {
      alert("Titlul și conținutul sunt obligatorii!");
      return;
    }
    const savedPost = { ...formData, status: targetStatus };
    
    let updatedPosts;
    if (editingId) {
      updatedPosts = posts.map(p => p.id === editingId ? savedPost : p);
    } else {
      updatedPosts = [savedPost, ...posts];
    }
    
    saveToStorage(updatedPosts); // Salvăm modificarea
    setView('list');
  };

  const toggleStatus = (id: number) => {
    const updated = posts.map(p => p.id === id ? { ...p, status: p.status === 'published' ? 'draft' : 'published' as PostStatus } : p);
    saveToStorage(updated); // Salvăm modificarea
  };

  // Preview Component
  const FeedCardPreview = ({ post }: { post: AdminPost }) => {
    const theme = getCategoryTheme(post.category);
    const ThemeIcon = theme.icon;
    return (
      <Card className="bg-slate-800 border-slate-700 overflow-hidden shadow-lg rounded-xl">
        <div className="px-5 pt-5 flex items-center justify-between mb-3">
          <Badge variant="outline" className={`${theme.style} px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium`}>
            <ThemeIcon className="h-3.5 w-3.5" />
            {theme.label}
          </Badge>
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {post.date}
          </div>
        </div>
        <div className="px-5 pb-5">
          <h2 className="text-xl font-bold text-white mb-2 break-words">{post.title || "Titlu Anunț"}</h2>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-line break-words">
            {post.content || "Conținutul va apărea aici..."}
          </p>
        </div>
        {post.imageUrl && (
          <div className="w-full h-56 relative bg-slate-700 border-t border-slate-700/50">
            <img src={post.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      <div className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col p-4 shrink-0">
        <div className="text-xl font-bold text-white mb-8 px-2 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-500" />
          Admin
        </div>
        <Button variant="secondary" className="w-full justify-start bg-slate-800 text-white font-medium mb-1">
          <Megaphone className="mr-2 h-4 w-4" /> Feed Public
        </Button>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Feed Public</h1>
            <p className="text-slate-400 text-sm">Orice modificare se salvează automat și apare pe site.</p>
          </div>
          {view === 'list' && (
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
              <Plus className="h-4 w-4" /> Adaugă
            </Button>
          )}
        </div>

        {view === 'list' && (
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Titlu</th>
                    <th className="px-6 py-4">Categorie</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-white">{post.title}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">{post.category}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {post.status === 'published' ? (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Publicat</span>
                        ) : (
                          <span className="text-yellow-400 flex items-center gap-1"><Clock className="h-3 w-3"/> Draft</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus(post.id)} className="text-slate-400 hover:text-white">
                          {post.status === 'published' ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="text-slate-400 hover:text-blue-400">
                          <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-slate-400 hover:text-red-400">
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {view === 'editor' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={() => setView('list')} className="text-slate-400 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Înapoi
              </Button>
              <Card className="bg-slate-900 border-slate-800 p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white">{editingId ? 'Editare' : 'Anunț Nou'}</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Titlu</label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-slate-950 border-slate-800 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Categorie</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['urgent', 'eveniment', 'administrativ', 'proiect'] as CategoryType[]).map((cat) => (
                      <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-3 py-1.5 rounded-lg text-sm border ${formData.category === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Imagine URL</label>
                  <Input value={formData.imageUrl || ''} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} className="bg-slate-950 border-slate-800 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Conținut</label>
                  <Textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="min-h-[150px] bg-slate-950 border-slate-800 text-white" />
                </div>
                <div className="pt-4 flex gap-4">
                  <Button variant="outline" onClick={() => handleSave('draft')} className="flex-1 border-slate-700 text-slate-300">Draft</Button>
                  <Button onClick={() => handleSave('published')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">Publică</Button>
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Preview</div>
              <FeedCardPreview post={formData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}