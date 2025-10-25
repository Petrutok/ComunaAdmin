'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  Bell,
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  Newspaper,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  X,
  MessageSquare,
  User,
  MapPin,
  ChevronRight,
  AlertCircle,
  Mail,
  Building2,
  Users,
  Briefcase,
  Home
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, COLLECTIONS } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { RegistraturaEmail } from '@/types/registratura';

interface PendingItem {
  id: string;
  type: 'cerere' | 'problema' | 'anunt' | 'eveniment';
  title: string;
  description: string;
  author?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
}

export default function AdminDashboard() {
  const { isAdmin, isEmployee, userId } = useAdminAuth();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [myAssignedEmails, setMyAssignedEmails] = useState<RegistraturaEmail[]>([]);

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      const items: PendingItem[] = [];

      // Load latest form submissions (cereri)
      try {
        const cereriQuery = query(
          collection(db, 'form_submissions'),
          orderBy('createdAt', 'desc'),
        );
        const cereriDocs = await getDocs(cereriQuery);
        const cereriItems = cereriDocs.docs.slice(0, 5).map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'cerere' as const,
            title: data.formType || 'Cerere nouă',
            description: data.description || `Cerere ${data.formType || 'nouă'}`,
            author: data.applicantName || data.fullName || 'Utilizator',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            status: 'pending' as const,
            priority: 'medium' as const
          };
        });
        items.push(...cereriItems);
      } catch (error) {
        console.log('Note: form_submissions collection not available yet');
      }

      // Load latest reported issues (probleme)
      try {
        const problemsQuery = query(
          collection(db, 'reported_issues'),
          orderBy('createdAt', 'desc'),
        );
        const problemsDocs = await getDocs(problemsQuery);
        const problemItems = problemsDocs.docs.slice(0, 5).map(doc => {
          const data = doc.data();
          const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'urgent': 'urgent'
          };
          return {
            id: doc.id,
            type: 'problema' as const,
            title: data.title || 'Problemă raportată',
            description: data.description || '',
            author: data.reporterName || 'Utilizator',
            location: data.location || '',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            status: 'pending' as const,
            priority: priorityMap[data.priority] || 'medium' as const
          };
        });
        items.push(...problemItems);
      } catch (error) {
        console.log('Note: reported_issues collection not available yet');
      }

      // Load latest announcements (anunturi)
      try {
        const announcementsQuery = query(
          collection(db, 'announcements'),
          orderBy('createdAt', 'desc'),
        );
        const announcementsDocs = await getDocs(announcementsQuery);
        const announcementItems = announcementsDocs.docs.slice(0, 5).map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'anunt' as const,
            title: data.title || 'Anunț',
            description: data.description || data.content || '',
            author: 'Administrator',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            status: data.published ? ('approved' as const) : ('pending' as const),
            priority: 'medium' as const
          };
        });
        items.push(...announcementItems);
      } catch (error) {
        console.log('Note: announcements collection not available yet');
      }

      // Sort by date and take top 10
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPendingItems(items.slice(0, 10));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Load assigned emails for employees
  useEffect(() => {
    if (isEmployee && userId) {
      console.log('[EMPLOYEE-DASHBOARD] Effect triggered - isEmployee:', isEmployee, 'userId:', userId);
      loadMyAssignedEmails();
    } else {
      console.log('[EMPLOYEE-DASHBOARD] Effect skipped - isEmployee:', isEmployee, 'userId:', userId);
    }
  }, [isEmployee, userId]);

  const loadMyAssignedEmails = async () => {
    if (!userId) {
      console.log('[EMPLOYEE-DASHBOARD] No userId available');
      return;
    }

    try {
      console.log('[EMPLOYEE-DASHBOARD] Loading emails for userId:', userId);
      const emailsQuery = query(
        collection(db, COLLECTIONS.REGISTRATURA_EMAILS),
        where('assignedToUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(emailsQuery);
      console.log('[EMPLOYEE-DASHBOARD] Found', snapshot.docs.length, 'assigned emails');

      const emails = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('[EMPLOYEE-DASHBOARD] Email:', doc.id, 'assigned to:', data.assignedToUserId);
        return {
          id: doc.id,
          ...data,
        };
      }) as RegistraturaEmail[];

      setMyAssignedEmails(emails);
      console.log('[EMPLOYEE-DASHBOARD] Loaded emails:', emails);
    } catch (error) {
      console.error('Error loading assigned emails:', error);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Acum câteva secunde';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Acum ${minutes} ${minutes === 1 ? 'minut' : 'minute'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`;
    const days = Math.floor(hours / 24);
    return `Acum ${days} ${days === 1 ? 'zi' : 'zile'}`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">În așteptare</Badge>;
      case 'in_review': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">În verificare</Badge>;
      case 'approved': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprobat</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Respins</Badge>;
      default: return null;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'cerere': return <FileText className="h-4 w-4" />;
      case 'problema': return <AlertTriangle className="h-4 w-4" />;
      case 'anunt': return <Newspaper className="h-4 w-4" />;
      case 'eveniment': return <Calendar className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'cerere': return 'Cerere nouă';
      case 'problema': return 'Problemă raportată';
      case 'anunt': return 'Anunț de revizuit';
      case 'eveniment': return 'Eveniment';
      default: return 'Notificare';
    }
  };

  const pendingCount = pendingItems.filter(item => item.status === 'pending').length;
  const inReviewCount = pendingItems.filter(item => item.status === 'in_review').length;
  const urgentCount = pendingItems.filter(item => item.priority === 'urgent').length;

  // Show employee dashboard if user is employee
  if (isEmployee) {
    const myNewEmails = myAssignedEmails.filter(e => e.status === 'nou');
    const myInProgressEmails = myAssignedEmails.filter(e => e.status === 'in_lucru');
    const myResolvedEmails = myAssignedEmails.filter(e => e.status === 'rezolvat');

    return (
      <div className="space-y-6">
        {/* Employee Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lucrările Mele</h1>
            <p className="text-gray-400">Documente atribuite mie</p>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{myNewEmails.length}</p>
                  <p className="text-sm text-gray-400">Noi</p>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-2">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{myInProgressEmails.length}</p>
                  <p className="text-sm text-gray-400">În lucru</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{myResolvedEmails.length}</p>
                  <p className="text-sm text-gray-400">Rezolvate</p>
                </div>
                <div className="bg-emerald-500/20 rounded-lg p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Assigned Documents */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Documente Atribuite Mie</CardTitle>
            <CardDescription className="text-gray-400">
              Toate documentele pe care trebuie să le procesez
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myAssignedEmails.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-full mb-4">
                  <Mail className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-400 text-lg font-medium">Nu ai documente atribuite</p>
                <p className="text-gray-500 text-sm mt-1">Documentele tale vor apărea aici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAssignedEmails.map((email) => (
                  <Link key={email.id} href={`/admin/registratura`}>
                    <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-all border border-slate-600/50 hover:border-slate-500 cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">{email.subject || 'Fără subiect'}</h4>
                            <Badge className={`text-xs ${
                              email.status === 'nou' ? 'bg-blue-600' :
                              email.status === 'in_lucru' ? 'bg-amber-600' :
                              email.status === 'rezolvat' ? 'bg-emerald-600' :
                              'bg-gray-600'
                            }`}>
                              {email.status === 'nou' ? 'Nou' :
                               email.status === 'in_lucru' ? 'În lucru' :
                               email.status === 'rezolvat' ? 'Rezolvat' : 'Respins'}
                            </Badge>
                            {email.priority && (
                              <Badge className={`text-xs ${
                                email.priority === 'urgent' ? 'bg-rose-600' :
                                email.priority === 'normal' ? 'bg-amber-600' :
                                'bg-gray-600'
                              }`}>
                                {email.priority === 'urgent' ? 'Urgent' :
                                 email.priority === 'normal' ? 'Normal' : 'Scăzută'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            De la: {email.senderName || email.senderEmail}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Nr. înregistrare: {email.registrationNumber}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <Link href="/admin/registratura">
              <div className="flex items-center justify-between cursor-pointer hover:bg-slate-700/50 p-4 rounded-lg transition-all">
                <div>
                  <p className="text-white font-medium">Vezi toate în Registratură</p>
                  <p className="text-sm text-gray-400 mt-1">Gestionează documentele tale</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard (original)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Control Center</h1>
          <p className="text-gray-400">Monitorizează și gestionează activitatea în timp real</p>
        </div>
      </div>


      {/* Alert Banner pentru urgențe */}
      {urgentCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 rounded-full p-2">
              <AlertCircle className="h-5 w-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <p className="text-white font-medium">
                {urgentCount} {urgentCount === 1 ? 'item urgent' : 'iteme urgente'} necesită atenție imediată
              </p>
              <p className="text-gray-400 text-sm">Verifică problemele marcate ca urgente</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            onClick={() => {/* Filter urgent items */}}
          >
            Vezi urgențe
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-gray-400">În așteptare</p>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{inReviewCount}</p>
                <p className="text-sm text-gray-400">În verificare</p>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-2">
                <Eye className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{urgentCount}</p>
                <p className="text-sm text-gray-400">Urgente</p>
              </div>
              <div className="bg-red-500/20 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  {new Date().getHours() < 12 ? 'Dimineață' : new Date().getHours() < 18 ? 'După-amiază' : 'Seară'}
                </p>
                <p className="text-sm text-gray-400">Perioada zilei</p>
              </div>
              <div className="bg-purple-500/20 rounded-lg p-2">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Pending Items */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Iteme care necesită atenție
            </CardTitle>
            <CardDescription className="text-gray-400">
              Cele mai noi cereri, probleme și anunțuri care așteaptă acțiunea ta
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const isNew = item.status === 'pending';
              return (
                <Link key={item.id} href={`/admin/${item.type === 'cerere' ? 'cereri' : item.type === 'problema' ? 'issues' : 'announcements'}`}>
                  <div className={`rounded-lg p-4 transition-all border cursor-pointer ${
                    isNew
                      ? 'bg-slate-700/80 border-blue-500/50 hover:bg-slate-700 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700 hover:border-slate-500'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          item.type === 'problema' ? 'bg-orange-500/20 text-orange-400' :
                          item.type === 'cerere' ? 'bg-blue-500/20 text-blue-400' :
                          item.type === 'anunt' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {getItemIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-white">{item.title}</h4>
                            {isNew && (
                              <Badge className="bg-blue-600/80 text-white text-xs animate-pulse">Nou</Badge>
                            )}
                            {item.priority && (
                              <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                {item.priority === 'urgent' ? 'Urgent' :
                                 item.priority === 'high' ? 'Înaltă' :
                                 item.priority === 'medium' ? 'Medie' : 'Scăzută'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              {getTimeAgo(item.createdAt)}
                            </span>
                            {item.author && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3 flex-shrink-0" />
                                {item.author}
                              </span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {item.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {pendingItems.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-gray-400 text-lg font-medium">Toate itemele au fost procesate</p>
              <p className="text-gray-500 text-sm mt-1">Nu există cereri sau probleme în așteptare</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/cereri">
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Vezi toate cererile</p>
                  <p className="text-sm text-gray-400 mt-1">Gestionează cererile cetățenilor</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/issues">
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Probleme raportate</p>
                  <p className="text-sm text-gray-400 mt-1">Vezi toate problemele raportate</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/notificari">
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Trimite notificare</p>
                  <p className="text-sm text-gray-400 mt-1">Notifică cetățenii</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}