// app/api/test-fcm-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'Configuration Check',
    environment: process.env.NODE_ENV,
    firebase_config: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasServiceAccountJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      
      projectId: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
      clientEmailDomain: process.env.FIREBASE_CLIENT_EMAIL?.split('@')[1] || 'NOT_SET',
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) + '...' || 'NOT_SET',
    },
    public_config: {
      hasVapidKey: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      vapidKeyLength: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.length || 0,
    },
    recommendation: !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY
      ? 'Missing Firebase Admin credentials in Vercel environment variables.'
      : 'All required variables seem to be present.'
  });
}