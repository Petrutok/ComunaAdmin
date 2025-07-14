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
    
    // Save subscription to Firestore - IMPORTANT: salvăm tot subscription-ul
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,  // Aceste keys sunt necesare pentru a trimite notificări
      expirationTime: subscription.expirationTime,
      active: true,
      platform: deviceInfo?.platform || 'web',
      userAgent: deviceInfo?.userAgent || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
      failureCount: 0,
      // IMPORTANT: Salvăm întregul subscription pentru compatibilitate
      subscription: subscription
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

// Handle DELETE requests
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }
    
    // Create ID from endpoint
    const endpointHash = crypto
      .createHash('sha256')
      .update(endpoint)
      .digest('hex')
      .substring(0, 16);
    
    // Mark as inactive instead of deleting
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
