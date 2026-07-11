import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { getOptionalCitizenUid } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateAndDecodeFiles } from '@/lib/cereri-files';

/**
 * A citizen adds the documents requested by the clerk on a cerere marked
 * "necesita_completare" (from Dosarul meu):
 * 1. verifies the cerere belongs to the signed-in citizen
 * 2. uploads the files next to the original attachments in Storage
 * 3. moves the cerere back to "in_lucru"
 * 4. restarts the 30-day legal deadline on the registry entry (the
 *    OG 27/2002 term runs from the date the petition is complete)
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`completeaza-cerere:${getClientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Prea multe încercări. Încercați din nou mai târziu.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    // Only the owner of the cerere may add documents to it
    const citizenUid = await getOptionalCitizenUid(request);
    if (!citizenUid) {
      return NextResponse.json(
        { success: false, error: 'Autentificare necesară' },
        { status: 401 }
      );
    }

    const { cerereId, fisiere } = await request.json();
    if (!cerereId) {
      return NextResponse.json(
        { success: false, error: 'Missing cerereId' },
        { status: 400 }
      );
    }

    const decodeResult = validateAndDecodeFiles(fisiere);
    if (!decodeResult.ok) {
      return NextResponse.json(
        { success: false, error: decodeResult.error },
        { status: decodeResult.status }
      );
    }
    if (decodeResult.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Atașați cel puțin un document' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const bucket = getAdminBucket();
    if (!db || !bucket) {
      throw new Error('Firebase Admin not initialized');
    }

    const cerereRef = db.collection('form_submissions').doc(cerereId);
    const cerereSnap = await cerereRef.get();
    if (!cerereSnap.exists) {
      return NextResponse.json({ success: false, error: 'Cerere not found' }, { status: 404 });
    }
    const cerere = cerereSnap.data()!;

    if (cerere.citizenUid !== citizenUid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (cerere.status !== 'necesita_completare') {
      return NextResponse.json(
        { success: false, error: 'Cererea nu așteaptă documente suplimentare' },
        { status: 409 }
      );
    }

    // --- Upload next to the original attachments
    const ts = Date.now();
    const uploaded = await Promise.all(
      decodeResult.files.map(async (f, i) => {
        const storagePath = `cereri/${cerereId}/completare_${ts}_${i + 1}_${f.name}`;
        await bucket.file(storagePath).save(f.buffer, { contentType: f.type });
        return { name: f.name, type: f.type, size: f.buffer.length, storagePath };
      })
    );

    // --- Back to processing, with the new files appended
    await cerereRef.update({
      fisiere: [...(Array.isArray(cerere.fisiere) ? cerere.fisiere : []), ...uploaded],
      status: 'in_lucru',
      completatLa: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // --- Restart the legal deadline: the petition is complete only now
    if (cerere.registruDocId) {
      await db
        .collection('registru_general')
        .doc(cerere.registruDocId)
        .update({
          status: 'in_lucru',
          termen: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: Timestamp.now(),
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, fisiere: uploaded.length });
  } catch (error) {
    console.error('[completeaza-cerere] Error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
