import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
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

    // 1. Obține instanțele Admin SDK
    const adminDb = getAdminDb();
    const adminStorage = getStorage();

    if (!adminDb || !adminStorage) {
      return NextResponse.json(
        { error: 'Firebase Admin nu este configurat corect' },
        { status: 500 }
      );
    }

    // 2. Descarcă documentul din Firestore
    const docRef = adminDb.collection('cereri').doc(cerereId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Cererea nu a fost găsită' },
        { status: 404 }
      );
    }

    const cerereData = docSnap.data();
    if (!cerereData) {
      return NextResponse.json(
        { error: 'Date cerere invalide' },
        { status: 400 }
      );
    }

    // 3. (opțional) Descarcă fișierele atașate din Storage
    //    și creează obiecte File pentru a le include în PDF
    const attachedFiles: File[] = [];
    const attachmentNames: string[] = cerereData.attachmentNames || [];

    for (const fileName of attachmentNames) {
      const filePath = `cereri/${cerereId}/${fileName}`;
      const bucket = adminStorage.bucket();
      const remoteFile = bucket.file(filePath);

      const [exists] = await remoteFile.exists();
      if (exists) {
        const [contents] = await remoteFile.download();
        // Creează un obiect File compatibil cu pdf-generator
        attachedFiles.push(
          new File([contents], fileName, { type: 'application/octet-stream' })
        );
      }
    }

    // 4. Construiește obiectul RequestData
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
      fisiere: attachedFiles,
      // Câmpuri adiționale (opționale)
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

    // 5. Generează PDF-ul
    const pdfBlob = await generatePDF(requestData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // 6. Returnează PDF-ul
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cerere_${cerereData.tipCerere || 'necunoscut'}_${cerereId}.pdf"`,
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