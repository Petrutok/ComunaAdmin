import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { Resend } from 'resend';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';

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
  rezolvat: 'Soluționată',
  rezolvata: 'Rezolvată',
  respins: 'Respinsă',
  arhivat: 'Arhivată',
};

let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@primaria.ro',
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

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
    if (data.citizenUid && ensureVapidConfigured()) {
      const subs = await db
        .collection('push_subscriptions')
        .where('citizenUid', '==', data.citizenUid)
        .get();

      const payload = JSON.stringify({
        title,
        body: message,
        url: '/dosarul-meu',
        tag: `status-${docId}`,
        data: { url: '/dosarul-meu', timestamp: new Date().toISOString() },
      });

      for (const subDoc of subs.docs) {
        const sub = subDoc.data();
        if (!sub.endpoint || !sub.keys) continue;
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          results.push++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // Expired subscription: clean it up
          if (msg.includes('410') || msg.includes('404')) {
            await subDoc.ref.delete().catch(() => {});
          }
        }
      }
    }

    // --- Email fallback (reaches citizens without the app installed)
    const citizenEmail = data.email || data.reporterContact;
    const emailLooksValid =
      typeof citizenEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenEmail);

    if (emailLooksValid && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Primăria Digitală <onboarding@resend.dev>',
          to: citizenEmail,
          subject: `${title}: ${reference} — ${statusLabel}`,
          text:
            `Bună ziua,\n\n${message}.\n\n` +
            `Puteți vedea detaliile în aplicație, în secțiunea „Dosarul meu":\n` +
            `${process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital'}/dosarul-meu\n\n` +
            `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`,
        });
        results.email = true;
      } catch (error) {
        console.error('[notify-status-change] Email send failed:', error);
      }
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
