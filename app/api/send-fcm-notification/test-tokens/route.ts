// app/api/test-tokens/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Use existing admin instance
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'village-hub-h1qiy',
  });
}

export async function GET() {
  try {
    const db = admin.firestore();
    
    // Get all tokens
    const allTokensSnapshot = await db.collection('fcm_tokens').get();
    
    // Get active tokens
    const activeTokensSnapshot = await db
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();
    
    const tokens: any[] = [];
    activeTokensSnapshot.forEach((doc) => {
      tokens.push({
        id: doc.id,
        ...doc.data(),
        token: doc.data().token ? 'EXISTS' : 'MISSING', // Don't expose actual token
      });
    });
    
    return NextResponse.json({
      totalTokens: allTokensSnapshot.size,
      activeTokens: activeTokensSnapshot.size,
      tokens: tokens.slice(0, 5), // Show first 5 for debugging
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}