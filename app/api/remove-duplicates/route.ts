// app/api/remove-duplicates/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'village-hub-h1qiy',
  });
}

export async function POST() {
  try {
    const db = admin.firestore();
    
    // Get all active tokens
    const snapshot = await db
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();
    
    // Group by platform
    const iosDocs: any[] = [];
    const webDocs: any[] = [];
    
    snapshot.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() } as any;
      if (data.platform === 'ios') {
        iosDocs.push(data);
      } else {
        webDocs.push(data);
      }
    });
    
    // Sort by creation date (newest first)
    const sortByDate = (a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    };
    
    iosDocs.sort(sortByDate);
    webDocs.sort(sortByDate);
    
    const deactivated: string[] = [];
    
    // Keep only the newest iOS token
    if (iosDocs.length > 1) {
      for (let i = 1; i < iosDocs.length; i++) {
        await db.collection('fcm_tokens').doc(iosDocs[i].id).update({
          active: false,
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: 'duplicate_platform',
        });
        deactivated.push(iosDocs[i].id);
      }
    }
    
    // Keep only the newest web token
    if (webDocs.length > 1) {
      for (let i = 1; i < webDocs.length; i++) {
        await db.collection('fcm_tokens').doc(webDocs[i].id).update({
          active: false,
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: 'duplicate_platform',
        });
        deactivated.push(webDocs[i].id);
      }
    }
    
    return NextResponse.json({
      success: true,
      iosTokens: iosDocs.length,
      webTokens: webDocs.length,
      keptTokens: {
        ios: iosDocs[0]?.id || null,
        web: webDocs[0]?.id || null,
      },
      deactivatedCount: deactivated.length,
      deactivatedIds: deactivated,
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to remove duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}