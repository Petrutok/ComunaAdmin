// app/api/push-subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import crypto from 'crypto';

function detectPlatform(userAgent?: string): 'web' | 'ios' | 'android' {
  const ua = userAgent || '';
  
  if (/android/i.test(ua)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return 'ios';
  }
  
  return 'web';
}

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
      platform: deviceInfo?.platform || detectPlatform(deviceInfo?.userAgent),
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

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }
    
    // Create hash from endpoint
    const endpointHash = crypto
      .createHash('sha256')
      .update(endpoint)
      .digest('hex')
      .substring(0, 16);
    
    // Update subscription as inactive instead of deleting
    await updateDoc(doc(db, 'push_subscriptions', endpointHash), {
      active: false,
      updatedAt: new Date()
    });
    
    console.log('Subscription deactivated:', endpointHash);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}