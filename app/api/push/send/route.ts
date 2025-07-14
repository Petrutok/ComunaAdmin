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

    const { title, body, url, tag } = await request.json();
    
    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Get all active subscriptions from Firestore
    const q = query(
      collection(db, 'push_subscriptions'),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
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
      // Adaugă pentru iOS:
      data: {
        url: url || '/'
      }
    });
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    
    // Send to all subscriptions
    const sendPromises = snapshot.docs.map(async (docSnapshot) => {
      const subscriptionData = docSnapshot.data();
      
      try {
        // IMPORTANT: Folosim subscription salvat sau construim din date
        let pushSubscription;
        
        if (subscriptionData.subscription) {
          // Folosim subscription-ul complet salvat
          pushSubscription = subscriptionData.subscription;
        } else if (subscriptionData.keys) {
          // Construim din date separate
          pushSubscription = {
            endpoint: subscriptionData.endpoint,
            keys: subscriptionData.keys
          };
        } else {
          throw new Error('No valid subscription data found');
        }
        
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        
        // Update last used timestamp
        await updateDoc(doc(db, 'push_subscriptions', docSnapshot.id), {
          lastUsedAt: new Date(),
          failureCount: 0
        });
      } catch (error: any) {
        failureCount++;
        console.error('Send error for doc:', docSnapshot.id, error);
        errors.push(`${docSnapshot.id}: ${error.message}`);
        
        // Handle expired subscriptions
        if (error.statusCode === 410) {
          await updateDoc(doc(db, 'push_subscriptions', docSnapshot.id), {
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
      body,
      url,
      sentAt: new Date(),
      totalSent: successCount,
      totalFailed: failureCount,
      sentBy: 'admin',
      errors: errors.length > 0 ? errors : null
    });
    
    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: snapshot.size,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}
