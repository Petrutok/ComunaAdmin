// app/api/report-issue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, collection, addDoc } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('📝 New issue report received from:', data.name);

    // Pregătește datele pentru Firestore
    const issueData = {
      // Informații reporter
      reporterName: data.name,
      reporterContact: data.contact,
      
      // Detalii problemă
      title: data.title || `Problemă raportată de ${data.name}`,
      description: data.description,
      location: data.location,
      
      // Categorii și status
      type: data.type || 'general',
      priority: data.priority || 'medium',
      status: 'noua',
      
      // Imagine
      imageUrl: data.imageUrl || '',
      
      // Metadata cu Timestamp Firebase
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      reportId: `ISS-${Date.now()}`,
      
      // Tracking
      assignedTo: null,
      resolvedAt: null,
      resolution: null,
      internalNotes: [],
      
      // Locație GPS dacă există
      coordinates: data.coordinates || null
    };

    // Salvează în Firestore
    const docRef = await addDoc(collection(db, 'reported_issues'), issueData);
    console.log('✅ Issue saved to Firestore with ID:', docRef.id);

    // Opțional: Trimite notificare (dacă ai sistem de notificări)
    // await sendNotificationToAdmins(issueData);

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      reportId: issueData.reportId,
      message: 'Problema a fost raportată cu succes!' 
    });

  } catch (error) {
    console.error('❌ Error processing issue report:', error);
    
    // Log mai detaliat pentru debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Eroare la procesarea raportului' 
      },
      { status: 500 }
    );
  }
}

// GET - pentru a lista problemele (opțional, pentru testare)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '10';
    
    // Pentru testare simplă - returnează un mesaj
    return NextResponse.json({ 
      success: true, 
      message: 'API Route pentru probleme raportate funcționează!',
      endpoint: '/api/report-issue',
      methods: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la încărcarea datelor' },
      { status: 500 }
    );
  }
}