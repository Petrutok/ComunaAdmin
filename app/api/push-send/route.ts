// app/api/push-send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

// Configure web-push
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@primaria.ro';
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(vapidEmail, publicKey, privateKey);
}

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
    
    let targetSubscriptions = subscriptionsList || [];
    
    // If no specific subscriptions provided, get all active ones from Firestore
    if (!subscriptionsList || subscriptionsList.length === 0) {
      const q = query(
        collection(db, 'push_subscriptions'),
        where('active', '==', true)
      );
      
      const snapshot = await getDocs(q);
      targetSubscriptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
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
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: url || '/',
      timestamp: new Date().toISOString()
    });
    
    let successCount = 0;
    let failureCount = 0;
    
    // Send to all subscriptions
    const sendPromises = targetSubscriptions.map(async (subscription: any) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        };
        
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        
        // Update last used timestamp
        if (subscription.id) {
          await updateDoc(doc(db, 'push_subscriptions', subscription.id), {
            lastUsedAt: new Date(),
            failureCount: 0
          });
        }
      } catch (error: any) {
        failureCount++;
        console.error('Send error:', error);
        
        // Handle expired subscriptions
        if (error.statusCode === 410 && subscription.id) {
          await updateDoc(doc(db, 'push_subscriptions', subscription.id), {
            active: false,
            updatedAt: new Date()
          });
        }
      }
    });
    
    await Promise.all(sendPromises);
    
    // Save notification log
    await addDoc(collection(db, 'notification_logs'), {
      title,
      message,
      url,
      sentAt: new Date(),
      totalSent: successCount,
      totalFailed: failureCount,
      sentBy: 'admin'
    });
    
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