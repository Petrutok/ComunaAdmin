// LOCAȚIE: app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  BarChart3,
  Calendar,
  MessageSquare,
  Zap,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

interface DashboardStats {
  announcements: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  jobs: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  users: {
    activeSubscriptions: number;
    totalReports: number;
  };
  activity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

interface RecentItem {
  id: string;
  title: string;
  type: 'announcement' | 'job' | 'report';
  status: string;
  createdAt: Date;
  author?: string;
}

interface ChartData {
  name: string;
  value: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    announcements: { total: 0, pending: 0, approved: 0, rejected: 0 },
    jobs: { total: 0, pending: 0, approved: 0, rejected: 0 },
    users: { activeSubscriptions: 0, totalReports: 0 },
    activity: { today: 0, thisWeek: 0, thisMonth: 0 }
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Load ALL announcements
      const announcementsSnapshot = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
      const announcements = announcementsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          contact: data.contact,
          ...data
        };
      });

      // Count by status
      const announcementStats = {
        total: announcements.length,
        pending: announcements.filter(a => a.status === 'pending').length,
        approved: announcements.filter(a => a.status === 'approved').length,
        rejected: announcements.filter(a => a.status === 'rejected').length,
      };

      // Load ALL jobs
      const jobsSnapshot = await getDocs(collection(db, COLLECTIONS.JOBS));
      const jobs = jobsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          company: data.company || '',
          ...data
        };
      });

      // Count by status
      const jobStats = {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        approved: jobs.filter(j => j.status === 'approved').length,
        rejected: jobs.filter(j => j.status === 'rejected').length,
      };

      // Calculate activity stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const allItems = [...announcements, ...jobs];
      const activityStats = {
        today: allItems.filter(item => {
          const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
          return date >= todayStart;
        }).length,
        thisWeek: allItems.filter(item => {
          const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
          return date >= weekStart;
        }).length,
        thisMonth: allItems.filter(item => {
          const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
          return date >= monthStart;
        }).length,
      };

      // Get recent items for activity feed
      const recent: RecentItem[] = [];
      
      // Recent announcements
      announcements
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .forEach(item => {
          recent.push({
            id: item.id,
            title: item.title || 'Anunț fără titlu',
            type: 'announcement',
            status: item.status,
            createdAt: item.createdAt?.toDate?.() || new Date(),
            author: item.contact?.name
          });
        });

      // Recent jobs
      jobs
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .forEach(item => {
          recent.push({
            id: item.id,
            title: item.title || 'Job fără titlu',
            type: 'job',
            status: item.status,
            createdAt: item.createdAt?.toDate?.() || new Date(),
            author: item.company
          });
        });

      // Sort all by date and take top 10
      recent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setStats({
        announcements: announcementStats,
        jobs: jobStats,
        users: {
          activeSubscriptions: 0, // TODO: implementează când ai notificări
          totalReports: 0, // TODO: implementează când ai rapoarte
        },
        activity: activityStats
      });
      
      setRecentItems(recent.slice(0, 10));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      case 'report':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const totalPending = stats.announcements.pending + stats.jobs.pending;
  const approvalRate = stats.announcements.total > 0 
    ? Math.round((stats.announcements.approved / stats.announcements.total) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Se încarcă dashboard-ul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Admin</h1>
          <p className="text-gray-400">
            Bine ai revenit! Ultima actualizare: {lastUpdate.toLocaleTimeString('ro-RO')}
          </p>
        </div>
        <Button
          onClick={() => loadDashboardData(true)}
          disabled={refreshing}
          variant="outline"
          className="bg-slate-700 hover:bg-slate-600"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualizează
        </Button>
      </div>

      {/* Alert Banner for Pending Items */}
      {totalPending > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 rounded-full p-2">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  Ai {totalPending} {totalPending === 1 ? 'element' : 'elemente'} în așteptare
                </p>
                <p className="text-sm text-gray-300">
                  {stats.announcements.pending > 0 && `${stats.announcements.pending} anunțuri`}
                  {stats.announcements.pending > 0 && stats.jobs.pending > 0 && ' și '}
                  {stats.jobs.pending > 0 && `${stats.jobs.pending} joburi`}
                  {' necesită aprobare'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {stats.announcements.pending > 0 && (
                <Link href="/admin/announcements">
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Vezi anunțuri
                  </Button>
                </Link>
              )}
              {stats.jobs.pending > 0 && (
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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Announcements Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Anunțuri</CardDescription>
              <Newspaper className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{stats.announcements.total}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-400">În așteptare</span>
                <span className="font-medium text-white">{stats.announcements.pending}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400">Aprobate</span>
                <span className="font-medium text-white">{stats.announcements.approved}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Respinse</span>
                <span className="font-medium text-white">{stats.announcements.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Joburi</CardDescription>
              <Briefcase className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{stats.jobs.total}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-400">În așteptare</span>
                <span className="font-medium text-white">{stats.jobs.pending}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400">Aprobate</span>
                <span className="font-medium text-white">{stats.jobs.approved}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Respinse</span>
                <span className="font-medium text-white">{stats.jobs.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Activitate</CardDescription>
              <Activity className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{stats.activity.thisMonth}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Azi</span>
                <span className="font-medium text-white">{stats.activity.today}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Ultima săptămână</span>
                <span className="font-medium text-white">{stats.activity.thisWeek}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Luna aceasta</span>
                <span className="font-medium text-white">{stats.activity.thisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-gray-400">Performanță</CardDescription>
              <BarChart3 className="h-5 w-5 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{approvalRate}%</div>
            <p className="text-sm text-gray-400 mb-3">Rată aprobare</p>
            <Progress value={approvalRate} className="h-2 bg-slate-700" />
            <div className="mt-3 flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-gray-400">vs. luna trecută</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity - 2 columns */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800 border-slate-700 h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activitate Recentă
                </CardTitle>
                <Link href="/admin/activity">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    Vezi tot
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-gray-400">
                Ultimele acțiuni din platformă
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
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${
                        item.type === 'announcement' ? 'bg-blue-500/20' :
                        item.type === 'job' ? 'bg-purple-500/20' : 'bg-red-500/20'
                      }`}>
                        {getItemIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {item.type === 'announcement' ? 'Anunț' : 
                             item.type === 'job' ? 'Job' : 'Raport'}
                          </span>
                          {item.author && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span className="text-xs text-gray-400">{item.author}</span>
                            </>
                          )}
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - 1 column */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Statistici Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-gray-400">Total conținut</span>
                <span className="font-medium text-white">
                  {stats.announcements.total + stats.jobs.total}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-gray-400">Rată respingere</span>
                <span className="font-medium text-red-400">
                  {stats.announcements.total > 0 
                    ? Math.round((stats.announcements.rejected / stats.announcements.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-gray-400">Timp mediu aprobare</span>
                <span className="font-medium text-white">~24h</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Acțiuni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/notifications" className="block">
                <Button className="w-full justify-start bg-slate-700 hover:bg-slate-600" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Trimite Notificare
                </Button>
              </Link>
              <Link href="/admin/announcements" className="block">
                <Button className="w-full justify-start bg-slate-700 hover:bg-slate-600" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Moderare Conținut
                </Button>
              </Link>
              <Link href="/admin/reports" className="block">
                <Button className="w-full justify-start bg-slate-700 hover:bg-slate-600" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Vezi Rapoarte
                </Button>
              </Link>
              <Link href="/admin/settings" className="block">
                <Button className="w-full justify-start bg-slate-700 hover:bg-slate-600" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Setări Sistem
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}