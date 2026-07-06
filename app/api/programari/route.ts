import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { SERVICE_CONFIG, TIME_SLOTS, slotDocId } from '@/types/appointments';

/**
 * Online appointments API.
 *
 * GET  ?service=...&date=YYYY-MM-DD  -> taken slot times (no personal data)
 * POST { service, date, time, telefon, motiv? }  -> book (citizen token required)
 * PATCH { id, action: 'cancel' }  -> citizen cancels their own appointment
 *
 * One Firestore doc per slot (deterministic ID), so double-booking fails
 * atomically at create() time.
 */

async function requireCitizen(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;
  try {
    return await adminAuth.verifyIdToken(authHeader.slice('Bearer '.length));
  } catch {
    return null;
  }
}

function isValidBookingTarget(service: string, date: string, time: string): boolean {
  if (!(service in SERVICE_CONFIG)) return false;
  if (!TIME_SLOTS.includes(time)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const day = new Date(`${date}T00:00:00`);
  if (isNaN(day.getTime())) return false;
  const dow = day.getDay();
  if (dow === 0 || dow === 6) return false; // weekend

  // Between tomorrow and 30 days out
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (day.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 1 && diffDays <= 30;
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(`programari-get:${getClientIp(request)}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const service = request.nextUrl.searchParams.get('service') || '';
  const date = request.nextUrl.searchParams.get('date') || '';
  if (!(service in SERVICE_CONFIG) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const snap = await db
    .collection('appointments')
    .where('service', '==', service)
    .where('date', '==', date)
    .where('status', '==', 'confirmata')
    .get();

  return NextResponse.json({
    takenSlots: snap.docs.map((d) => d.data().time),
  });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`programari-post:${getClientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Prea multe încercări. Reveniți mai târziu.' },
      { status: 429 }
    );
  }

  const citizen = await requireCitizen(request);
  if (!citizen) {
    return NextResponse.json(
      { success: false, error: 'Autentificare necesară pentru programare' },
      { status: 401 }
    );
  }

  try {
    const { service, date, time, telefon, motiv } = await request.json();

    if (!isValidBookingTarget(service, date, time)) {
      return NextResponse.json(
        { success: false, error: 'Interval de programare invalid' },
        { status: 400 }
      );
    }
    if (!telefon || !/^[\d\s\-\+()]{7,}$/.test(telefon)) {
      return NextResponse.json(
        { success: false, error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error('Firebase Admin not initialized');

    // One active appointment per citizen per service (anti-hoarding)
    const existing = await db
      .collection('appointments')
      .where('citizenUid', '==', citizen.uid)
      .where('service', '==', service)
      .where('status', '==', 'confirmata')
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: 'Ai deja o programare activă la acest serviciu. Anuleaz-o întâi din Dosarul meu.' },
        { status: 409 }
      );
    }

    const profileSnap = await db.collection('citizens').doc(citizen.uid).get();
    const nume = profileSnap.data()?.numeComplet || citizen.name || citizen.email || 'Cetățean';

    // Atomic booking: create() throws ALREADY_EXISTS if the slot doc exists
    const docRef = db.collection('appointments').doc(slotDocId(service, date, time));
    try {
      await docRef.create({
        service,
        date,
        time,
        citizenUid: citizen.uid,
        nume,
        telefon: String(telefon).trim(),
        email: citizen.email || null,
        motiv: (motiv || '').toString().slice(0, 500),
        status: 'confirmata',
        createdAt: Timestamp.now(),
      });
    } catch (error: any) {
      if (error?.code === 6 /* ALREADY_EXISTS */) {
        return NextResponse.json(
          { success: false, error: 'Intervalul tocmai a fost ocupat. Alege altul.' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('[programari] Booking error:', error);
    return NextResponse.json(
      { success: false, error: 'Programarea a eșuat. Încercați din nou.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const citizen = await requireCitizen(request);
  if (!citizen) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, action } = await request.json();
    if (!id || action !== 'cancel') {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error('Firebase Admin not initialized');

    const docRef = db.collection('appointments').doc(String(id));
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.citizenUid !== citizen.uid) {
      return NextResponse.json({ success: false, error: 'Programarea nu există' }, { status: 404 });
    }
    if (snap.data()?.status !== 'confirmata') {
      return NextResponse.json({ success: false, error: 'Programarea nu mai este activă' }, { status: 409 });
    }

    // Delete rather than mark: frees the deterministic slot ID for rebooking
    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[programari] Cancel error:', error);
    return NextResponse.json({ success: false, error: 'Anularea a eșuat' }, { status: 500 });
  }
}
