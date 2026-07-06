// app/api/registratura/count-new/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, count: 0, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Query pentru email-uri cu status 'nou'
    const snapshot = await db
      .collection('registratura_emails')
      .where('status', '==', 'nou')
      .count()
      .get();
    const count = snapshot.data().count;
    
    return NextResponse.json({ 
      success: true,
      count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error counting new emails:', error);
    
    return NextResponse.json(
      { 
        success: false,
        count: 0,
        error: 'Failed to count new emails' 
      },
      { status: 500 }
    );
  }
}