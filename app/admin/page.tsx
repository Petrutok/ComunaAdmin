'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Briefcase, Clock, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

interface DashboardStats {
  pendingAnnouncements: number;
  pendingJobs: number;
  totalNotifications: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingAnnouncements: 0,
    pendingJobs: 0,
    totalNotifications: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Anunțuri în așteptare
      const announcementsQuery = query(
        collection(db, COLLECTIONS.ANNOUNCEMENTS),
        where('status', '==', 'pending')
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      
      // Job-uri în așteptare
      const jobsQuery = query(
        collection(db, COLLECTIONS.JOBS),
        where('status', '==', 'pending')
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      
      // Total notificări (toate notificările trimise)
      const notificationsSnapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
      
      setStats({
        pendingAnnouncements: announcementsSnapshot.size,
        pendingJobs: jobsSnapshot.size,
        totalNotifications: notificationsSnapshot.size,
        activeUsers: 0, // Acest număr vine din OneSignal
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Anunțuri în așteptare
            </CardTitle>
            <Newspaper className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? (
                <span className="text-gray-500">...</span>
              ) : (
                stats.pendingAnnouncements
              )}
            </div>
            <Link href="/admin/announcements">
              <Button variant="link" className="p-0 h-auto text-blue-400">
                Vezi toate →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Joburi în așteptare
            </CardTitle>
            <Briefcase className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? (
                <span className="text-gray-500">...</span>
              ) : (
                stats.pendingJobs
              )}
            </div>
            <Link href="/admin/jobs">
              <Button variant="link" className="p-0 h-auto text-blue-400">
                Vezi toate →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Notificări trimise
            </CardTitle>
            <Bell className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? (
                <span className="text-gray-500">...</span>
              ) : (
                stats.totalNotifications
              )}
            </div>
            <Link href="/admin/notifications">
              <Button variant="link" className="p-0 h-auto text-blue-400">
                Trimite notificare →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              Utilizatori activi
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">-</div>
            <p className="text-xs text-gray-400">Din OneSignal Dashboard</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistici suplimentare */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Activitate recentă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Anunțuri aprobate azi</span>
                <span className="text-sm font-medium text-white">
                  {loading ? '...' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Job-uri aprobate azi</span>
                <span className="text-sm font-medium text-white">
                  {loading ? '...' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Notificări trimise azi</span>
                <span className="text-sm font-medium text-white">
                  {loading ? '...' : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Acțiuni rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/announcements" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Newspaper className="h-4 w-4 mr-2" />
                Moderează anunțuri
              </Button>
            </Link>
            <Link href="/admin/jobs" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="h-4 w-4 mr-2" />
                Moderează job-uri
              </Button>
            </Link>
            <Link href="/admin/notifications" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Trimite notificare
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}