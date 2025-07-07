import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { subscription, deviceInfo } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }
    
    // Create a unique ID from the endpoint
    const endpointHash = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .substring(0, 16);
    
    // Save subscription to Firestore
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      expirationTime: subscription.expirationTime,
      active: true,
      platform: deviceInfo?.platform || 'web',
      userAgent: deviceInfo?.userAgent || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
      failureCount: 0
    };
    
    // Use setDoc to create or update
    await setDoc(
      doc(db, 'push_subscriptions', endpointHash), 
      subscriptionData,
      { merge: true }
    );
    
    console.log('Subscription saved to Firestore:', endpointHash);
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      id: endpointHash
    });
    
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}