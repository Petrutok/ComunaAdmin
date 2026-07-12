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
import { sendEmail } from '@/lib/email';

/**
 * Issues the official written response (raspuns) that closes the
 * OG 27/2002 petition circuit, for BOTH kinds of intrari:
 * - cerereId: an online cerere - the PDF lands in the citizen's
 *   "Dosarul meu" (email with attachment goes out separately via
 *   /api/notify-status-change, which also sends push)
 * - registruDocId: a registry entry from IMAP email or manual
 *   registration - the PDF is emailed directly to the sender
 *   (there is no Dosarul meu for these)
 *
 * Both paths: outgoing number from the unified counter, signed PDF
 * with QR verification, iesire entry linked to the intrare
 * (conexare), and the intrare closed.
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
    const { cerereId, registruDocId, continut, status } = await request.json();

    if ((!cerereId && !registruDocId) || !continut?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId/registruDocId or continut' },
        { status: 400 }
      );
    }
    const finalStatus = status === 'respins' ? 'respins' : 'rezolvat';

    const db = getAdminDb();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      throw new Error('Firebase Admin not initialized');
    }

    // --- Resolve the intrare being answered
    let cerereSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let cerere: FirebaseFirestore.DocumentData | null = null;
    let registruEntry: FirebaseFirestore.DocumentData | null = null;
    let intrareDocId: string | null = null;

    if (cerereId) {
      cerereSnap = await db.collection('form_submissions').doc(cerereId).get();
      if (!cerereSnap.exists) {
        return NextResponse.json({ success: false, error: 'Cerere not found' }, { status: 404 });
      }
      cerere = cerereSnap.data()!;
      if (cerere.raspuns?.downloadURL) {
        return NextResponse.json(
          { success: false, error: 'Un răspuns oficial a fost deja emis pentru această cerere' },
          { status: 409 }
        );
      }
      intrareDocId = cerere.registruDocId || null;
    } else {
      const registruSnap = await db.collection('registru_general').doc(registruDocId).get();
      if (!registruSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Registry entry not found' },
          { status: 404 }
        );
      }
      registruEntry = registruSnap.data()!;
      if (registruEntry.directie === 'iesire') {
        return NextResponse.json(
          { success: false, error: 'Se poate răspunde doar la documente de intrare' },
          { status: 400 }
        );
      }
      if (registruEntry.raspunsNumar) {
        return NextResponse.json(
          { success: false, error: 'Un răspuns a fost deja emis pentru acest document' },
          { status: 409 }
        );
      }
      if (registruEntry.cerereId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Această intrare provine dintr-o cerere online — emiteți răspunsul din Admin → Cereri',
          },
          { status: 400 }
        );
      }
      intrareDocId = registruDocId;
    }

    const recipientName = cerere?.numeComplet || registruEntry?.emitent || 'Petent';
    const recipientEmail = cerere?.email || registruEntry?.emailEmitent || '';
    const numarIntrare = cerere?.numarInregistrare || registruEntry?.numarInregistrare;

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
      numarCerere: numarIntrare,
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
    const storagePath = cerereId
      ? `raspunsuri/${cerereId}/${numarIesire}.pdf`
      : `raspunsuri/registru/${registruDocId}/${numarIesire}.pdf`;
    const fileRef = bucket.file(storagePath);
    await fileRef.save(pdfBuffer, { contentType: 'application/pdf' });
    const downloadURL = await getDownloadURL(fileRef);

    // --- Verification record (read only through /api/verifica)
    await db.collection('adeverinte_emise').add({
      numarIesire,
      cod,
      cerereId: cerereId || null,
      citizenUid: cerere?.citizenUid || null,
      tip: 'raspuns-oficial',
      tipLabel: 'Răspuns oficial al primăriei',
      numeComplet: recipientName,
      emisLa: Timestamp.fromDate(emisLa),
      emisDe: auth.uid,
      activa: true,
    });

    // --- Link on the request + close it with the chosen outcome
    if (cerereSnap) {
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

      // Audit trail (best effort)
      try {
        await db.collection('form_submissions').doc(cerereId).collection('istoric').add({
          tip: 'raspuns',
          mesaj: `Răspuns oficial emis, nr. ieșire ${numarIesire} (${finalStatus === 'respins' ? 'respingere motivată' : 'soluționare'})`,
          autorId: auth.uid || 'sistem',
          autorNume: auth.email || 'Staff',
          createdAt: Timestamp.now(),
        });
      } catch {}
    }

    // --- Registry: the response is an iesire entry, linked to the intrare
    const continutIesire = cerere
      ? `Răspuns oficial la cererea nr. ${numarIntrare || '—'}${cerere.tipCerere ? ` (${cerere.tipCerere})` : ''}`
      : `Răspuns oficial la documentul nr. ${numarIntrare || '—'}`;
    await db.collection('registru_general').add({
      numarInregistrare: numarIesire,
      tipDocument: 'adresa',
      dataInregistrare: Timestamp.fromDate(emisLa),
      emitent: 'Primăria',
      destinatar: recipientName,
      emailDestinatar: recipientEmail,
      continut: continutIesire,
      status: 'finalizat',
      sursa: 'raspuns',
      directie: 'iesire',
      termen: null,
      cerereId: cerereId || null,
      emailId: registruEntry?.emailId || null,
      raspunsLaDocId: intrareDocId,
      raspunsLaNumar: numarIntrare || null,
      creatDe: auth.uid || 'sistem',
      creatDeNume: auth.email || 'Emitere răspunsuri',
      createdAt: Timestamp.now(),
    });

    // Also close the original intrare in the registry, if linked
    if (intrareDocId) {
      await db
        .collection('registru_general')
        .doc(intrareDocId)
        .update({
          status: 'finalizat',
          raspunsNumar: numarIesire,
          updatedAt: Timestamp.now(),
        })
        .catch(() => {});
    }

    // An IMAP-sourced entry also has its registratura_emails doc - mark it
    if (registruEntry?.emailId) {
      await db
        .collection('registratura_emails')
        .doc(registruEntry.emailId)
        .update({ status: 'rezolvat', updatedAt: Timestamp.now() })
        .catch(() => {});
    }

    // --- Delivery: cereri online are notified (push + email with the PDF
    // attached) by /api/notify-status-change, called from the admin UI.
    // Registry entries have no Dosarul meu, so the PDF goes out by email
    // right here. Best effort: the response is already issued either way.
    let emailSent = false;
    if (!cerereId) {
      emailSent = await sendEmail({
        to: recipientEmail,
        subject: `Răspuns la documentul nr. ${numarIntrare || numarIesire} — nr. ieșire ${numarIesire}`,
        text:
          `Bună ziua, ${recipientName},\n\n` +
          `Vă transmitem atașat răspunsul oficial al primăriei` +
          (numarIntrare ? ` la documentul dumneavoastră înregistrat cu nr. ${numarIntrare}` : '') +
          `.\n\nNumăr de ieșire: ${numarIesire}\n\n` +
          `Autenticitatea documentului poate fi verificată scanând codul QR din PDF sau accesând:\n${verifyUrl}\n\n` +
          `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`,
        attachments: [{ filename: `${numarIesire}.pdf`, content: pdfBuffer }],
      });
    }

    return NextResponse.json({
      success: true,
      numarIesire,
      downloadURL,
      status: finalStatus,
      emailSent,
    });
  } catch (error) {
    console.error('[emite-raspuns] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
