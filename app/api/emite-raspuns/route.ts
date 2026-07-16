import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { Timestamp } from 'firebase-admin/firestore';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { generateRegistruNumberAdmin } from '@/lib/generateRegistruNumberAdmin';
import { generateRaspunsPDF } from '@/lib/pdf/generateRaspunsPDF';
import { loadStemaDataUrl } from '@/lib/pdf/antet';
import { resolveSemnatari } from '@/lib/pdf/semnatari-server';
import { sendPushToUid } from '@/lib/push';
import { notifyCitizenStatusChange } from '@/lib/notify-status';
import { TENANT } from '@/lib/tenant';
import { sendEmail } from '@/lib/email';

/**
 * Issues the official written response (raspuns) that closes the
 * OG 27/2002 petition circuit, for BOTH kinds of intrari:
 * - cerereId: an online cerere - the PDF lands in the citizen's
 *   "Dosarul meu" (email with attachment goes out separately via
 *   notifyCitizenStatusChange, server-side, which also sends push)
 * - registruDocId: a registry entry from IMAP email or manual
 *   registration - the PDF is emailed directly to the sender
 *   (there is no Dosarul meu for these)
 *
 * Both paths: outgoing number from the unified counter, signed PDF
 * with QR verification, iesire entry linked to the intrare
 * (conexare), and the intrare closed.
 *
 * Two entry points:
 * - emitere rapida (no avizareId): admin only, all signature blocks in
 *   one step (delegation / paper-signed documents)
 * - final step of the avizare circuit ({ avizareId }): the designated
 *   primar (or an admin) signs a draft that is 'la_primar'
 */
export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      cerereId: cerereIdInput,
      registruDocId: registruDocIdInput,
      continut: continutInput,
      status,
      avizareId,
    } = await request.json();

    const db = getAdminDb();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      throw new Error('Firebase Admin not initialized');
    }

    // --- Issuing settings (shared with adeverinte: signatures, names, header)
    const settingsSnap = await db.doc('config/adeverinta_settings').get();
    const settings = settingsSnap.data() || {};
    const isAdmin = auth.role === 'admin';

    // --- Resolve the entry point: avizare final step vs emitere rapida
    let cerereId: string | undefined = cerereIdInput;
    let registruDocId: string | undefined = registruDocIdInput;
    let continut: string = continutInput;
    let statusFromDraft: string | undefined;
    let avizare: FirebaseFirestore.DocumentData | null = null;
    let avizareRef: FirebaseFirestore.DocumentReference | null = null;

    if (avizareId) {
      avizareRef = db.collection('avizari').doc(avizareId);
      const avizareSnap = await avizareRef.get();
      if (!avizareSnap.exists) {
        return NextResponse.json({ success: false, error: 'Avizare not found' }, { status: 404 });
      }
      avizare = avizareSnap.data()!;
      if (avizare.tipDocument !== 'raspuns' || avizare.stadiu !== 'la_primar') {
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
      cerereId = avizare.cerereId || undefined;
      registruDocId = avizare.registruDocId || undefined;
      continut = avizare.continut;
      statusFromDraft = avizare.raspunsStatus;
    } else if (!isAdmin) {
      // emitere rapida is reserved for admins
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((!cerereId && !registruDocId) || !continut?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId/registruDocId or continut' },
        { status: 400 }
      );
    }
    const finalStatus = (statusFromDraft ?? status) === 'respins' ? 'respins' : 'rezolvat';

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
      const registruSnap = await db.collection('registru_general').doc(registruDocId!).get();
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
      intrareDocId = registruDocId ?? null;
    }

    const recipientName = cerere?.numeComplet || registruEntry?.emitent || 'Petent';
    const recipientEmail = cerere?.email || registruEntry?.emailEmitent || '';
    const numarIntrare = cerere?.numarInregistrare || registruEntry?.numarInregistrare;

    // --- Signature blocks: primar always; secretar if the draft was
    // avizat (or configured, on emitere rapida); intocmit = the drafting
    // responsabil (or the assignee, on emitere rapida)
    const { semnaturaPngDataUrl, secretar, intocmit } = await resolveSemnatari(db, bucket, settings, {
      intocmitUid: avizare
        ? avizare.intocmitDe?.uid
        : cerere?.assignedToUserId || registruEntry?.assignedToUserId || null,
      includeSecretar: avizare ? !!avizare.avizatDe : !!settings.secretarNume,
    });

    // --- Outgoing number from the unified counter
    const numarIesire = await generateRegistruNumberAdmin();
    const emisLa = new Date();

    // --- Verification record + QR (same public /verifica flow as adeverinte)
    const cod = randomBytes(8).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital';
    const verifyUrl = `${baseUrl}/verifica?nr=${encodeURIComponent(numarIesire)}&c=${cod}`;
    const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });

    // --- PDF
    const stemaDataUrl = await loadStemaDataUrl();
    const pdfBuffer = generateRaspunsPDF({
      numarIesire,
      dataEmiterii: emisLa,
      numarCerere: numarIntrare,
      body: continut.trim(),
      primarNume: settings.primarNume || 'PRIMAR',
      localitate: settings.localitate || TENANT.antetOficial,
      judet: settings.judet || TENANT.judet,
      semnaturaPngDataUrl,
      stemaDataUrl,
      secretar,
      intocmit,
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
        await db.collection('form_submissions').doc(cerereId!).collection('istoric').add({
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

    // --- Delivery, server-side so it doesn't depend on the clerk's
    // browser: cereri online get push + email with the PDF attached;
    // registry entries have no Dosarul meu, so the PDF goes out by email
    // directly. Best effort: the response is already issued either way.
    let emailSent = false;
    if (cerereId) {
      const notified = await notifyCitizenStatusChange(db, {
        collection: 'form_submissions',
        docId: cerereId,
        newStatus: finalStatus,
      }).catch((error) => {
        console.error('[emite-raspuns] Notification failed:', error);
        return { push: 0, email: false };
      });
      emailSent = notified.email;
    }
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
      const marker = { avizare: { id: avizareRef.id, stadiu: 'emis' } };
      if (cerereId) {
        await db.collection('form_submissions').doc(cerereId).update(marker).catch(() => {});
      } else if (registruDocId) {
        await db.collection('registru_general').doc(registruDocId).update(marker).catch(() => {});
      }
      if (avizare.intocmitDe?.uid && avizare.intocmitDe.uid !== auth.uid) {
        sendPushToUid(db, avizare.intocmitDe.uid, {
          title: 'Document semnat și emis',
          body: `Răspuns oficial — nr. ieșire ${numarIesire}`,
          url: '/admin/cereri',
          tag: 'avizare-emis',
        }).catch(() => {});
      }
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
