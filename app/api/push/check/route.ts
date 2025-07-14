import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getDocs(collection(db, 'push_subscriptions'));
    
    const subscriptions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        endpoint: data.endpoint?.substring(0, 50) + '...',
        keys: data.keys ? 'present' : 'missing',
        subscription: data.subscription ? 'present' : 'missing',
        active: data.active || false, // Include active field
        platform: data.platform || 'unknown',
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      };
    });
    
    return NextResponse.json({
      total: subscriptions.length,
      active: subscriptions.filter(s => s.active).length,
      subscriptions
    });
  } catch (error: any) {
    console.error('Check subscriptions error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}