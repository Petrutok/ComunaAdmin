import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, action, deviceInfo } = body;

    // If no action is specified, default to 'subscribe'
    const effectiveAction = action || 'subscribe';

    if (effectiveAction === 'subscribe') {
      // Save subscription to Firestore
      const subscriptionsRef = collection(db, 'push_subscriptions');

      // Check if subscription already exists
      const q = query(
        subscriptionsRef,
        where('endpoint', '==', subscription.endpoint)
      );
      const existingDocs = await getDocs(q);

      const subscriptionData = {
        ...subscription,
        deviceInfo: deviceInfo || null,
        createdAt: Timestamp.now(),
        lastActive: Timestamp.now(),
      };

      if (existingDocs.empty) {
        // Add new subscription
        await addDoc(subscriptionsRef, subscriptionData);
      } else {
        // Update existing subscription
        const docRef = existingDocs.docs[0].ref;
        await deleteDoc(docRef);
        await addDoc(subscriptionsRef, subscriptionData);
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription saved successfully'
      });

    } else if (effectiveAction === 'unsubscribe') {
      // Remove subscription from Firestore
      const subscriptionsRef = collection(db, 'push_subscriptions');
      const q = query(
        subscriptionsRef,
        where('endpoint', '==', subscription.endpoint)
      );
      const existingDocs = await getDocs(q);

      if (!existingDocs.empty) {
        await deleteDoc(existingDocs.docs[0].ref);
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
