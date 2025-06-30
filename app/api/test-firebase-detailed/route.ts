// app/api/test-firebase-detailed/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    existingApps: admin.apps.length,
  };

  try {
    // Force cleanup
    if (admin.apps.length > 0) {
      results.cleaningUp = true;
      await Promise.all(admin.apps.filter(app => app !== null).map(app => app!.delete()));
      results.appsAfterCleanup = admin.apps.length;
    }

    // Parse and check service account
    const serviceAccountRaw = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    
    // Check private key format
    results.privateKeyCheck = {
      hasPrivateKey: !!serviceAccountRaw.private_key,
      startsWithBegin: serviceAccountRaw.private_key?.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithEnd: serviceAccountRaw.private_key?.endsWith('-----END PRIVATE KEY-----\n'),
      hasEscapedNewlines: serviceAccountRaw.private_key?.includes('\\n'),
      length: serviceAccountRaw.private_key?.length,
    };

    // Fix newlines
    const serviceAccount = {
      ...serviceAccountRaw,
      private_key: serviceAccountRaw.private_key.replace(/\\n/g, '\n'),
    };

    // Verify fixed format
    results.fixedPrivateKeyCheck = {
      hasNewlines: serviceAccount.private_key?.includes('\n'),
      lineCount: serviceAccount.private_key?.split('\n').length,
    };

    // Initialize
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.project_id,
    });

    results.initialized = true;
    results.projectId = admin.app().options.projectId;

    // Test Firestore
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    // Try a simple operation
    const testDoc = await db.collection('_test_').doc('test').set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    results.firestoreWrite = true;

    // Clean up test doc
    await db.collection('_test_').doc('test').delete();
    
    results.success = true;

  } catch (error: any) {
    results.error = true;
    results.errorMessage = error.message;
    results.errorCode = error.code;
    results.errorDetails = error.details;
  }

  return NextResponse.json(results);
}