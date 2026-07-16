import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';

/**
 * Staff onboarding (admin only).
 *
 * Creating a staff member from the admin UI must produce two things that the
 * rest of the app depends on:
 *   1. a Firebase Auth account (so the person can actually sign in), and
 *   2. a `users/{uid}` document keyed by the REAL Auth uid - both
 *      AdminAuthContext (getUserRole) and verifyStaffRequest look the user up
 *      by `doc(users, auth.uid)`.
 *
 * The old client-only flow wrote a doc keyed by a mangled email and created no
 * Auth account, so the new user could never log in. This route fixes that: it
 * creates (or reuses) the Auth account and writes the doc keyed by uid. The
 * client then sends a password-reset email so the new user sets their own
 * password.
 */

type Role = 'admin' | 'employee';

export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const role = body.role as Role;
    const departmentId = body.departmentId ? String(body.departmentId) : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Adresă de email invalidă.' }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ success: false, error: 'Numele este obligatoriu.' }, { status: 400 });
    }
    if (role !== 'admin' && role !== 'employee') {
      return NextResponse.json({ success: false, error: 'Rol invalid.' }, { status: 400 });
    }

    // Reuse an existing Auth account if the email already has one (the person
    // may already be a citizen), otherwise create it with a throwaway password
    // - the new user sets their real password via the reset email.
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await adminAuth.createUser({
        email,
        emailVerified: false,
        displayName: fullName,
        password: randomBytes(24).toString('hex'),
      });
      uid = created.uid;
    }

    // Refuse to silently overwrite an existing staff doc.
    const existingDoc = await adminDb.collection('users').doc(uid).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Există deja un utilizator cu acest email.' },
        { status: 409 }
      );
    }

    await adminDb.collection('users').doc(uid).set({
      email,
      fullName,
      role,
      departmentId,
      active: true,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, uid });
  } catch (error) {
    console.error('[api/admin/users] create failed:', error);
    return NextResponse.json(
      { success: false, error: 'Nu s-a putut crea utilizatorul.' },
      { status: 500 }
    );
  }
}
