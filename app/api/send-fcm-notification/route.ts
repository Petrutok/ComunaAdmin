// app/api/send-fcm-notification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Pentru server-side, trebuie să folosim Admin SDK
// Instalează: npm install firebase-admin

export async function POST(request: NextRequest) {
  try {
    const { title, message, url } = await request.json();

    // Pentru development, returnăm succes
    // În producție, aici vei folosi Firebase Admin SDK pentru a trimite notificări
    
    // Simulare trimitere (în producție vei folosi Admin SDK)
    console.log('Sending notification:', { title, message, url });
    
    // Obține token-urile din Firestore
    const tokensSnapshot = await getDocs(collection(db, 'fcm_tokens'));
    const tokens: string[] = [];
    
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });
    
    console.log(`Found ${tokens.length} tokens to send notifications to`);
    
    // În producție, aici vei trimite notificările folosind Admin SDK
    // const admin = require('firebase-admin');
    // const message = {
    //   notification: { title, body: message },
    //   data: { url },
    //   tokens: tokens
    // };
    // const response = await admin.messaging().sendMulticast(message);
    
    return NextResponse.json({
      success: true,
      message: `Notification would be sent to ${tokens.length} devices`,
      tokens: tokens.length
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}