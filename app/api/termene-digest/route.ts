import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { sendEmail, isValidEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Daily digest of legal deadlines (OG 27/2002) for the staff:
 * intrari in registru_general that are overdue or due within 7 days.
 * Sent by Vercel Cron (vercel.json); can also be triggered manually
 * with CRON_SECRET or a staff token. No email is sent when there is
 * nothing to report.
 */

const DIGEST_WINDOW_DAYS = 7;

async function verifyAuthorization(request: NextRequest): Promise<boolean> {
  if (request.headers.get('x-vercel-cron') === '1') return true;

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  if (process.env.NODE_ENV === 'development') return true;

  const staffAuth = await verifyStaffRequest(request, ['admin', 'employee']);
  return staffAuth.authorized;
}

function formatTermen(termen: Timestamp): string {
  return termen.toDate().toLocaleDateString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuthorization(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Single-field range on termen (no composite index needed); entries
    // with suspended deadlines (termen null) are excluded automatically
    const now = Date.now();
    const windowEnd = Timestamp.fromMillis(now + DIGEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const snap = await db
      .collection('registru_general')
      .where('termen', '<=', windowEnd)
      .orderBy('termen', 'asc')
      .limit(300)
      .get();

    const relevant = snap.docs
      .map((d) => d.data())
      .filter((d) => d.status !== 'finalizat' && d.directie !== 'iesire');

    const depasite = relevant.filter((d) => d.termen.toMillis() < now);
    const apropiate = relevant.filter((d) => d.termen.toMillis() >= now);

    if (relevant.length === 0) {
      return NextResponse.json({ success: true, sent: 0, depasite: 0, apropiate: 0 });
    }

    // --- Build the report
    const line = (d: FirebaseFirestore.DocumentData) => {
      const zile = Math.ceil(Math.abs(d.termen.toMillis() - now) / (24 * 60 * 60 * 1000));
      const stare = d.termen.toMillis() < now ? `DEPĂȘIT cu ${zile} zile` : `mai sunt ${zile} zile`;
      const rezumat = String(d.continut || '').slice(0, 80);
      return `• ${d.numarInregistrare} — ${d.emitent} — termen ${formatTermen(d.termen)} (${stare})\n  ${rezumat}`;
    };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital';
    let text = `Bună dimineața,\n\nSituația termenelor legale din registrul general (OG 27/2002):\n\n`;
    if (depasite.length > 0) {
      text += `⚠️ TERMENE DEPĂȘITE (${depasite.length}):\n${depasite.map(line).join('\n')}\n\n`;
    }
    if (apropiate.length > 0) {
      text += `⏳ EXPIRĂ ÎN URMĂTOARELE ${DIGEST_WINDOW_DAYS} ZILE (${apropiate.length}):\n${apropiate.map(line).join('\n')}\n\n`;
    }
    text +=
      `Registrul complet: ${baseUrl}/admin/registru\n\n` +
      `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`;

    const subject =
      `Termene registratură: ${depasite.length} depășite, ` +
      `${apropiate.length} expiră în ${DIGEST_WINDOW_DAYS} zile`;

    // --- Recipients: all active staff accounts
    const usersSnap = await db.collection('users').where('active', '==', true).get();
    const recipients = usersSnap.docs
      .map((d) => d.data().email)
      .filter(isValidEmail);

    let sent = 0;
    for (const to of recipients) {
      if (await sendEmail({ to, subject, text })) sent++;
    }

    return NextResponse.json({
      success: true,
      sent,
      recipients: recipients.length,
      depasite: depasite.length,
      apropiate: apropiate.length,
    });
  } catch (error) {
    console.error('[termene-digest] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
