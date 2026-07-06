/**
 * generateRegistruNumberAdmin.ts
 *
 * Server-side (Admin SDK) variant of lib/utils/generateRegistruNumber.ts.
 * Uses the same counter documents (registru_counters/{year}) and the same
 * "REG-YYYY-NNNNNN" format, so numbers issued here are sequential with the
 * ones issued from the admin panel's manual registry.
 *
 * Note: the email registratura uses a separate counter
 * (config/registratura_counter) with the same REG- prefix - a known overlap,
 * to be resolved when the two registries are unified.
 */

import { getAdminDb } from '@/lib/firebase-admin';

const COUNTERS_COLLECTION = 'registru_counters';

export async function generateRegistruNumberAdmin(): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  return db.runTransaction(async (transaction) => {
    const currentYear = new Date().getFullYear();
    const counterRef = db.collection(COUNTERS_COLLECTION).doc(currentYear.toString());

    const counterDoc = await transaction.get(counterRef);

    let lastNumber = 0;
    if (counterDoc.exists) {
      lastNumber = counterDoc.data()?.lastNumber || 0;
    }

    const newNumber = lastNumber + 1;
    const paddedNumber = String(newNumber).padStart(6, '0');
    const registrationNumber = `REG-${currentYear}-${paddedNumber}`;

    transaction.set(counterRef, {
      year: currentYear,
      lastNumber: newNumber,
    });

    return registrationNumber;
  });
}
