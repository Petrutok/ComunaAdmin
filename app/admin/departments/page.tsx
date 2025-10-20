'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { Department, User, DepartmentFormData } from '@/types/departments';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  UserCog,
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

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    responsibleUserId: null,
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

      // Load users
      const usersQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('active', '==', true),
        orderBy('fullName', 'asc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      // Populate department responsible user names
      const departmentsWithUsers = deptData.map(dept => {
        const responsible = usersData.find(u => u.id === dept.responsibleUserId);
        return {
          ...dept,
          responsibleUserName: responsible?.fullName || undefined,
        };
      });

      setDepartments(departmentsWithUsers);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca departamentele",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Eroare",
        description: "Numele departamentului este obligatoriu",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingDepartment) {
        // Update existing department
        await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, editingDepartment.id), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          responsibleUserId: formData.responsibleUserId || null,
          updatedAt: Timestamp.now(),
        });

        toast({
          title: "Succes",
          description: "Departamentul a fost actualizat",
        });
      } else {
        // Create new department
        await addDoc(collection(db, COLLECTIONS.DEPARTMENTS), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          responsibleUserId: formData.responsibleUserId || null,
          createdAt: Timestamp.now(),
        });

        toast({
          title: "Succes",
          description: "Departamentul a fost creat",
        });
      }

      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva departamentul",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deletingDepartment.id));

      toast({
        title: "Succes",
        description: "Departamentul a fost șters",
      });

      setShowDeleteDialog(false);
      setDeletingDepartment(null);
      loadData();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge departamentul",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description,
      responsibleUserId: department.responsibleUserId,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: '',
      responsibleUserId: null,
    });
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-purple-500/30 rounded-xl p-3 border border-purple-400/20">
              <Building2 className="h-8 w-8 text-purple-300" />
            </div>
            Departamente
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            <span className="font-semibold text-white">{departments.length}</span> departamente înregistrate
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
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Departament Nou
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-slate-800/80 border-slate-600/50 shadow-md">
        <CardContent className="p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input
              placeholder="Caută departament..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-slate-700/50 border-slate-500 text-white placeholder:text-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Departments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <Card className="bg-slate-800/80 border-slate-600/50">
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchTerm ? 'Nu s-au găsit departamente' : 'Nu există departamente înregistrate'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((department) => (
            <Card
              key={department.id}
              className="bg-slate-800/90 border-slate-600/50 hover:border-slate-500 hover:shadow-lg transition-all"
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-400" />
                    {department.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(department)}
                      className="hover:bg-blue-600/20 hover:text-blue-300 text-gray-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeletingDepartment(department);
                        setShowDeleteDialog(true);
                      }}
                      className="hover:bg-rose-600/20 hover:text-rose-300 text-gray-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">
                  {department.description || 'Fără descriere'}
                </p>
                {department.responsibleUserName ? (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCog className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">
                      Responsabil: <span className="text-white font-medium">{department.responsibleUserName}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    Fără responsabil
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDepartment ? 'Editează Departament' : 'Departament Nou'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingDepartment ? 'Modifică informațiile departamentului' : 'Adaugă un departament nou'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nume Departament *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex. Urbanism, Stare Civilă"
                className="bg-slate-700/50 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Descriere</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrierea activității departamentului..."
                className="bg-slate-700/50 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Responsabil Departament</label>
              <Select
                value={formData.responsibleUserId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, responsibleUserId: value === 'none' ? null : value })
                }
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-gray-400">Fără responsabil</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-gray-300">
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button type="submit" className="bg-purple-600 hover:bg-purple-500">
                {editingDepartment ? 'Actualizează' : 'Creează'}
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
              Șterge Departament
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Sigur vrei să ștergi departamentul "{deletingDepartment?.name}"?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingDepartment(null)}>
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
