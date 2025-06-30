// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const adminDb = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, url } = body;

    // Validare
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Obține toate token-urile active din Firestore
    const tokensSnapshot = await adminDb
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      return NextResponse.json({
        success: true,
        recipients: 0,
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

    // Construiește mesajul FCM
    const fcmMessage = {
      notification: {
        title,
        body: message,
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
        },
        fcmOptions: {
          link: url || 'https://v2-zeta-lemon.vercel.app',
        },
      },
      tokens,
    };

    // Trimite notificarea
    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    // Procesează rezultatele
    let successCount = 0;
    let failureCount = 0;
    const tokensToDeactivate: string[] = [];

    response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
      if (resp.success) {
        successCount++;
      } else {
        failureCount++;
        // Dacă token-ul este invalid, îl marcăm pentru dezactivare
        if (
          resp.error?.code === 'messaging/invalid-registration-token' ||
          resp.error?.code === 'messaging/registration-token-not-registered'
        ) {
          tokensToDeactivate.push(tokenDocs[idx].id);
        }
      }
    });

    // Dezactivează token-urile invalide
    const batch = adminDb.batch();
    tokensToDeactivate.forEach((tokenId) => {
      const tokenRef = adminDb.collection('fcm_tokens').doc(tokenId);
      batch.update(tokenRef, { active: false, deactivatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    
    if (tokensToDeactivate.length > 0) {
      await batch.commit();
    }

    // Salvează în log
    await adminDb.collection('notifications').add({
      title,
      message,
      url,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: 'admin',
      recipients: successCount,
      type: 'manual',
      status: 'sent',
      successCount,
      failureCount,
      totalTokens: tokens.length,
    });

    return NextResponse.json({
      success: true,
      recipients: successCount,
      successCount,
      failureCount,
      totalTokens: tokens.length,
    });

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', allowed: ['POST'] },
    { status: 405 }
  );
}