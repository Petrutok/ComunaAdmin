// app/api/push-send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure web-push
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@primaria.ro';
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(vapidEmail, publicKey, privateKey);
}

// Temporary storage for subscriptions (in production, use a database)
let subscriptions: any[] = [];

export async function POST(request: NextRequest) {
  try {
    // Check if VAPID is configured
    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured. Check VAPID keys.' },
        { status: 500 }
      );
    }

    const { title, message, url, subscriptionsList } = await request.json();
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }
    
    // Use provided subscriptions or stored ones
    const targetSubscriptions = subscriptionsList || subscriptions;
    
    if (targetSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No active subscriptions'
      });
    }
    
    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/'
    });
    
    let successCount = 0;
    let failureCount = 0;
    
    // Send to all subscriptions
    const sendPromises = targetSubscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
      } catch (error: any) {
        failureCount++;
        console.error('Send error:', error);
      }
    });
    
    await Promise.all(sendPromises);
    
    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: targetSubscriptions.length
    });
    
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}

// Store subscriptions temporarily
export async function PUT(request: NextRequest) {
  try {
    const { subscription } = await request.json();
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 400 });
    }
    
    // Add to memory storage
    const exists = subscriptions.find(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
    }
    
    return NextResponse.json({ 
      success: true, 
      totalSubscriptions: subscriptions.length 
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
  }
}