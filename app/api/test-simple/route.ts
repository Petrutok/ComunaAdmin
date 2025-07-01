// app/api/test-simple/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const results: any = {
    step: 'Starting',
  };

  try {
    // Cleanup
    if (admin.apps.length > 0) {
      results.existingApps = admin.apps.length;
      await Promise.all(admin.apps.filter(app => app).map(app => app!.delete()));
    }

    // Check env
    results.hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('No service account JSON');
    }

    // Parse
    results.step = 'Parsing JSON';
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(serviceAccountString);
    
    results.projectId = serviceAccount.project_id;
    results.clientEmail = serviceAccount.client_email;

    // Initialize with minimal config
    results.step = 'Initializing Admin';
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    results.adminInitialized = true;

    // Test auth token generation
    results.step = 'Testing credential';
    const app = admin.app();
    const token = await app.options.credential?.getAccessToken();
    results.hasAccessToken = !!token;
    results.tokenExpiry = token?.expires_in;

    // Simple Firestore test
    results.step = 'Testing Firestore';
    const db = admin.firestore();
    
    // Just try to get collection reference
    const collectionRef = db.collection('test');
    results.collectionRefCreated = true;

    // Try to read (this is where it usually fails)
    const snapshot = await collectionRef.limit(1).get();
    results.firestoreReadSuccess = true;
    results.docsFound = snapshot.size;

    results.success = true;

  } catch (error: any) {
    results.error = true;
    results.errorMessage = error.message;
    results.errorCode = error.code;
    
    // Check if it's a specific Firebase error
    if (error.message?.includes('UNAUTHENTICATED')) {
      results.authProblem = true;
      results.suggestion = 'Service account lacks permissions or Firestore API is not enabled';
    }
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}