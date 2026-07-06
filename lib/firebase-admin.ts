import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

let app: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let adminStorage: Storage | null = null;

function initializeFirebaseAdmin() {
  // Skip initialization during build
  if (process.env.NODE_ENV === 'production' && !process.env.FIREBASE_PROJECT_ID) {
    console.log('Skipping Firebase Admin initialization - no env vars');
    return null;
  }

  if (app) {
    return adminDb;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.log('Firebase Admin: Missing required environment variables');
    return null;
  }

  try {
    if (!getApps().length) {
      app = initializeApp({
        credential: cert({
          projectId: projectId.trim(),
          clientEmail: clientEmail.trim(),
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      app = getApps()[0];
    }
    
    adminDb = getFirestore(app);
    adminAuth = getAuth(app);
    adminStorage = getStorage(app);
    return adminDb;
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
    return null;
  }
}

// Export function to get admin DB on demand
export function getAdminDb(): Firestore | null {
  if (!adminDb) {
    return initializeFirebaseAdmin();
  }
  return adminDb;
}

// Export function to get admin Auth on demand
export function getAdminAuth(): Auth | null {
  if (!adminAuth) {
    initializeFirebaseAdmin();
  }
  return adminAuth;
}

// Export function to get admin Storage on demand.
// Bucket name comes from the public client config (same project).
export function getAdminBucket() {
  if (!adminStorage) {
    initializeFirebaseAdmin();
  }
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!adminStorage || !bucketName) {
    return null;
  }
  return adminStorage.bucket(bucketName);
}

// Don't export adminDb directly to avoid initialization during build
export { adminDb };