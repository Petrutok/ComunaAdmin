import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { verifyStaffRequest } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { ensureVapidConfigured } from '@/lib/push';

// Sent concurrently in chunks: sequential sending at hundreds of
// subscribers risks the serverless function timeout
const CONCURRENCY = 50;

interface IncomingSubscription {
  id?: string; // push_subscriptions doc id, used to clean up expired subs
  endpoint?: string;
  keys?: { p256dh: string; auth: string };
}

export async function POST(request: NextRequest) {
  if (!ensureVapidConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Push notifications not configured (missing VAPID keys)', sent: 0, failed: 0 },
      { status: 503 }
    );
  }

  // Only admins may broadcast push notifications
  const auth = await verifyStaffRequest(request, ['admin']);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', sent: 0, failed: 0 },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { subscriptionsList, title, message, url, icon, badge } = body as {
      subscriptionsList?: IncomingSubscription[];
      title?: string;
      message?: string;
      url?: string;
      icon?: string;
      badge?: string;
    };

    if (!subscriptionsList || subscriptionsList.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions provided', sent: 0, failed: 0 },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url,
      icon,
      badge,
      tag: 'notification',
      requireInteraction: false,
      data: {
        url: url || '/',
        timestamp: new Date().toISOString(),
      },
    });

    const db = getAdminDb();
    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    const sendOne = async (subscription: IncomingSubscription) => {
      if (!subscription.endpoint || !subscription.keys) {
        failed++;
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload
        );
        sent++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Expired/gone subscription: remember it for cleanup
        if (errorMsg.includes('410') || errorMsg.includes('404') || errorMsg.includes('expired')) {
          if (subscription.id) expiredIds.push(subscription.id);
        } else {
          console.error('[API] Error sending notification:', errorMsg);
        }
      }
    };

    for (let i = 0; i < subscriptionsList.length; i += CONCURRENCY) {
      await Promise.allSettled(subscriptionsList.slice(i, i + CONCURRENCY).map(sendOne));
    }

    // Best-effort cleanup so the broadcast list stops accumulating dead subs
    let cleaned = 0;
    if (db && expiredIds.length > 0) {
      const results = await Promise.allSettled(
        expiredIds.map((id) => db.collection('push_subscriptions').doc(id).delete())
      );
      cleaned = results.filter((r) => r.status === 'fulfilled').length;
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      cleaned,
      total: subscriptionsList.length,
      message: `Sent ${sent} notifications, ${failed} failed${cleaned ? `, ${cleaned} expired removed` : ''}`,
    });
  } catch (error) {
    console.error('[API] Push send error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        sent: 0,
        failed: 0,
      },
      { status: 500 }
    );
  }
}
