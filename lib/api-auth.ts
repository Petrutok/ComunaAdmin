// lib/api-auth.ts
// Server-side authentication for API routes.
// Verifies the Firebase ID token from the Authorization header and checks
// the user's role in the `users` collection (same source used by AdminAuthContext).

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { UserRole } from '@/types/departments';

export interface AuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Verifies that the request comes from an authenticated staff user.
 *
 * @param request - incoming request; must carry `Authorization: Bearer <Firebase ID token>`
 * @param allowedRoles - roles accepted for this endpoint (default: admin only)
 */
export async function verifyStaffRequest(
  request: NextRequest,
  allowedRoles: UserRole[] = ['admin']
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    // Fail closed: without Admin SDK we cannot verify anyone.
    return { authorized: false, error: 'Auth service unavailable' };
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const decoded = await adminAuth.verifyIdToken(token);

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();

    if (!userDoc.exists || !userData?.active || !userData?.role) {
      return { authorized: false, uid: decoded.uid, error: 'User is not active staff' };
    }

    const role = userData.role as UserRole;
    if (!allowedRoles.includes(role)) {
      return { authorized: false, uid: decoded.uid, role, error: 'Insufficient role' };
    }

    return { authorized: true, uid: decoded.uid, email: decoded.email, role };
  } catch (error) {
    console.error('[api-auth] Token verification failed:', error);
    return { authorized: false, error: 'Invalid or expired token' };
  }
}

/**
 * Optional citizen identification for public endpoints.
 *
 * Returns the verified uid when the request carries a valid Firebase ID
 * token, or null otherwise (anonymous submissions stay allowed). Never trust
 * a uid sent in the request body - it can be forged; only this verified
 * value may be persisted.
 */
export async function getOptionalCitizenUid(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    // Invalid/expired token: treat as anonymous rather than failing the submission
    return null;
  }
}
