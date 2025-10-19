// lib/firebase.ts - Updated with FCM
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
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

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

// Initialize messaging only in browser
let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { messaging };

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
  FCM_TOKENS: 'fcm_tokens',
  REGISTRATURA_EMAILS: 'registratura_emails',
} as const;

// UPDATED Types for Announcements - FĂRĂ 'schimb' și FĂRĂ 'views'
export interface Announcement {
  id?: string;
  title: string;
  description: string;
  category: 'terenuri' | 'produse-locale' | 'diverse' | 'servicii' | 'cumparare';
  subcategory?: string; // Pentru subcategorii specifice
  price?: number;
  priceType?: 'fix' | 'negociabil' | 'gratuit'; // Tip preț
  unit?: string; // kg, mp, bucată, etc.
  images?: string[];
  location?: string; // Locația specifică în comună
  contact: {
    name: string;
    phone: string;
    email?: string;
    preferredContact?: 'phone' | 'email' | 'whatsapp';
  };
  status: 'pending' | 'approved' | 'rejected';
  featured?: boolean; // Pentru anunțuri promovate
  // REMOVED: views?: number; // Număr vizualizări
  createdAt: any;
  updatedAt: any;
  expiresAt?: any; // Data expirare anunț
  userId?: string;
  rejectionReason?: string;
  
  // Câmpuri specifice pentru terenuri
  surfaceArea?: number; // Suprafață în mp
  landType?: 'intravilan' | 'extravilan' | 'agricol';
  
  // Câmpuri specifice pentru produse locale
  isOrganic?: boolean;
  availableFrom?: string; // Perioadă disponibilitate
  
  // Câmpuri specifice pentru servicii
  serviceType?: string;
  availability?: string; // Program disponibilitate
}

// NEW: Categorii pentru anunțuri - FĂRĂ categoria 'schimb'
export const ANNOUNCEMENT_CATEGORIES = {
  terenuri: {
    label: 'Vânzări Terenuri',
    icon: '🏞️',
    color: 'emerald',
    subcategories: ['Intravilan', 'Extravilan', 'Agricol', 'Pădure']
  },
  'produse-locale': {
    label: 'Produse Locale',
    icon: '🥬',
    color: 'green',
    subcategories: ['Legume', 'Fructe', 'Lactate', 'Carne', 'Miere', 'Tradiționale']
  },
  diverse: {
    label: 'Vânzări Diverse',
    icon: '📦',
    color: 'blue',
    subcategories: ['Electrocasnice', 'Mobilier', 'Unelte', 'Îmbrăcăminte', 'Altele']
  },
  servicii: {
    label: 'Servicii',
    icon: '🔧',
    color: 'indigo',
    subcategories: ['Construcții', 'Reparații', 'Transport', 'Grădinărit', 'Curățenie', 'Altele']
  },
  cumparare: {
    label: 'Cumpărări',
    icon: '🛒',
    color: 'orange',
    subcategories: []
  }
} as const;

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
    phone: string;      // Acum phone este obligatoriu
    email?: string;     // Acum email este opțional
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
  validUntil?: any;
  rejectionReason?: string;
}

export interface NotificationLog {
  id?: string;
  title: string;
  message: string;
  url?: string;
  sentAt: any;
  sentBy: string;
  recipients: number;
  type: 'announcement' | 'job' | 'general' | 'emergency' | 'manual';
  status?: 'sent' | 'failed' | 'pending';
  error?: string;
}

export interface FCMToken {
  id?: string;
  token: string;
  createdAt: any;
  lastUsed?: any;
  platform: 'web' | 'ios' | 'android';
  userAgent?: string;
  active: boolean;
}