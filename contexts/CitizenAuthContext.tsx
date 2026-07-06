// contexts/CitizenAuthContext.tsx
// Authentication for citizens (separate from AdminAuthContext, which gates
// staff via the `users` collection). Citizen profiles live in `citizens/{uid}`.
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface CitizenProfile {
  numeComplet: string;
  email: string;
  telefon?: string;
  localitate?: string;
  createdAt: Timestamp;
}

interface CitizenAuthContextType {
  user: User | null;
  profile: CitizenProfile | null;
  loading: boolean;
  register: (email: string, password: string, numeComplet: string, telefon?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const CitizenAuthContext = createContext<CitizenAuthContextType>({
  user: null,
  profile: null,
  loading: true,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
});

export const useCitizenAuth = () => useContext(CitizenAuthContext);

export function CitizenAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'citizens', firebaseUser.uid));
          setProfile(profileDoc.exists() ? (profileDoc.data() as CitizenProfile) : null);
        } catch (error) {
          console.error('[CitizenAuth] Failed to load profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (
    email: string,
    password: string,
    numeComplet: string,
    telefon?: string
  ) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: numeComplet });

    const newProfile: CitizenProfile = {
      numeComplet,
      email,
      ...(telefon ? { telefon } : {}),
      createdAt: Timestamp.now(),
    };
    await setDoc(doc(db, 'citizens', credential.user.uid), newProfile);
    setProfile(newProfile);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <CitizenAuthContext.Provider value={{ user, profile, loading, register, login, logout, resetPassword }}>
      {children}
    </CitizenAuthContext.Provider>
  );
}
