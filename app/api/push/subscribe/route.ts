// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

export const dynamic   = 'force-dynamic';
export const runtime   = 'nodejs';

/* ---------- POST /api/push/subscribe ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    /* 1. Validate payload */
    if (!body?.subscription?.endpoint || !body.subscription.keys) {
      return NextResponse.json(
        { error: 'Missing subscription.endpoint or subscription.keys' },
        { status: 400 }
      );
    }

    const { subscription, deviceInfo = {} } = body;

    /* 2. Create unique ID from endpoint */
    const endpointHash = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .slice(0, 16);

    /* 3. Build Firestore document */
    const docData = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      active: true,
      platform: deviceInfo.platform ?? 'web',
      userAgent: deviceInfo.userAgent ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
      failureCount: 0,
    };

    /* 4. Upsert */
    await setDoc(doc(db, 'push_subscriptions', endpointHash), docData, { merge: true });

    return NextResponse.json({ success: true, id: endpointHash });
  } catch (err: any) {
    console.error('[Subscribe] Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ---------- DELETE /api/push/subscribe ---------- */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const endpointHash = crypto
      .createHash('sha256')
      .update(endpoint)
      .digest('hex')
      .slice(0, 16);

    await setDoc(
      doc(db, 'push_subscriptions', endpointHash),
      { active: false, updatedAt: new Date() },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Unsubscribe] Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}