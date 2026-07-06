import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { getOptionalCitizenUid } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Public endpoint: limit to 20 subscribe/unsubscribe actions per hour per IP
  const limit = rateLimit(`push-subscribe:${getClientIp(request)}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const { subscription, action, deviceInfo } = body;

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }
    const subscriptionsRef = db.collection('push_subscriptions');

    // If no action is specified, default to 'subscribe'
    const effectiveAction = action || 'subscribe';

    if (effectiveAction === 'subscribe') {
      if (!subscription?.endpoint || !subscription?.keys) {
        return NextResponse.json(
          { success: false, error: 'Invalid subscription' },
          { status: 400 }
        );
      }

      // Check if subscription already exists
      const existingDocs = await subscriptionsRef
        .where('endpoint', '==', subscription.endpoint)
        .get();

      // Logged-in citizens get the subscription linked to their account,
      // enabling targeted notifications (e.g. status changes)
      const citizenUid = await getOptionalCitizenUid(request);

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceInfo: deviceInfo || null,
        ...(citizenUid ? { citizenUid } : {}),
        createdAt: Timestamp.now(),
        lastActive: Timestamp.now(),
        active: true,
      };

      if (existingDocs.empty) {
        // Add new subscription
        await subscriptionsRef.add(subscriptionData);
      } else {
        // Update existing subscription
        await existingDocs.docs[0].ref.delete();
        await subscriptionsRef.add(subscriptionData);
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription saved successfully'
      });

    } else if (effectiveAction === 'unsubscribe') {
      // For unsubscribe, endpoint comes from body directly
      const endpoint = body.endpoint || subscription?.endpoint;
      if (!endpoint) {
        return NextResponse.json(
          { success: false, error: 'Missing endpoint' },
          { status: 400 }
        );
      }

      const existingDocs = await subscriptionsRef
        .where('endpoint', '==', endpoint)
        .get();

      if (!existingDocs.empty) {
        await existingDocs.docs[0].ref.delete();
      }

      return NextResponse.json({
        success: true,
        message: 'Unsubscribed successfully'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('[API] Push subscribe error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
