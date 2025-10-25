import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CerereRequest {
  numeComplet: string;
  cnp: string;
  localitate: string;
  strada: string;
  numar?: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
  adresa: string;
  telefon?: string;
  email: string;
  tipCerere: string;
  scopulCererii: string;
  nume: string;
  prenume: string;
  judet: string;
  telefonMobil?: string;
  telefonFix?: string;
  fisiere?: any[];
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CerereRequest = await request.json();

    // Validate required fields
    const requiredFields = ['numeComplet', 'cnp', 'email', 'localitate', 'strada', 'tipCerere'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate CNP (should be 13 digits)
    if (!/^\d{13}$/.test(body.cnp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid CNP format (must be 13 digits)' },
        { status: 400 }
      );
    }

    // Prepare submission document
    const submissionData = {
      // Personal info
      numeComplet: body.numeComplet,
      nume: body.nume,
      prenume: body.prenume,
      cnp: body.cnp,

      // Contact
      email: body.email,
      telefon: body.telefon || body.telefonMobil || body.telefonFix,
      telefonMobil: body.telefonMobil,
      telefonFix: body.telefonFix,

      // Address
      judet: body.judet,
      localitate: body.localitate,
      strada: body.strada,
      numar: body.numar,
      bloc: body.bloc,
      scara: body.scara,
      etaj: body.etaj,
      apartament: body.apartament,
      adresa: body.adresa,

      // Request details
      tipCerere: body.tipCerere,
      scopulCererii: body.scopulCererii,

      // Files (if any) - limit to metadata since we're not storing large base64 in Firestore
      fisiere: body.fisiere?.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size
        // Don't store the base64 content in Firestore - it's too large
        // In production, you'd upload to Cloud Storage instead
      })) || [],

      // Additional fields (store any other fields provided)
      ...Object.keys(body).reduce((acc, key) => {
        if (![
          'numeComplet', 'cnp', 'localitate', 'strada', 'numar', 'bloc',
          'scara', 'etaj', 'apartament', 'adresa', 'telefon', 'email',
          'tipCerere', 'scopulCererii', 'nume', 'prenume', 'judet',
          'telefonMobil', 'telefonFix', 'fisiere'
        ].includes(key)) {
          acc[key] = body[key];
        }
        return acc;
      }, {} as Record<string, any>),

      // Metadata
      status: 'noua',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Save to Firestore
    const cereriCollection = collection(db, 'form_submissions');
    const docRef = await addDoc(cereriCollection, submissionData);

    return NextResponse.json(
      {
        success: true,
        id: docRef.id,
        message: 'Cerere trimisă cu succes'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing form submission:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process form submission'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
