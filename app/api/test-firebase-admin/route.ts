// app/api/test-firebase-admin/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const results: any = {
    step: 'Starting test',
    hasServiceAccountJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    jsonLength: process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.length || 0,
  };

  try {
    // Step 1: Parse JSON
    results.step = 'Parsing JSON';
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found');
    }
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    results.parsedJson = {
      hasType: !!serviceAccount.type,
      hasProjectId: !!serviceAccount.project_id,
      hasPrivateKey: !!serviceAccount.private_key,
      hasClientEmail: !!serviceAccount.client_email,
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
    };

    // Step 2: Initialize Admin
    results.step = 'Initializing Firebase Admin';
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      results.adminInitialized = true;
      results.adminAppName = admin.app().name;
    } else {
      results.adminAlreadyInitialized = true;
      results.adminAppName = admin.app().name;
    }

    // Step 3: Test Firestore connection
    results.step = 'Testing Firestore';
    const db = admin.firestore();
    const testCollection = await db.collection('fcm_tokens').limit(1).get();
    results.firestoreWorks = true;
    results.firestoreDocsFound = testCollection.size;

    // Step 4: Test FCM
    results.step = 'Testing FCM';
    const messaging = admin.messaging();
    results.fcmAvailable = !!messaging;

    results.success = true;
    results.step = 'All tests passed';

  } catch (error) {
    results.error = true;
    results.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.errorStack = error instanceof Error ? error.stack : undefined;
  }

  return NextResponse.json(results);
}