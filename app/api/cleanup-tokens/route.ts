// app/api/cleanup-tokens/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

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
    const snapshot = await db.collection('fcm_tokens').get();
    
    const tokenMap = new Map<string, any[]>();
    
    // Group by token value
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        if (!tokenMap.has(data.token)) {
          tokenMap.set(data.token, []);
        }
        tokenMap.get(data.token)!.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
      }
    });
    
    const duplicates: any[] = [];
    let deactivatedCount = 0;
    
    // Find and deactivate duplicates
    for (const [token, docs] of tokenMap) {
      if (docs.length > 1) {
        // Sort by creation date, keep the newest
        docs.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        duplicates.push({
          token: token.substring(0, 20) + '...',
          count: docs.length,
          kept: docs[0].id,
          deactivated: docs.slice(1).map(d => d.id),
        });
        
        // Deactivate older duplicates
        for (let i = 1; i < docs.length; i++) {
          await db.collection('fcm_tokens').doc(docs[i].id).update({
            active: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            reason: 'duplicate',
          });
          deactivatedCount++;
        }
      }
    }
    
    return NextResponse.json({
      totalTokens: snapshot.size,
      uniqueTokens: tokenMap.size,
      duplicatesFound: duplicates.length,
      deactivatedCount,
      duplicates,
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to cleanup tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}