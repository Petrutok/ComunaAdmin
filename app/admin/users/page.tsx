'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { Department, User, UserFormData, UserRole } from '@/types/departments';
import {
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  UserCheck,
  UserX,
  Mail,
  Building2,
  Shield,
  Crown,
  Briefcase,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const roleConfig = {
  admin: { label: 'Administrator (Primar/Secretar)', icon: Shield, color: 'bg-rose-600' },
  employee: { label: 'Angajat', icon: Briefcase, color: 'bg-blue-600' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    fullName: '',
    role: 'employee',
    departmentId: null,
    active: true,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersQuery = query(
        collection(db, COLLECTIONS.USERS),
        orderBy('fullName', 'asc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      // Load departments
      const deptQuery = query(
        collection(db, COLLECTIONS.DEPARTMENTS),
        orderBy('name', 'asc')
      );
      const deptSnapshot = await getDocs(deptQuery);
      const deptData = deptSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Department[];

      // Populate department names
      const usersWithDepartments = usersData.map(user => {
        const department = deptData.find(d => d.id === user.departmentId);
        return {
          ...user,
          departmentName: department?.name || undefined,
        };
      });

      setUsers(usersWithDepartments);
      setDepartments(deptData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca utilizatorii",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.fullName.trim()) {
      toast({
        title: "Eroare",
        description: "Email-ul și numele sunt obligatorii",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, COLLECTIONS.USERS, editingUser.id), {
          fullName: formData.fullName.trim(),
          role: formData.role,
          departmentId: formData.departmentId || null,
          active: formData.active,
          updatedAt: Timestamp.now(),
        });

        toast({
          title: "Succes",
          description: "Utilizatorul a fost actualizat",
        });
      } else {
        // Create new user (use email as document ID for simplicity)
        const userId = formData.email.replace(/[@.]/g, '_');
        await setDoc(doc(db, COLLECTIONS.USERS, userId), {
          email: formData.email.trim().toLowerCase(),
          fullName: formData.fullName.trim(),
          role: formData.role,
          departmentId: formData.departmentId || null,
          active: formData.active,
          createdAt: Timestamp.now(),
        });

        toast({
          title: "Succes",
          description: "Utilizatorul a fost creat",
        });
      }

      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva utilizatorul",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.id), {
        active: !user.active,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Succes",
        description: `Utilizatorul a fost ${!user.active ? 'activat' : 'dezactivat'}`,
      });

      loadData();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza statusul",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, deletingUser.id));

      toast({
        title: "Succes",
        description: "Utilizatorul a fost șters",
      });

      setShowDeleteDialog(false);
      setDeletingUser(null);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge utilizatorul",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      active: user.active,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      fullName: '',
      role: 'employee',
      departmentId: null,
      active: true,
    });
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = users.filter(u => u.active).length;

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-green-500/30 rounded-xl p-3 border border-green-500/20">
              <UsersIcon className="h-8 w-8 text-green-500" />
            </div>
            Utilizatori
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            <span className="font-semibold text-white">{activeCount}</span> utilizatori activi din <span className="font-semibold text-white">{users.length}</span> total
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {currentTime.toLocaleDateString('ro-RO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-2xl font-mono text-white">
              {currentTime.toLocaleTimeString('ro-RO')}
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="bg-green-500 hover:bg-green-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Utilizator Nou
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-slate-800/80 border-slate-600/50 shadow-md">
        <CardContent className="p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input
              placeholder="Caută utilizator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-slate-700/50 border-slate-500 text-white placeholder:text-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="bg-slate-800/80 border-slate-600/50">
          <CardContent className="text-center py-12">
            <UsersIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchTerm ? 'Nu s-au găsit utilizatori' : 'Nu există utilizatori înregistrați'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => {
            const roleInfo = roleConfig[user.role];
            const RoleIcon = roleInfo.icon;

            return (
              <Card
                key={user.id}
                className={`bg-slate-800/90 border-slate-600/50 hover:border-slate-500 hover:shadow-lg transition-all ${
                  !user.active ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white">
                          {user.fullName}
                        </h3>
                        <Badge className={`${roleInfo.color} text-white flex items-center gap-1.5`}>
                          <RoleIcon className="h-3.5 w-3.5" />
                          {roleInfo.label}
                        </Badge>
                        <Badge
                          className={user.active ? 'bg-emerald-600' : 'bg-gray-600'}
                        >
                          {user.active ? 'Activ' : 'Inactiv'}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {user.email}
                        </div>
                        {user.departmentName && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {user.departmentName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(user)}
                        className={user.active
                          ? "hover:bg-amber-600/20 hover:text-amber-300 text-gray-300"
                          : "hover:bg-emerald-600/20 hover:text-emerald-300 text-gray-300"
                        }
                        title={user.active ? 'Dezactivează' : 'Activează'}
                      >
                        {user.active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(user)}
                        className="hover:bg-blue-600/20 hover:text-blue-300 text-gray-300"
                        title="Editează"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeletingUser(user);
                          setShowDeleteDialog(true);
                        }}
                        className="hover:bg-rose-600/20 hover:text-rose-300 text-gray-300"
                        title="Șterge"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingUser ? 'Editează Utilizator' : 'Utilizator Nou'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingUser ? 'Modifică informațiile utilizatorului' : 'Adaugă un utilizator nou'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="bg-slate-700/50 border-slate-600 text-white"
                required
                disabled={!!editingUser}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nume Complet *</label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ion Popescu"
                className="bg-slate-700/50 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Rol *</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="employee" className="text-gray-300">Angajat</SelectItem>
                  <SelectItem value="admin" className="text-gray-300">Administrator (Primar/Secretar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Departament</label>
              <Select
                value={formData.departmentId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value === 'none' ? null : value })
                }
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-gray-400">Fără departament</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="text-gray-300">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-slate-600"
              />
              <label htmlFor="active" className="text-sm text-gray-300">
                Utilizator activ
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-slate-600 text-gray-300"
              >
                Anulează
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
                {editingUser ? 'Actualizează' : 'Creează'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Șterge Utilizator
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Sigur vrei să ștergi utilizatorul "{deletingUser?.fullName}"?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUser(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
