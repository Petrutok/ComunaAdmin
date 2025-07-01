// app/api/push-send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { title, message, url } = await request.json();
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }
    
    // Get active subscriptions
    const q = query(
      collection(db, 'push_subscriptions'),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
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
    const failedSubscriptions: string[] = [];
    
    // Send to all subscriptions
    const sendPromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const subscription = data.subscription;
      
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
      } catch (error: any) {
        failureCount++;
        console.error('Send error:', error);
        
        // Mark invalid subscriptions
        if (error.statusCode === 410) {
          failedSubscriptions.push(docSnap.id);
        }
      }
    });
    
    await Promise.all(sendPromises);
    
    // Deactivate failed subscriptions
    for (const subId of failedSubscriptions) {
      await updateDoc(doc(db, 'push_subscriptions', subId), {
        active: false,
        deactivatedAt: new Date(),
        reason: 'invalid_subscription'
      });
    }
    
    // Log notification
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      url,
      sentAt: new Date(),
      sentBy: 'admin',
      type: 'push',
      status: 'sent',
      successCount,
      failureCount,
      totalSubscriptions: snapshot.size
    });
    
    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: snapshot.size
    });
    
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}