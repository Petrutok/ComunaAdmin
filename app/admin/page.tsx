// LOCAȚIE: app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Briefcase, 
  Newspaper, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight,
  Activity,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

interface Stats {
  pendingAnnouncements: number;
  pendingJobs: number;
  pendingCereri: number;
  totalAnnouncements: number;
  totalJobs: number;
  totalCereri: number;
  totalIssues: number;
  activeSubscriptions: number;
}

interface RecentItem {
  id: string;
  title: string;
  type: 'announcement' | 'job' | 'issue' | 'cerere';
  status: string;
  createdAt: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    pendingAnnouncements: 0,
    pendingJobs: 0,
    pendingCereri: 0,
    totalAnnouncements: 0,
    totalJobs: 0,
    totalCereri: 0,
    totalIssues: 0,
    activeSubscriptions: 0
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load ALL announcements without filtering by status first
      const announcementsSnapshot = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
      const announcements = announcementsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          ...data
        };
      });
      
      const pendingAnnouncements = announcements.filter(a => a.status === 'pending').length;
      const totalAnnouncements = announcements.length;

      // Load ALL jobs without filtering by status first
      const jobsSnapshot = await getDocs(collection(db, COLLECTIONS.JOBS));
      const jobs = jobsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          ...data
        };
      });
      
      const pendingJobs = jobs.filter(j => j.status === 'pending').length;
      const totalJobs = jobs.length;

      // Load cereri
      const cereriSnapshot = await getDocs(collection(db, 'cereri'));
      const cereri = cereriSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          status: data.status || 'în așteptare',
          dataInregistrare: data.dataInregistrare,
          tipCerere: data.tipCerere,
          numeComplet: data.numeComplet,
          ...data
        };
      });
      
      const pendingCereri = cereri.filter(c => c.status === 'în așteptare').length;
      const totalCereri = cereri.length;

      // Get recent items for activity feed
      const recent: RecentItem[] = [];
      
      // Add recent announcements
      announcements
        .filter(a => a.createdAt)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3)
        .forEach(item => {
          recent.push({
            id: item.id,
            title: item.title || 'Fără titlu',
            type: 'announcement',
            status: item.status || 'pending',
            createdAt: item.createdAt?.toDate?.() || new Date()
          });
        });

      // Add recent jobs
      jobs
        .filter(j => j.createdAt)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3)
        .forEach(item => {
          recent.push({
            id: item.id,
            title: item.title || 'Fără titlu',
            type: 'job',
            status: item.status || 'pending',
            createdAt: item.createdAt?.toDate?.() || new Date()
          });
        });

      // Add recent cereri
      cereri
        .filter(c => c.dataInregistrare)
        .sort((a, b) => {
          const dateA = new Date(a.dataInregistrare);
          const dateB = new Date(b.dataInregistrare);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3)
        .forEach(item => {
          recent.push({
            id: item.id,
            title: `Cerere ${item.tipCerere} - ${item.numeComplet}`,
            type: 'cerere',
            status: item.status || 'în așteptare',
            createdAt: new Date(item.dataInregistrare)
          });
        });

      // Sort all recent items by date
      recent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setStats({
        pendingAnnouncements,
        pendingJobs,
        pendingCereri,
        totalAnnouncements,
        totalJobs,
        totalCereri,
        totalIssues: 0,
        activeSubscriptions: 0
      });
      
      setRecentItems(recent.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">În așteptare</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 text-white">Aprobat</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Respins</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Newspaper className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      case 'cerere':
        return <FileText className="h-4 w-4" />;
      case 'issue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Admin</h1>
        <p className="text-gray-400">Bine ai revenit! Aici sunt ultimele actualizări.</p>
      </div>

      {/* Quick Actions */}
      {(stats.pendingAnnouncements > 0 || stats.pendingJobs > 0 || stats.pendingCereri > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div className="flex-1">
              <p className="text-white font-medium">
                Ai {stats.pendingAnnouncements + stats.pendingJobs + stats.pendingCereri} elemente în așteptare
              </p>
              <p className="text-sm text-gray-300">
                {stats.pendingAnnouncements > 0 && `${stats.pendingAnnouncements} anunțuri`}
                {stats.pendingAnnouncements > 0 && (stats.pendingJobs > 0 || stats.pendingCereri > 0) && ', '}
                {stats.pendingJobs > 0 && `${stats.pendingJobs} joburi`}
                {(stats.pendingJobs > 0 || stats.pendingAnnouncements > 0) && stats.pendingCereri > 0 && ', '}
                {stats.pendingCereri > 0 && `${stats.pendingCereri} cereri`}
              </p>
            </div>
            <div className="flex gap-2">
              {stats.pendingCereri > 0 && (
                <Link href="/admin/cereri">
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Vezi cereri
                  </Button>
                </Link>
              )}
              {stats.pendingAnnouncements > 0 && (
                <Link href="/admin/announcements">
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Vezi anunțuri
                  </Button>
                </Link>
              )}
              {stats.pendingJobs > 0 && (
                <Link href="/admin/jobs">
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Vezi joburi
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Anunțuri</CardDescription>
              <Newspaper className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalAnnouncements}</div>
            {stats.pendingAnnouncements > 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                {stats.pendingAnnouncements} în așteptare
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Joburi</CardDescription>
              <Briefcase className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalJobs}</div>
            {stats.pendingJobs > 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                {stats.pendingJobs} în așteptare
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Cereri Online</CardDescription>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalCereri}</div>
            {stats.pendingCereri > 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                {stats.pendingCereri} în așteptare
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Probleme Raportate</CardDescription>
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalIssues}</div>
            <p className="text-xs text-gray-500 mt-1">Total istoric</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Notificări Active</CardDescription>
              <Bell className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeSubscriptions}</div>
            <p className="text-xs text-gray-500 mt-1">Utilizatori</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activitate Recentă
          </CardTitle>
          <CardDescription className="text-gray-400">
            Ultimele elemente adăugate în platformă
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentItems.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              Nu există activitate recentă
            </p>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-gray-400">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        {item.type === 'announcement' ? 'Anunț' : 
                         item.type === 'job' ? 'Job' : 
                         item.type === 'cerere' ? 'Cerere' : 'Problemă'}
                      </p>
                      <span className="text-gray-600">•</span>
                      <p className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/notifications">
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 rounded-lg p-3">
                    <Bell className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Test Notificări</h3>
                    <p className="text-sm text-gray-400">Trimite notificări de test</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/announcements">
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 rounded-lg p-3">
                    <Eye className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Moderare Conținut</h3>
                    <p className="text-sm text-gray-400">Aprobă anunțuri și joburi</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// Badge component local
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}