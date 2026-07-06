import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

/**
 * Generates a unique registration number in the format "REG-YYYY-NNNNNN"
 * Uses Firestore transactions to handle race conditions
 * @returns Promise<string> - The generated registration number
 */
export async function generateRegistruNumber(): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const currentYear = new Date().getFullYear();
    const counterDocRef = doc(
      collection(db, COLLECTIONS.REGISTRU_COUNTERS),
      currentYear.toString()
    );

    // Get current counter
    const counterDoc = await transaction.get(counterDocRef);

    let lastNumber = 0;
    if (counterDoc.exists()) {
      lastNumber = counterDoc.data().lastNumber || 0;
    }

    // Increment counter
    const newNumber = lastNumber + 1;
    const paddedNumber = String(newNumber).padStart(6, '0');
    const registrationNumber = `REG-${currentYear}-${paddedNumber}`;

    // Update counter in transaction
    if (counterDoc.exists()) {
      transaction.update(counterDocRef, { lastNumber: newNumber });
    } else {
      transaction.set(counterDocRef, {
        year: currentYear,
        lastNumber: newNumber,
      });
    }

    return registrationNumber;
  });
}

/**
 * Generates multiple registration numbers
 * Useful for batch operations
 * @param count - Number of registration numbers to generate
 * @returns Promise<string[]> - Array of generated registration numbers
 */
export async function generateMultipleRegistruNumbers(count: number): Promise<string[]> {
  const numbers: string[] = [];
  for (let i = 0; i < count; i++) {
    const number = await generateRegistruNumber();
    numbers.push(number);
  }
  return numbers;
}

/**
 * Checks if a registration number already exists
 * @param numarInregistrare - The registration number to check
 * @returns Promise<boolean> - True if exists, false otherwise
 */
export async function registrationNumberExists(numarInregistrare: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REGISTRU_GENERAL),
      where('numarInregistrare', '==', numarInregistrare),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking registration number:', error);
    return false;
  }
}

/**
 * Gets the last registration number for a given year
 * @param year - The year to query (default: current year)
 * @returns Promise<number> - The last sequential number, or 0 if none exist
 */
export async function getLastRegistrationNumber(year?: number): Promise<number> {
  try {
    const queryYear = year || new Date().getFullYear();
    const counterDocRef = doc(
      collection(db, COLLECTIONS.REGISTRU_COUNTERS),
      queryYear.toString()
    );

    const counterDoc = await getDoc(counterDocRef);
    if (counterDoc.exists()) {
      return counterDoc.data().lastNumber || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting last registration number:', error);
    return 0;
  }
}

/**
 * Formats a registration number for display
 * @param number - The registration number
 * @returns string - Formatted number with better spacing
 */
export function formatRegistrationNumber(number: string): string {
  // Already formatted correctly, just return as-is
  return number;
}
