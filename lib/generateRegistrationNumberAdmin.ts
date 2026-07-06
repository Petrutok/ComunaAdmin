/**
 * generateRegistrationNumberAdmin.ts
 *
 * Server-side variant of generateRegistrationNumber using the Firebase Admin
 * SDK. API routes must use this one: the client-SDK variant runs
 * unauthenticated on the server, which would require open Firestore rules on
 * the counter document.
 *
 * Format: PREFIX-YYYY-NNNNNN (same as the client variant).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

const COUNTER_DOC_PATH = 'config/registratura_counter';
const DEFAULT_PADDING = 6;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

interface GenerateOptions {
  padding?: number;
  prefix?: string;
  year?: number;
}

export async function generateRegistrationNumberAdmin(
  options: GenerateOptions = {}
): Promise<string> {
  const {
    padding = DEFAULT_PADDING,
    prefix = 'REG',
    year = new Date().getFullYear(),
  } = options;

  const db = getAdminDb();
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await db.runTransaction(async (transaction) => {
        const counterRef = db.doc(COUNTER_DOC_PATH);
        const counterDoc = await transaction.get(counterRef);

        let nextNumber = 1;

        if (counterDoc.exists) {
          const data = counterDoc.data() as { year: number; lastNumber: number };
          if (data.year === year) {
            nextNumber = data.lastNumber + 1;
            if (nextNumber > 999999) {
              throw new Error(`Counter overflow for year ${year}`);
            }
          }
          // Different year: counter resets to 1
        }

        transaction.set(counterRef, {
          year,
          lastNumber: nextNumber,
          updatedAt: Timestamp.now(),
        });

        const paddedNumber = String(nextNumber).padStart(padding, '0');
        return `${prefix}-${year}-${paddedNumber}`;
      });
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw new Error(
    `Failed to generate registration number after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}
