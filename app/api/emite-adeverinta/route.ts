import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { Timestamp } from 'firebase-admin/firestore';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { generateRegistruNumberAdmin } from '@/lib/generateRegistruNumberAdmin';
import { isAdeverintaType, ADEVERINTA_LABELS } from '@/lib/adeverinte';
import { generateAdeverintaPDF } from '@/lib/pdf/generateAdeverintaPDF';
import { TENANT } from '@/lib/tenant';

/**
 * Issues a certificate (adeverinta) for an approved request:
 * 1. draws an outgoing number from the unified registry counter
 * 2. generates the signed PDF with a QR verification code
 * 3. uploads it to Storage and links it on the form_submission
 *    (visible in the citizen's "Dosarul meu")
 * 4. records the iesire in registru_general and a verification record
 *
 * Per the commune's flow, only the primar/secretar (role: admin) issues.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cerereId, continut } = await request.json();

    if (!cerereId || !continut?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId or continut' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      throw new Error('Firebase Admin not initialized');
    }

    const cerereSnap = await db.collection('form_submissions').doc(cerereId).get();
    if (!cerereSnap.exists) {
      return NextResponse.json({ success: false, error: 'Cerere not found' }, { status: 404 });
    }
    const cerere = cerereSnap.data()!;

    if (!isAdeverintaType(cerere.tipCerere)) {
      return NextResponse.json(
        { success: false, error: 'Cererea nu este o solicitare de adeverinta' },
        { status: 400 }
      );
    }
    if (cerere.adeverinta?.downloadURL) {
      return NextResponse.json(
        { success: false, error: 'Adeverinta a fost deja emisa pentru aceasta cerere' },
        { status: 409 }
      );
    }

    // --- Issuing settings (signature image, mayor name, header)
    const settingsSnap = await db.doc('config/adeverinta_settings').get();
    const settings = settingsSnap.data() || {};

    let semnaturaPngDataUrl: string | null = null;
    if (settings.semnaturaPath) {
      try {
        const [buf] = await bucket.file(settings.semnaturaPath).download();
        semnaturaPngDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
      } catch (error) {
        console.warn('[emite-adeverinta] Signature image missing, issuing without it');
      }
    }

    // --- Outgoing number from the unified counter
    const numarIesire = await generateRegistruNumberAdmin();
    const emisLa = new Date();
    const tipLabel = ADEVERINTA_LABELS[cerere.tipCerere as keyof typeof ADEVERINTA_LABELS];

    // --- Verification record + QR
    const cod = randomBytes(8).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital';
    const verifyUrl = `${baseUrl}/verifica?nr=${encodeURIComponent(numarIesire)}&c=${cod}`;
    const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });

    // --- PDF
    const pdfBuffer = generateAdeverintaPDF({
      numarIesire,
      dataEmiterii: emisLa,
      tipLabel,
      body: continut.trim(),
      numeComplet: cerere.numeComplet,
      primarNume: settings.primarNume || 'PRIMAR',
      localitate: settings.localitate || TENANT.antetOficial,
      judet: settings.judet || TENANT.judet,
      semnaturaPngDataUrl,
      qrPngDataUrl,
      verifyUrl,
    });

    // --- Upload (unguessable download URL token is the access control;
    // the link is only delivered inside the citizen's Dosarul meu)
    const storagePath = `adeverinte/${cerereId}/${numarIesire}.pdf`;
    const fileRef = bucket.file(storagePath);
    await fileRef.save(pdfBuffer, { contentType: 'application/pdf' });
    const downloadURL = await getDownloadURL(fileRef);

    // --- Verification record (read only through /api/verifica)
    await db.collection('adeverinte_emise').add({
      numarIesire,
      cod,
      cerereId,
      citizenUid: cerere.citizenUid || null,
      tip: cerere.tipCerere,
      tipLabel,
      numeComplet: cerere.numeComplet,
      emisLa: Timestamp.fromDate(emisLa),
      emisDe: auth.uid,
      activa: true,
    });

    // --- Link on the request + resolve it
    await cerereSnap.ref.update({
      status: 'rezolvat',
      adeverinta: {
        numarIesire,
        downloadURL,
        storagePath,
        emisLa: Timestamp.fromDate(emisLa),
      },
      updatedAt: Timestamp.now(),
    });

    // --- Registry: the issued certificate is an iesire entry
    await db.collection('registru_general').add({
      numarInregistrare: numarIesire,
      tipDocument: 'cerere',
      dataInregistrare: Timestamp.fromDate(emisLa),
      emitent: 'Primăria',
      destinatar: cerere.numeComplet,
      emailDestinatar: cerere.email || '',
      continut: `${tipLabel} — emisă electronic`,
      status: 'finalizat',
      sursa: 'adeverinta',
      directie: 'iesire',
      termen: null,
      cerereId,
      creatDe: auth.uid || 'sistem',
      creatDeNume: auth.email || 'Emitere adeverințe',
      createdAt: Timestamp.now(),
    });

    // Also close the original intrare in the registry, if linked
    if (cerere.registruDocId) {
      await db
        .collection('registru_general')
        .doc(cerere.registruDocId)
        .update({ status: 'finalizat', updatedAt: Timestamp.now() })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, numarIesire, downloadURL });
  } catch (error) {
    console.error('[emite-adeverinta] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
