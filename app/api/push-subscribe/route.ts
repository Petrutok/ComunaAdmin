// app/api/push-subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subscription, deviceInfo } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }
    
    // For now, just acknowledge the subscription
    // In production, you'd save this to a database
    console.log('New subscription:', {
      endpoint: subscription.endpoint,
      deviceInfo
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved'
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
    
    // In production, remove from database
    console.log('Unsubscribe:', endpoint);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}