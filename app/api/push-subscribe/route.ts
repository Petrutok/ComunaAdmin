// app/api/push-subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { subscription, deviceInfo } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }
    
    // Generate unique ID from endpoint
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Save to Firestore
    await setDoc(doc(db, 'push_subscriptions', subscriptionId), {
      subscription,
      deviceInfo,
      createdAt: new Date(),
      lastUsed: new Date(),
      active: true
    });
    
    return NextResponse.json({ 
      success: true, 
      subscriptionId 
    });
    
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }
    
    const subscriptionId = Buffer.from(endpoint).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Mark as inactive
    const docRef = doc(db, 'push_subscriptions', subscriptionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await setDoc(docRef, {
        ...docSnap.data(),
        active: false,
        deactivatedAt: new Date()
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}