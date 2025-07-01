// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK doar o singură dată
if (!admin.apps.length) {
  try {
    // Verifică dacă variabila de mediu există
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not found in environment variables');
    }

    // Parse service account JSON din variabila de mediu
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifică dacă Firebase Admin este inițializat
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not initialized' },
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

    // Obține Firestore instance
    const db = admin.firestore();

    // Obține toate token-urile FCM active
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

    // Extrage token-urile
    const tokens: string[] = [];
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    console.log(`Found ${tokens.length} active tokens`);

    // Trimite notificarea folosind Firebase Admin SDK
    const messagePayload = {
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
          tag: 'notification-' + Date.now(),
        },
        fcmOptions: {
          link: url || 'https://v2-zeta-lemon.vercel.app',
        },
      },
      tokens, // Array de token-uri
    };

    // Trimite notificarea la toate token-urile
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    
    // Procesează rezultatele
    let successCount = 0;
    let failureCount = 0;
    const failedTokens: string[] = [];
    
    response.responses.forEach((resp, idx) => {
      if (resp.success) {
        successCount++;
      } else {
        failureCount++;
        failedTokens.push(tokens[idx]);
        console.error('Failed to send to token:', tokens[idx], resp.error);
        
        // Dacă token-ul este invalid, marchează-l ca inactiv
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          // Marchează token-ul ca inactiv
          db.collection('fcm_tokens')
            .where('token', '==', tokens[idx])
            .get()
            .then(snapshot => {
              snapshot.forEach(doc => {
                doc.ref.update({ active: false });
              });
            });
        }
      }
    });

    // Salvează notificarea în istoric
    await db.collection('notifications').add({
      title,
      message,
      url: url || null,
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
      failedTokens: failureCount > 0 ? failedTokens : undefined,
    });

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru test
export async function GET() {
  return NextResponse.json({ 
    status: 'FCM notification service is running',
    initialized: admin.apps.length > 0 
  });
}