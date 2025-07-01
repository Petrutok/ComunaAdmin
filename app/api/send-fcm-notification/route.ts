// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found');
    }

    // Parse the service account JSON directly
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'village-hub-h1qiy',
    });
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Check server logs.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    
    // Get active FCM tokens
    const tokensSnapshot = await db
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      return NextResponse.json({
        success: true,
        successCount: 0,
        failureCount: 0,
        totalTokens: 0,
        message: 'No active tokens found',
      });
    }

    const tokens: string[] = [];
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    // Send FCM notification
    const response = await admin.messaging().sendEachForMulticast({
      notification: {
        title,
        body: message,
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        },
        fcmOptions: {
          link: url || 'https://v2-zeta-lemon.vercel.app',
        },
      },
      tokens,
    });
    
    let successCount = 0;
    let failureCount = 0;
    
    response.responses.forEach((resp) => {
      if (resp.success) {
        successCount++;
      } else {
        failureCount++;
        console.error('Failed to send:', resp.error);
      }
    });

    // Log notification
    await db.collection('notifications').add({
      title,
      message,
      url,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: 'admin',
      type: 'manual',
      status: 'sent',
      successCount,
      failureCount,
      totalTokens: tokens.length,
    });

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      totalTokens: tokens.length,
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}