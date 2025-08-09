import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

// Prevent pre-rendering during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Subscribe] Raw body received:', JSON.stringify(body, null, 2));
    
    const { subscription, deviceInfo } = body;
    
    if (!subscription) {
      console.error('[Subscribe] No subscription in body');
      return NextResponse.json(
        { error: 'No subscription provided' },
        { status: 400 }
      );
    }
    
    console.log('[Subscribe] Received subscription:', {
      endpoint: subscription.endpoint?.substring(0, 50) + '...',
      hasKeys: !!subscription.keys,
      platform: deviceInfo?.platform,
      expirationTime: subscription.expirationTime
    });
    
    // Create a unique ID from the endpoint
    const endpointHash = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .substring(0, 16);
    
    console.log('[Subscribe] Generated hash:', endpointHash);
    
    // Save subscription to Firestore - Handle undefined values
    const subscriptionData: any = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      active: true,
      platform: deviceInfo?.platform || 'web',
      userAgent: deviceInfo?.userAgent || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
      failureCount: 0,
      subscription: subscription
    };
    
    // Only add expirationTime if it exists (iOS doesn't have it)
    if (subscription.expirationTime !== undefined && subscription.expirationTime !== null) {
      subscriptionData.expirationTime = subscription.expirationTime;
    }
    
    console.log('[Subscribe] Saving to Firestore...');
    
    try {
      await setDoc(
        doc(db, 'push_subscriptions', endpointHash), 
        subscriptionData,
        { merge: true }
      );
      
      console.log('[Subscribe] Saved successfully to Firestore');
    } catch (firestoreError: any) {
      console.error('[Subscribe] Firestore error:', firestoreError);
      throw firestoreError;
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      id: endpointHash
    });
    
  } catch (error: any) {
    console.error('[Subscribe] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to save subscription',
        details: error.toString()
      },
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
    
    const endpointHash = crypto
      .createHash('sha256')
      .update(endpoint)
      .digest('hex')
      .substring(0, 16);
    
    await setDoc(
      doc(db, 'push_subscriptions', endpointHash),
      { active: false, updatedAt: new Date() },
      { merge: true }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed'
    });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
