// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found in environment variables');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if admin is initialized
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.' },
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

    // Get Firestore
    const db = admin.firestore();

    // Get active tokens
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

    // Send notification
    const messagePayload = {
      notification: {
        title,
        body: message,
      },
      webpush: {
        fcmOptions: {
          link: url || 'https://v2-zeta-lemon.vercel.app',
        },
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    
    // Count results
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
    console.error('Error sending notification:', error);
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
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}