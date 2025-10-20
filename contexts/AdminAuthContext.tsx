// contexts/AdminAuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/types/departments';

// LISTA DE ADMINISTRATORI AUTORIZAȚI
// Poți adăuga/elimina email-uri aici sau le poți muta în Firestore
const AUTHORIZED_ADMINS = [
  'admin@primaria.ro',
  'primar@filipesti.ro',
  // Adaugă aici email-urile administratorilor autorizați
];

interface AdminAuthContextType {
  user: User | null;
  userRole: UserRole | null; // 'admin' or 'employee'
  isAdmin: boolean;
  isEmployee: boolean;
  userId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  userRole: null,
  isAdmin: false,
  isEmployee: false,
  userId: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
});

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Get user role from users collection in Firestore
  const getUserRole = async (user: User): Promise<UserRole | null> => {
    try {
      // Check in users collection for role
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.active && userData.role) {
          return userData.role as UserRole;
        }
      }

      // Fallback: Check if in hardcoded admin list
      if (AUTHORIZED_ADMINS.includes(user.email || '')) {
        return 'admin';
      }

      // Fallback: Check in admins collection
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists() && adminDoc.data()?.isActive) {
        return 'admin';
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }

    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user role from Firestore
        const role = await getUserRole(user);
        if (role) {
          setUser(user);
          setUserRole(role);
          setIsAdmin(role === 'admin');
          setIsEmployee(role === 'employee');
        } else {
          // No role found, user not authorized
          await signOut(auth);
          setUser(null);
          setUserRole(null);
          setIsAdmin(false);
          setIsEmployee(false);
          if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
            router.push('/admin/login');
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
        setIsEmployee(false);
        // Redirect to login if trying to access admin pages
        if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(userCredential.user);

      if (!role) {
        await signOut(auth);
        throw new Error('Nu aveți permisiunea de a accesa panoul de administrare');
      }

      // Both admins and employees can log in
      router.push('/admin');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Utilizatorul nu există');
      } else if (error.code === 'auth/wrong-password') {
        setError('Parolă incorectă');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email invalid');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Prea multe încercări. Încercați mai târziu');
      } else {
        setError(error.message || 'Eroare la autentificare');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        userRole,
        isAdmin,
        isEmployee,
        userId: user?.uid || null,
        loading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}