import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';

// Prevent pre-rendering during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const { title, body, url, tag } = await request.json();
    
    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    console.log('[Push Send] Getting active subscriptions...');
    
    // Dynamic import of firebase-admin only when needed
    let adminDb = null;
    try {
      const { getAdminDb } = await import('@/lib/firebase-admin');
      adminDb = getAdminDb();
    } catch (error) {
      console.log('[Push Send] Firebase Admin not available, using client SDK');
    }
    
    let subscriptions: any[] = [];
    
    if (adminDb) {
      // Use Firebase Admin
      console.log('[Push Send] Using Firebase Admin SDK');
      const snapshot = await adminDb
        .collection('push_subscriptions')
        .where('active', '==', true)
        .get();
      
      subscriptions = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      // Fallback to client SDK
      console.log('[Push Send] Using Firebase Client SDK');
      try {
        const q = query(
          collection(db, 'push_subscriptions'),
          where('active', '==', true)
        );
        const clientSnapshot = await getDocs(q);
        subscriptions = clientSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error: any) {
        console.error('[Push Send] Client SDK error:', error);
        return NextResponse.json(
          { error: 'Database access error. Please check Firebase configuration.' },
          { status: 500 }
        );
      }
    }
    
    console.log(`[Push Send] Found ${subscriptions.length} active subscriptions`);
    
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active subscriptions found'
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: url || '/',
      tag: tag || 'admin-notification',
      timestamp: new Date().toISOString(),
      data: {
        url: url || '/'
      }
    });
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    
    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscriptionData) => {
      try {
        // Check if we have valid subscription data
        if (!subscriptionData.subscription || !subscriptionData.subscription.endpoint) {
          throw new Error('Invalid subscription data');
        }
        
        console.log(`[Push Send] Sending to ${subscriptionData.platform} device...`);
        
        // Use the stored subscription object
        await webpush.sendNotification(subscriptionData.subscription, payload);
        successCount++;
        
        // Update last used timestamp
        if (adminDb) {
          await adminDb
            .collection('push_subscriptions')
            .doc(subscriptionData.id)
            .update({
              lastUsedAt: new Date(),
              failureCount: 0
            });
        } else {
          await updateDoc(doc(db, 'push_subscriptions', subscriptionData.id), {
            lastUsedAt: new Date(),
            failureCount: 0
          });
        }
        
        console.log(`[Push Send] Successfully sent to ${subscriptionData.id}`);
      } catch (error: any) {
        failureCount++;
        console.error('Send error for doc:', subscriptionData.id, error.message);
        errors.push(`${subscriptionData.id}: ${error.message}`);
        
        // Handle expired subscriptions
        if (error.statusCode === 410) {
          console.log(`[Push Send] Subscription expired, deactivating: ${subscriptionData.id}`);
          if (adminDb) {
            await adminDb
              .collection('push_subscriptions')
              .doc(subscriptionData.id)
              .update({
                active: false,
                updatedAt: new Date(),
                error: 'Subscription expired'
              });
          } else {
            await updateDoc(doc(db, 'push_subscriptions', subscriptionData.id), {
              active: false,
              updatedAt: new Date(),
              error: 'Subscription expired'
            });
          }
        } else {
          // Increment failure count
          if (adminDb) {
            await adminDb
              .collection('push_subscriptions')
              .doc(subscriptionData.id)
              .update({
                failureCount: (subscriptionData.failureCount || 0) + 1,
                lastError: error.message,
                lastErrorAt: new Date()
              });
          } else {
            await updateDoc(doc(db, 'push_subscriptions', subscriptionData.id), {
              failureCount: (subscriptionData.failureCount || 0) + 1,
              lastError: error.message,
              lastErrorAt: new Date()
            });
          }
        }
      }
    });
    
    await Promise.all(sendPromises);
    
    // Save notification log
    if (adminDb) {
      await adminDb.collection('notification_logs').add({
        title,
        body,
        url,
        sentAt: new Date(),
        totalSent: successCount,
        totalFailed: failureCount,
        sentBy: 'admin',
        errors: errors.length > 0 ? errors : null
      });
    } else {
      await addDoc(collection(db, 'notification_logs'), {
        title,
        body,
        url,
        sentAt: new Date(),
        totalSent: successCount,
        totalFailed: failureCount,
        sentBy: 'admin',
        errors: errors.length > 0 ? errors : null
      });
    }
    
    console.log(`[Push Send] Complete. Sent: ${successCount}, Failed: ${failureCount}`);
    
    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    console.error('[Push Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications: ' + error.message },
      { status: 500 }
    );
  }
}