import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'village-hub-h1qiy',
  });
}

export async function POST(request: Request) {
  try {
    const { tokenId } = await request.json();
    
    if (!tokenId) {
      return NextResponse.json({ error: 'tokenId required' }, { status: 400 });
    }
    
    const db = admin.firestore();
    
    // Get specific token
    const tokenDoc = await db.collection('fcm_tokens').doc(tokenId).get();
    
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    const tokenData = tokenDoc.data();
    const token = tokenData?.token;
    
    if (!token) {
      return NextResponse.json({ error: 'Token value missing' }, { status: 400 });
    }
    
    // Send to single token
    const message = {
      notification: {
        title: `Test for ${tokenData.platform}`,
        body: `Testing token: ${tokenId}`,
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        },
      },
      token: token,
    };
    
    try {
      const response = await admin.messaging().send(message);
      
      return NextResponse.json({
        success: true,
        messageId: response,
        tokenId: tokenId,
        platform: tokenData.platform,
      });
      
    } catch (fcmError: any) {
      return NextResponse.json({
        success: false,
        error: fcmError.message,
        code: fcmError.code,
        tokenId: tokenId,
        platform: tokenData.platform,
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
