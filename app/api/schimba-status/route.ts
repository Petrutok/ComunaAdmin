import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import {
  notifyCitizenStatusChange,
  NotifiableCollection,
  STATUS_LABELS,
} from '@/lib/notify-status';

/**
 * Single persistent event for a staff status change on a cerere or
 * sesizare. Replaces the old client-side sequence (updateDoc + registry
 * sync + audit log + separate notify fetch) whose notification was lost
 * if the clerk closed the tab. Here the update, the registry sync, the
 * audit entry and the citizen notification happen server-side in one
 * request: if the change is applied, the notification goes out.
 */

const CERERE_STATUSES = [
  'noua',
  'in_lucru',
  'necesita_completare',
  'prelungit',
  'redirectionat',
  'rezolvat',
  'respins',
  'clasat',
] as const;

const ISSUE_STATUSES = ['noua', 'in_lucru', 'rezolvata', 'respinsa'] as const;

// Registry sync mirrors the legal semantics previously implemented
// client-side in the cereri page (OG 27/2002):
// - prelungit: +15 days on the legal deadline (art. 9)
// - necesita_completare: deadline suspended until the citizen completes
// - closed statuses: finalize the registry entry
async function syncRegistruWithStatus(
  db: FirebaseFirestore.Firestore,
  registruDocId: string | undefined,
  status: string
) {
  if (!registruDocId) return;
  const registruRef = db.collection('registru_general').doc(registruDocId);
  try {
    if (status === 'prelungit') {
      const snap = await registruRef.get();
      const termenActual = snap.exists ? snap.data()?.termen || null : null;
      const baza = termenActual?.toMillis?.() || Date.now() + 30 * 24 * 60 * 60 * 1000;
      await registruRef.update({
        termen: Timestamp.fromMillis(baza + 15 * 24 * 60 * 60 * 1000),
        status: 'in_lucru',
        updatedAt: Timestamp.now(),
      });
    } else if (status === 'necesita_completare') {
      await registruRef.update({
        termen: null,
        status: 'in_lucru',
        updatedAt: Timestamp.now(),
      });
    } else if (['rezolvat', 'respins', 'redirectionat', 'clasat'].includes(status)) {
      await registruRef.update({ status: 'finalizat', updatedAt: Timestamp.now() });
    } else if (status === 'in_lucru') {
      await registruRef.update({ status: 'in_lucru', updatedAt: Timestamp.now() });
    }
  } catch (error) {
    // best effort: the status change must not fail because of the registry
    console.error('[schimba-status] Error syncing registru entry:', error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { collection, docId, newStatus, observatii, redirectionatCatre } = await request.json();

    const isCerere = collection === 'form_submissions';
    const isIssue = collection === 'reported_issues';
    if ((!isCerere && !isIssue) || !docId || !newStatus) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection, docId or newStatus' },
        { status: 400 }
      );
    }
    const validStatuses: readonly string[] = isCerere ? CERERE_STATUSES : ISSUE_STATUSES;
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Status invalid pentru ${collection}: ${newStatus}` },
        { status: 400 }
      );
    }
    if (isCerere && newStatus === 'redirectionat' && !redirectionatCatre?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Completează instituția către care a fost redirecționată cererea' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    const docRef = db.collection(collection as NotifiableCollection).doc(docId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    const data = snap.data()!;
    const oldStatus = data.status || 'noua';

    // --- 1. The update itself
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };
    if (isCerere) {
      if (newStatus === 'redirectionat') {
        updateData.redirectionatCatre = redirectionatCatre.trim();
      }
      const finalObservatii = observatii?.trim() || data.observatii || '';
      if (finalObservatii) {
        updateData.observatii = finalObservatii;
      }
    }
    if (isIssue && newStatus === 'rezolvata') {
      updateData.resolvedAt = Timestamp.now();
    }
    await docRef.update(updateData);

    // --- 2. Registry sync (cereri only) - best effort
    if (isCerere) {
      await syncRegistruWithStatus(db, data.registruDocId, newStatus);
    }

    // --- 3. Audit trail (cereri only, same subcollection as before) - best effort
    if (isCerere) {
      try {
        const actorSnap = await db.collection('users').doc(auth.uid!).get();
        const actorNume = actorSnap.data()?.fullName || auth.email || 'Staff';
        await docRef.collection('istoric').add({
          tip: 'status',
          mesaj:
            `Status: ${STATUS_LABELS[oldStatus] || oldStatus} → ${STATUS_LABELS[newStatus] || newStatus}` +
            (newStatus === 'redirectionat' && redirectionatCatre?.trim()
              ? ` (către ${redirectionatCatre.trim()})`
              : '') +
            (observatii?.trim() ? ` · ${observatii.trim()}` : ''),
          autorId: auth.uid || 'sistem',
          autorNume: actorNume,
          createdAt: Timestamp.now(),
        });
      } catch (error) {
        console.error('[schimba-status] Error writing istoric:', error);
      }
    }

    // --- 4. Citizen notification (push + email) - guaranteed to be
    // attempted because it runs here, not in the clerk's browser
    const notified = await notifyCitizenStatusChange(db, {
      collection,
      docId,
      newStatus,
    }).catch((error) => {
      console.error('[schimba-status] Notification failed:', error);
      return { push: 0, email: false };
    });

    return NextResponse.json({ success: true, ...notified });
  } catch (error) {
    console.error('[schimba-status] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
