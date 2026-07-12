import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { sendEmail, isValidEmail, EmailAttachment } from '@/lib/email';
import { sendPushToUid } from '@/lib/push';

/**
 * Notifies a citizen that the status of their cerere/sesizare changed.
 * Called by the admin panel right after a status update. Sends web push to
 * the citizen's subscriptions (matched by citizenUid) and an email as
 * fallback. Both channels are best-effort: a failure here must never undo
 * the status change itself.
 */

const ALLOWED_COLLECTIONS = ['form_submissions', 'reported_issues'] as const;
type NotifiableCollection = (typeof ALLOWED_COLLECTIONS)[number];

const STATUS_LABELS: Record<string, string> = {
  noua: 'În așteptare',
  nou: 'Înregistrată',
  in_analiza: 'În analiză',
  repartizata: 'Repartizată',
  in_lucru: 'În lucru',
  in_asteptare: 'În așteptare',
  necesita_completare: 'Necesită completare — adăugați documentele solicitate din Dosarul meu',
  prelungit: 'Termen prelungit cu 15 zile (OG 27/2002)',
  redirectionat: 'Redirecționată către instituția competentă',
  rezolvat: 'Soluționată',
  rezolvata: 'Rezolvată',
  respins: 'Respinsă',
  clasat: 'Clasată',
  arhivat: 'Arhivată',
};

export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { collection, docId, newStatus } = await request.json();

    if (!ALLOWED_COLLECTIONS.includes(collection) || !docId || !newStatus) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection, docId or newStatus' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    const docSnap = await db.collection(collection as NotifiableCollection).doc(docId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    const data = docSnap.data()!;

    const isCerere = collection === 'form_submissions';
    const reference = isCerere
      ? data.numarInregistrare || 'cererea ta'
      : data.reportId || 'sesizarea ta';
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const title = isCerere ? 'Actualizare cerere' : 'Actualizare sesizare';
    const message = `${isCerere ? 'Cererea' : 'Sesizarea'} ${reference} este acum: ${statusLabel}`;

    const results = { push: 0, email: false };

    // --- Web push to the citizen's devices (only for account-linked docs)
    if (data.citizenUid) {
      results.push = await sendPushToUid(db, data.citizenUid, {
        title,
        body: message,
        url: '/dosarul-meu',
        tag: `status-${docId}`,
      });
    }

    // --- Email fallback (reaches citizens without the app installed).
    // When the status closes the cerere and a document was issued
    // (raspuns oficial / adeverinta), attach its PDF so the citizen gets
    // it directly, without needing the app.
    const citizenEmail = data.email || data.reporterContact;

    if (isValidEmail(citizenEmail)) {
      const attachments: EmailAttachment[] = [];
      if (isCerere && ['rezolvat', 'respins'].includes(newStatus)) {
        const bucket = getAdminBucket();
        if (bucket) {
          for (const emis of [data.raspuns, data.adeverinta]) {
            if (!emis?.storagePath || !emis?.numarIesire) continue;
            try {
              const [buf] = await bucket.file(emis.storagePath).download();
              attachments.push({ filename: `${emis.numarIesire}.pdf`, content: buf });
            } catch (error) {
              console.warn('[notify-status-change] Could not attach PDF:', emis.storagePath);
            }
          }
        }
      }

      results.email = await sendEmail({
        to: citizenEmail,
        subject: `${title}: ${reference} — ${statusLabel}`,
        text:
          `Bună ziua,\n\n${message}.\n\n` +
          (attachments.length
            ? `Documentul emis de primărie este atașat acestui email.\n\n`
            : '') +
          `Puteți vedea detaliile în aplicație, în secțiunea „Dosarul meu":\n` +
          `${process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital'}/dosarul-meu\n\n` +
          `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`,
        attachments,
      });
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('[notify-status-change] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
