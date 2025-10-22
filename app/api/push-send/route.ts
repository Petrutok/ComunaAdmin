import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure web-push with VAPID credentials
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@primaria.ro',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionsList, title, message, url, icon, badge } = body;

    if (!subscriptionsList || subscriptionsList.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions provided', sent: 0, failed: 0 },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;

    // Send notification to each subscription
    for (const subscription of subscriptionsList) {
      try {
        // Validate subscription has required fields
        if (!subscription.endpoint || !subscription.keys) {
          console.error('[API] Invalid subscription structure:', subscription);
          failed++;
          continue;
        }

        // Create the notification payload
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
            timestamp: new Date().toISOString()
          }
        });

        // Send via web-push
        await webpush.sendNotification(subscription, payload);
        sent++;
        console.log('[API] Notification sent to:', subscription.endpoint?.substring(0, 50) + '...');
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Check if subscription is invalid (410 Gone) or other error
        if (errorMsg.includes('410') || errorMsg.includes('expired')) {
          console.warn('[API] Subscription expired, marking for deletion');
          // Could optionally delete from Firestore here
        } else {
          console.error('[API] Error sending notification:', errorMsg);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptionsList.length,
      message: `Sent ${sent} notifications, ${failed} failed`
    });
  } catch (error) {
    console.error('[API] Push send error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        sent: 0,
        failed: 0
      },
      { status: 500 }
    );
  }
}
