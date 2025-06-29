// lib/firebase.ts - Real Firebase version
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection as firestoreCollection,
  query as firestoreQuery,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  getDocs as firestoreGetDocs,
  addDoc as firestoreAddDoc,
  doc as firestoreDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  limit as firestoreLimit
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export Firestore functions
export const collection = firestoreCollection;
export const query = firestoreQuery;
export const where = firestoreWhere;
export const orderBy = firestoreOrderBy;
export const getDocs = firestoreGetDocs;
export const addDoc = firestoreAddDoc;
export const doc = firestoreDoc;
export const updateDoc = firestoreUpdateDoc;
export const deleteDoc = firestoreDeleteDoc;
export const limit = firestoreLimit;

// Collections
export const COLLECTIONS = {
  ANNOUNCEMENTS: 'announcements',
  JOBS: 'jobs',
  NOTIFICATIONS: 'notifications',
  ADMINS: 'admins',
} as const;

// Types
export interface Announcement {
  id?: string;
  title: string;
  description: string;
  category: 'vanzare' | 'cumparare' | 'schimb' | 'diverse';
  price?: number;
  images?: string[];
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  userId?: string;
  rejectionReason?: string;
}

export interface Job {
  id?: string;
  title: string;
  company: string;
  description: string;
  requirements?: string[];
  benefits?: string[];
  salary?: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  contact: {
    email: string;
    phone?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  validUntil?: any; // Firestore Timestamp
  rejectionReason?: string;
}

export interface NotificationLog {
  id?: string;
  title: string;
  message: string;
  url?: string;
  sentAt: any; // Firestore Timestamp
  sentBy: string;
  recipients: number;
  type: 'announcement' | 'job' | 'general' | 'emergency';
}
