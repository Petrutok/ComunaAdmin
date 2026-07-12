import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { sendPushToUid } from '@/lib/push';

/**
 * Notifies a staff member that a document was assigned to them.
 * Push only, by design: assignments are frequent enough that emails
 * would become noise, and the daily deadline digest already covers
 * anyone who does not open the admin panel. Called by the admin UI
 * right after saving an assignment; best-effort.
 */

const ALLOWED_COLLECTIONS = ['form_submissions', 'registratura_emails'] as const;
type AssignableCollection = (typeof ALLOWED_COLLECTIONS)[number];

export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { collection, docId, assignedToUserId } = await request.json();

    if (!ALLOWED_COLLECTIONS.includes(collection) || !docId || !assignedToUserId) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection, docId or assignedToUserId' },
        { status: 400 }
      );
    }

    // Assigning to yourself needs no notification
    if (assignedToUserId === auth.uid) {
      return NextResponse.json({ success: true, push: 0, skipped: 'self-assignment' });
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    const docSnap = await db.collection(collection as AssignableCollection).doc(docId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    const data = docSnap.data()!;

    const isCerere = collection === 'form_submissions';
    const reference = data.numarInregistrare || (isCerere ? 'o cerere' : 'un email');
    const detail = isCerere
      ? data.tipCerere || ''
      : data.subject || '';

    const push = await sendPushToUid(db, assignedToUserId, {
      title: isCerere ? 'Cerere repartizată ție' : 'Email repartizat ție',
      body: `${reference}${detail ? ` — ${String(detail).slice(0, 80)}` : ''}`,
      url: isCerere ? '/admin/cereri' : '/admin/registratura',
      tag: `assign-${docId}`,
    });

    return NextResponse.json({ success: true, push });
  } catch (error) {
    console.error('[notify-assignment] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
