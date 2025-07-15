import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let adminDb: Firestore | null = null;

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

// Don't export adminDb directly to avoid initialization during build
export { adminDb };