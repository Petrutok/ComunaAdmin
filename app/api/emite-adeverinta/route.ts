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
import { resolveSemnatari } from '@/lib/pdf/semnatari-server';
import { sendPushToUid } from '@/lib/push';
import { notifyCitizenStatusChange } from '@/lib/notify-status';
import { TENANT } from '@/lib/tenant';

/**
 * Issues a certificate (adeverinta) for an approved request:
 * 1. draws an outgoing number from the unified registry counter
 * 2. generates the signed PDF with a QR verification code
 * 3. uploads it to Storage and links it on the form_submission
 *    (visible in the citizen's "Dosarul meu")
 * 4. records the iesire in registru_general and a verification record
 *
 * Two entry points:
 * - emitere rapida (no avizareId): admin only, all signature blocks in
 *   one step (delegation / paper-signed documents)
 * - final step of the avizare circuit ({ avizareId }): the designated
 *   primar (or an admin) signs a draft that is 'la_primar'; the text
 *   comes from the avizare doc and the Intocmit/Secretar blocks from
 *   its trail
 */
export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cerereId: cerereIdInput, continut: continutInput, avizareId } = await request.json();

    const db = getAdminDb();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      throw new Error('Firebase Admin not initialized');
    }

    // --- Issuing settings (signatures, names, header, designated signers)
    const settingsSnap = await db.doc('config/adeverinta_settings').get();
    const settings = settingsSnap.data() || {};
    const isAdmin = auth.role === 'admin';

    // --- Resolve the entry point: avizare final step vs emitere rapida
    let cerereId: string = cerereIdInput;
    let continut: string = continutInput;
    let avizare: FirebaseFirestore.DocumentData | null = null;
    let avizareRef: FirebaseFirestore.DocumentReference | null = null;

    if (avizareId) {
      avizareRef = db.collection('avizari').doc(avizareId);
      const avizareSnap = await avizareRef.get();
      if (!avizareSnap.exists) {
        return NextResponse.json({ success: false, error: 'Avizare not found' }, { status: 404 });
      }
      avizare = avizareSnap.data()!;
      if (avizare.tipDocument !== 'adeverinta' || avizare.stadiu !== 'la_primar') {
        return NextResponse.json(
          { success: false, error: 'Documentul nu așteaptă semnătura primarului' },
          { status: 409 }
        );
      }
      if (!isAdmin && auth.uid !== settings.primarUserId) {
        return NextResponse.json(
          { success: false, error: 'Doar primarul desemnat (sau un admin) poate semna' },
          { status: 403 }
        );
      }
      cerereId = avizare.cerereId;
      continut = avizare.continut;
    } else if (!isAdmin) {
      // emitere rapida is reserved for admins
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!cerereId || !continut?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId or continut' },
        { status: 400 }
      );
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

    // --- Signature blocks: primar always; secretar if the draft was
    // avizat (or configured, on emitere rapida); intocmit = the drafting
    // responsabil (or the assignee, on emitere rapida)
    const { semnaturaPngDataUrl, secretar, intocmit } = await resolveSemnatari(db, bucket, settings, {
      intocmitUid: avizare ? avizare.intocmitDe?.uid : cerere.assignedToUserId || null,
      includeSecretar: avizare ? !!avizare.avizatDe : !!settings.secretarNume,
    });

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
      secretar,
      intocmit,
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

    // Audit trail (best effort)
    try {
      await db.collection('form_submissions').doc(cerereId).collection('istoric').add({
        tip: 'adeverinta',
        mesaj: `Adeverință emisă, nr. ieșire ${numarIesire} (${tipLabel})`,
        autorId: auth.uid || 'sistem',
        autorNume: auth.email || 'Staff',
        createdAt: Timestamp.now(),
      });
    } catch {}

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

    // --- Citizen notification (push + email with the PDF attached).
    // Sent HERE, server-side, so delivery doesn't depend on the clerk's
    // browser staying open. Best effort: issuing already succeeded.
    await notifyCitizenStatusChange(db, {
      collection: 'form_submissions',
      docId: cerereId,
      newStatus: 'rezolvat',
    }).catch((error) => console.error('[emite-adeverinta] Notification failed:', error));

    // --- Close the avizare circuit: mark the draft as issued and tell
    // the responsabil their document went out (best effort)
    if (avizareRef && avizare) {
      await avizareRef
        .update({
          stadiu: 'emis',
          numarIesire,
          emisDe: { uid: auth.uid, la: Timestamp.now() },
          updatedAt: Timestamp.now(),
        })
        .catch(() => {});
      await cerereSnap.ref
        .update({ avizare: { id: avizareRef.id, stadiu: 'emis' } })
        .catch(() => {});
      if (avizare.intocmitDe?.uid && avizare.intocmitDe.uid !== auth.uid) {
        sendPushToUid(db, avizare.intocmitDe.uid, {
          title: 'Document semnat și emis',
          body: `${tipLabel} — nr. ieșire ${numarIesire}`,
          url: '/admin/cereri',
          tag: 'avizare-emis',
        }).catch(() => {});
      }
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
