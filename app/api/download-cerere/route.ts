import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { generatePDF, RequestData } from '@/lib/simple-pdf-generator';

export async function POST(request: NextRequest) {
  try {
    const { cerereId } = await request.json();
    
    if (!cerereId) {
      return NextResponse.json(
        { error: 'ID cerere lipsă' },
        { status: 400 }
      );
    }

    // Obține db admin
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin nu este configurat' },
        { status: 500 }
      );
    }

    // Obține cererea din Firestore
    const docRef = adminDb.collection('cereri').doc(cerereId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Cererea nu a fost găsită' },
        { status: 404 }
      );
    }

    const cerereData = doc.data();
    if (!cerereData) {
      return NextResponse.json(
        { error: 'Date cerere invalide' },
        { status: 400 }
      );
    }

    // Pregătește datele pentru PDF
    const requestData: RequestData = {
      numeComplet: cerereData.numeComplet || '',
      nume: cerereData.nume || cerereData.numeComplet?.split(' ')[0] || '',
      prenume: cerereData.prenume || cerereData.numeComplet?.split(' ').slice(1).join(' ') || '',
      cnp: cerereData.cnp || '',
      email: cerereData.email || '',
      telefon: cerereData.telefon || '',
      telefonMobil: cerereData.telefonMobil || cerereData.telefon || '',
      telefonFix: cerereData.telefonFix || '',
      judet: cerereData.judet || 'Bacău',
      localitate: cerereData.localitate || '',
      strada: cerereData.strada || '',
      numar: cerereData.numar || '',
      bloc: cerereData.bloc || '',
      scara: cerereData.scara || '',
      etaj: cerereData.etaj || '',
      apartament: cerereData.apartament || '',
      adresa: cerereData.adresa || '',
      tipCerere: cerereData.tipCerere || '',
      scopulCererii: cerereData.scopulCererii || '',
      fisiere: cerereData.attachmentNames?.map((name: string) => ({ name } as File)) || [],
      // Câmpuri adiționale opționale
      ...(cerereData.numeFirma && { numeFirma: cerereData.numeFirma }),
      ...(cerereData.cui && { cui: cerereData.cui }),
      ...(cerereData.nrRegistruComert && { nrRegistruComert: cerereData.nrRegistruComert }),
      ...(cerereData.reprezentantLegal && { reprezentantLegal: cerereData.reprezentantLegal }),
      ...(cerereData.suprafataTeren && { suprafataTeren: cerereData.suprafataTeren }),
      ...(cerereData.nrCadastral && { nrCadastral: cerereData.nrCadastral }),
      ...(cerereData.tipConstructie && { tipConstructie: cerereData.tipConstructie }),
      ...(cerereData.suprafataConstructie && { suprafataConstructie: cerereData.suprafataConstructie }),
      ...(cerereData.anConstructie && { anConstructie: cerereData.anConstructie }),
      ...(cerereData.marcaAuto && { marcaAuto: cerereData.marcaAuto }),
      ...(cerereData.serieSasiu && { serieSasiu: cerereData.serieSasiu }),
      ...(cerereData.anFabricatie && { anFabricatie: cerereData.anFabricatie }),
      ...(cerereData.capacitateCilindrica && { capacitateCilindrica: cerereData.capacitateCilindrica }),
      ...(cerereData.masaMaxima && { masaMaxima: cerereData.masaMaxima }),
      ...(cerereData.nrInmatriculare && { nrInmatriculare: cerereData.nrInmatriculare }),
    };

    // Generează PDF
    const pdfBlob = await generatePDF(requestData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Returnează PDF-ul
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cerere_${cerereData.tipCerere}_${cerereId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Eroare la generarea PDF-ului' },
      { status: 500 }
    );
  }
}