import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Public verification of an issued certificate, called from the /verifica
 * page after scanning the QR code. Requires both the outgoing number AND
 * the secret code embedded in the QR, so numbers alone can't be probed.
 * Returns only what a third party needs: validity, type, date, masked name.
 */

function maskName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? part : part[0] + '***'))
    .join(' ');
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(`verifica:${getClientIp(request)}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, error: 'Prea multe verificări. Încercați mai târziu.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const nr = request.nextUrl.searchParams.get('nr');
  const cod = request.nextUrl.searchParams.get('c');

  if (!nr || !cod) {
    return NextResponse.json({ valid: false, error: 'Parametri lipsă' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    const snap = await db
      .collection('adeverinte_emise')
      .where('numarIesire', '==', nr)
      .where('cod', '==', cod)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ valid: false });
    }

    const data = snap.docs[0].data();
    return NextResponse.json({
      valid: data.activa === true,
      numarIesire: data.numarIesire,
      tipLabel: data.tipLabel,
      emisLa: data.emisLa?.toDate?.()?.toISOString() || null,
      numeMascat: maskName(data.numeComplet || ''),
    });
  } catch (error) {
    console.error('[verifica] Error:', error);
    return NextResponse.json({ valid: false, error: 'Eroare internă' }, { status: 500 });
  }
}
