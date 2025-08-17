// contexts/AdminAuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

// LISTA DE ADMINISTRATORI AUTORIZAȚI
// Poți adăuga/elimina email-uri aici sau le poți muta în Firestore
const AUTHORIZED_ADMINS = [
  'admin@primaria.ro',
  'primar@filipesti.ro',
  // Adaugă aici email-urile administratorilor autorizați
];

interface AdminAuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isAdmin: false,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Verifică dacă utilizatorul este admin
  const checkAdminStatus = async (user: User) => {
    // Metoda 1: Verifică în lista hardcoded
    if (AUTHORIZED_ADMINS.includes(user.email || '')) {
      return true;
    }

    // Metoda 2: Verifică în Firestore (opțional)
    try {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists() && adminDoc.data()?.isActive) {
        return true;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }

    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verifică dacă este admin
        const adminStatus = await checkAdminStatus(user);
        if (adminStatus) {
          setUser(user);
          setIsAdmin(true);
        } else {
          // Nu este admin, deloghează
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          if (pathname?.startsWith('/admin') && pathname !== '/admin/login') {
            router.push('/admin/login');
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        // Redirecționează la login dacă încearcă să acceseze admin
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
      // Verifică mai întâi dacă email-ul este în lista de admini
      if (!AUTHORIZED_ADMINS.includes(email)) {
        throw new Error('Nu aveți permisiunea de a accesa panoul de administrare');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminStatus = await checkAdminStatus(userCredential.user);
      
      if (!adminStatus) {
        await signOut(auth);
        throw new Error('Nu aveți permisiunea de a accesa panoul de administrare');
      }

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
        isAdmin,
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