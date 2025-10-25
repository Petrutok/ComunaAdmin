import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { generatePDF, RequestData } from '@/lib/simple-pdf-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cerereId } = body;

    if (!cerereId) {
      return NextResponse.json(
        { error: 'Missing cerereId' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Fetch cerere from Firestore
    const docRef = db.collection('form_submissions').doc(cerereId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Cerere not found' },
        { status: 404 }
      );
    }

    const docData = docSnap.data();

    // Transform data to match RequestData interface
    const requestData: RequestData = {
      numeComplet: docData.numeComplet || '',
      nume: docData.nume || '',
      prenume: docData.prenume || '',
      cnp: docData.cnp || '',
      email: docData.email || '',
      telefon: docData.telefon || '',
      telefonMobil: docData.telefonMobil,
      telefonFix: docData.telefonFix,
      judet: docData.judet || '',
      localitate: docData.localitate || '',
      strada: docData.strada,
      numar: docData.numar,
      bloc: docData.bloc,
      scara: docData.scara,
      etaj: docData.etaj,
      apartament: docData.apartament,
      adresa: docData.adresa || '',
      tipCerere: docData.tipCerere || '',
      scopulCererii: docData.scopulCererii || '',
      // Additional fields if they exist
      numeFirma: docData.numeFirma,
      cui: docData.cui,
      nrRegistruComert: docData.nrRegistruComert,
      reprezentantLegal: docData.reprezentantLegal,
      suprafataTeren: docData.suprafataTeren,
      nrCadastral: docData.nrCadastral,
      tipConstructie: docData.tipConstructie,
      suprafataConstructie: docData.suprafataConstructie,
      anConstructie: docData.anConstructie,
      marcaAuto: docData.marcaAuto,
      serieSasiu: docData.serieSasiu,
      anFabricatie: docData.anFabricatie,
      capacitateCilindrica: docData.capacitateCilindrica,
      masaMaxima: docData.masaMaxima,
      nrInmatriculare: docData.nrInmatriculare,
      // Files as metadata (without buffer content)
      fisiere: docData.fisiere?.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })) || [],
    };

    // Generate PDF
    const pdfBlob = await generatePDF(requestData);

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cerere_${requestData.tipCerere}_${cerereId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error downloading cerere PDF:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
