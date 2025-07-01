// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found');
    }

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

    console.log('Notification request:', { title, message, url });

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    
    // Get active FCM tokens with better error handling
    let tokensSnapshot;
    try {
      tokensSnapshot = await db
        .collection('fcm_tokens')
        .where('active', '==', true)
        .get();
      
      console.log(`Found ${tokensSnapshot.size} active tokens`);
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      return NextResponse.json({
        error: 'Database error',
        details: firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error',
      }, { status: 500 });
    }

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
    const tokenDocs: any[] = [];
    
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
        tokenDocs.push({ id: doc.id, ...data });
      }
    });

    console.log(`Processing ${tokens.length} tokens`);

    // Send FCM notification with detailed error handling
    let response;
    try {
      response = await admin.messaging().sendEachForMulticast({
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
    } catch (fcmError) {
      console.error('FCM send error:', fcmError);
      return NextResponse.json({
        error: 'Failed to send FCM notification',
        details: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error',
      }, { status: 500 });
    }
    
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: any[] = [];
    
    response.responses.forEach((resp, index) => {
      if (resp.success) {
        successCount++;
      } else {
        failureCount++;
        console.error(`Failed to send to token ${index}:`, resp.error);
        failureDetails.push({
          tokenId: tokenDocs[index]?.id,
          error: resp.error?.message,
          code: resp.error?.code,
        });
      }
    });

    // Log notification
    try {
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
        failureDetails: failureCount > 0 ? failureDetails : null,
      });
    } catch (logError) {
      console.error('Failed to log notification:', logError);
      // Don't fail the request just because logging failed
    }

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      totalTokens: tokens.length,
      ...(failureCount > 0 && { failureDetails }),
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}