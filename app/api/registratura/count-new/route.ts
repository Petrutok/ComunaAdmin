// app/api/registratura/count-new/route.ts

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // Query pentru email-uri cu status 'nou'
    const q = query(
      collection(db, 'registratura_emails'),
      where('status', '==', 'nou')
    );
    
    const snapshot = await getDocs(q);
    const count = snapshot.size;
    
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