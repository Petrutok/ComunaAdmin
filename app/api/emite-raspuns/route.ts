import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { Timestamp } from 'firebase-admin/firestore';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { generateRegistruNumberAdmin } from '@/lib/generateRegistruNumberAdmin';
import { generateRaspunsPDF } from '@/lib/pdf/generateRaspunsPDF';
import { TENANT } from '@/lib/tenant';

/**
 * Issues the official written response (raspuns) to a citizen request,
 * closing the OG 27/2002 petition circuit:
 * 1. draws an outgoing number from the unified registry counter
 * 2. generates the signed PDF with a QR verification code
 * 3. uploads it to Storage and links it on the form_submission
 *    (downloadable in the citizen's "Dosarul meu")
 * 4. records the iesire in registru_general, linked to the incoming
 *    entry (conexare intrare-iesire), and closes the intrare
 *
 * Like adeverinte, the response carries the primar's signature, so
 * only role admin (primar/secretar) can issue it.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cerereId, continut, status } = await request.json();

    if (!cerereId || !continut?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId or continut' },
        { status: 400 }
      );
    }
    const finalStatus = status === 'respins' ? 'respins' : 'rezolvat';

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

    if (cerere.raspuns?.downloadURL) {
      return NextResponse.json(
        { success: false, error: 'Un răspuns oficial a fost deja emis pentru această cerere' },
        { status: 409 }
      );
    }

    // --- Issuing settings (shared with adeverinte: signature, mayor, header)
    const settingsSnap = await db.doc('config/adeverinta_settings').get();
    const settings = settingsSnap.data() || {};

    let semnaturaPngDataUrl: string | null = null;
    if (settings.semnaturaPath) {
      try {
        const [buf] = await bucket.file(settings.semnaturaPath).download();
        semnaturaPngDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
      } catch (error) {
        console.warn('[emite-raspuns] Signature image missing, issuing without it');
      }
    }

    // --- Outgoing number from the unified counter
    const numarIesire = await generateRegistruNumberAdmin();
    const emisLa = new Date();

    // --- Verification record + QR (same public /verifica flow as adeverinte)
    const cod = randomBytes(8).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital';
    const verifyUrl = `${baseUrl}/verifica?nr=${encodeURIComponent(numarIesire)}&c=${cod}`;
    const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });

    // --- PDF
    const pdfBuffer = generateRaspunsPDF({
      numarIesire,
      dataEmiterii: emisLa,
      numarCerere: cerere.numarInregistrare,
      body: continut.trim(),
      primarNume: settings.primarNume || 'PRIMAR',
      localitate: settings.localitate || TENANT.antetOficial,
      judet: settings.judet || TENANT.judet,
      semnaturaPngDataUrl,
      qrPngDataUrl,
      verifyUrl,
    });

    // --- Upload (unguessable download URL token is the access control;
    // the link is only delivered inside the citizen's Dosarul meu)
    const storagePath = `raspunsuri/${cerereId}/${numarIesire}.pdf`;
    const fileRef = bucket.file(storagePath);
    await fileRef.save(pdfBuffer, { contentType: 'application/pdf' });
    const downloadURL = await getDownloadURL(fileRef);

    // --- Verification record (read only through /api/verifica)
    await db.collection('adeverinte_emise').add({
      numarIesire,
      cod,
      cerereId,
      citizenUid: cerere.citizenUid || null,
      tip: 'raspuns-oficial',
      tipLabel: 'Răspuns oficial al primăriei',
      numeComplet: cerere.numeComplet,
      emisLa: Timestamp.fromDate(emisLa),
      emisDe: auth.uid,
      activa: true,
    });

    // --- Link on the request + close it with the chosen outcome
    await cerereSnap.ref.update({
      status: finalStatus,
      raspuns: {
        numarIesire,
        downloadURL,
        storagePath,
        emisLa: Timestamp.fromDate(emisLa),
      },
      updatedAt: Timestamp.now(),
    });

    // --- Registry: the response is an iesire entry, linked to the intrare
    await db.collection('registru_general').add({
      numarInregistrare: numarIesire,
      tipDocument: 'adresa',
      dataInregistrare: Timestamp.fromDate(emisLa),
      emitent: 'Primăria',
      destinatar: cerere.numeComplet,
      emailDestinatar: cerere.email || '',
      continut: `Răspuns oficial la cererea nr. ${cerere.numarInregistrare || '—'}${cerere.tipCerere ? ` (${cerere.tipCerere})` : ''}`,
      status: 'finalizat',
      sursa: 'raspuns',
      directie: 'iesire',
      termen: null,
      cerereId,
      raspunsLaDocId: cerere.registruDocId || null,
      raspunsLaNumar: cerere.numarInregistrare || null,
      creatDe: auth.uid || 'sistem',
      creatDeNume: auth.email || 'Emitere răspunsuri',
      createdAt: Timestamp.now(),
    });

    // Also close the original intrare in the registry, if linked
    if (cerere.registruDocId) {
      await db
        .collection('registru_general')
        .doc(cerere.registruDocId)
        .update({
          status: 'finalizat',
          raspunsNumar: numarIesire,
          updatedAt: Timestamp.now(),
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, numarIesire, downloadURL, status: finalStatus });
  } catch (error) {
    console.error('[emite-raspuns] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
