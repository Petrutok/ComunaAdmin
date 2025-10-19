/**
 * generateRegistrationNumber.ts
 *
 * Utility function for generating unique, sequential registration numbers
 * for the electronic registry (registratură) system.
 *
 * Format: REG-YYYY-NNNNNN
 * Example: REG-2025-000123
 *
 * Features:
 * - Thread-safe using Firestore transactions
 * - Year-based counter with automatic reset
 * - Zero-padded 6-digit sequential numbers
 * - Retry logic for transient failures
 * - Comprehensive error handling
 */

import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RegistraturaCounter } from '@/types/registratura';

// Firestore path for the counter document
const COUNTER_DOC_PATH = 'config/registratura_counter';

// Configuration
const DEFAULT_PADDING = 6; // Number of digits to pad (e.g., 000001)
const MAX_RETRIES = 3; // Maximum number of retry attempts
const RETRY_DELAY_MS = 100; // Delay between retries

/**
 * Options for registration number generation
 */
interface GenerateOptions {
  /**
   * Number of digits to pad the counter (default: 6)
   * Example: 6 produces "000123", 4 produces "0123"
   */
  padding?: number;

  /**
   * Prefix for the registration number (default: "REG")
   * Example: "DOC" produces "DOC-2025-000123"
   */
  prefix?: string;

  /**
   * Custom year (default: current year)
   * Useful for testing or backdating documents
   */
  year?: number;
}

/**
 * Generates a unique registration number using Firestore transactions
 * to ensure concurrency safety.
 *
 * The function uses a year-based counter stored in Firestore at
 * `config/registratura_counter` with the following structure:
 * {
 *   year: number,
 *   lastNumber: number,
 *   updatedAt: Timestamp
 * }
 *
 * @param options - Optional configuration for number generation
 * @returns Promise<string> - The generated registration number (e.g., "REG-2025-000123")
 *
 * @throws Error if:
 * - Firestore transaction fails after retries
 * - Database connection is unavailable
 * - Invalid options are provided
 *
 * @example
 * // Generate standard registration number
 * const regNumber = await generateRegistrationNumber();
 * // Returns: "REG-2025-000123"
 *
 * @example
 * // Generate with custom prefix and padding
 * const docNumber = await generateRegistrationNumber({
 *   prefix: 'DOC',
 *   padding: 4
 * });
 * // Returns: "DOC-2025-0123"
 *
 * @example
 * // Generate for specific year (testing/backdating)
 * const oldNumber = await generateRegistrationNumber({
 *   year: 2024
 * });
 * // Returns: "REG-2024-000001"
 */
export async function generateRegistrationNumber(
  options: GenerateOptions = {}
): Promise<string> {
  const {
    padding = DEFAULT_PADDING,
    prefix = 'REG',
    year = new Date().getFullYear(),
  } = options;

  // Validate options
  if (padding < 1 || padding > 10) {
    throw new Error('Padding must be between 1 and 10 digits');
  }

  if (!prefix || prefix.length === 0) {
    throw new Error('Prefix cannot be empty');
  }

  if (year < 2000 || year > 2100) {
    throw new Error('Year must be between 2000 and 2100');
  }

  // Attempt generation with retry logic
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateWithTransaction(year, padding, prefix);
    } catch (error) {
      lastError = error as Error;

      console.warn(
        `[REG-NUMBER] Generation attempt ${attempt}/${MAX_RETRIES} failed:`,
        error
      );

      // Don't retry on validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to generate registration number after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Internal function that performs the actual transaction
 *
 * @private
 */
async function generateWithTransaction(
  year: number,
  padding: number,
  prefix: string
): Promise<string> {
  try {
    const registrationNumber = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, COUNTER_DOC_PATH);
      const counterDoc = await transaction.get(counterRef);

      let nextNumber = 1;

      if (counterDoc.exists()) {
        const data = counterDoc.data() as RegistraturaCounter;

        // Validate counter data
        if (typeof data.year !== 'number' || typeof data.lastNumber !== 'number') {
          throw new ValidationError('Invalid counter document structure');
        }

        if (data.year === year) {
          // Same year - increment counter
          nextNumber = data.lastNumber + 1;

          // Safety check: prevent counter overflow
          if (nextNumber > 999999) {
            throw new ValidationError(
              `Counter overflow for year ${year}. Maximum documents reached.`
            );
          }
        } else {
          // New year - reset counter
          nextNumber = 1;
          console.log(
            `[REG-NUMBER] New year detected: ${data.year} -> ${year}. Resetting counter.`
          );
        }
      } else {
        // First time setup
        console.log(`[REG-NUMBER] Initializing counter for year ${year}`);
      }

      // Update counter in Firestore
      transaction.set(counterRef, {
        year,
        lastNumber: nextNumber,
        updatedAt: Timestamp.now(),
      });

      // Format the registration number
      const paddedNumber = String(nextNumber).padStart(padding, '0');
      return `${prefix}-${year}-${paddedNumber}`;
    });

    console.log(`[REG-NUMBER] Generated: ${registrationNumber}`);
    return registrationNumber;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(
      `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Custom error class for validation errors
 * These should not be retried
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sleep utility for retry delays
 *
 * @private
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Utility function to get the current counter value without incrementing
 * Useful for monitoring and debugging
 *
 * @returns Promise<RegistraturaCounter | null> - Current counter state or null if not initialized
 *
 * @example
 * const counter = await getCurrentCounter();
 * console.log(`Current year: ${counter?.year}, Last number: ${counter?.lastNumber}`);
 */
export async function getCurrentCounter(): Promise<RegistraturaCounter | null> {
  try {
    const counterRef = doc(db, COUNTER_DOC_PATH);
    const counterSnap = await runTransaction(db, async (transaction) => {
      return transaction.get(counterRef);
    });

    if (!counterSnap.exists()) {
      return null;
    }

    return counterSnap.data() as RegistraturaCounter;
  } catch (error) {
    console.error('[REG-NUMBER] Failed to get current counter:', error);
    throw new Error(
      `Failed to retrieve counter: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Resets the counter for a specific year
 * WARNING: Use with caution! This will reset the counter and may cause duplicate numbers.
 *
 * @param year - The year to reset (default: current year)
 * @param startNumber - The number to start from (default: 0)
 *
 * @example
 * // Reset current year to start from 1
 * await resetCounter();
 *
 * @example
 * // Reset and start from a specific number
 * await resetCounter(2025, 100);
 */
export async function resetCounter(
  year: number = new Date().getFullYear(),
  startNumber: number = 0
): Promise<void> {
  if (startNumber < 0 || startNumber > 999999) {
    throw new Error('Start number must be between 0 and 999999');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, COUNTER_DOC_PATH);

      transaction.set(counterRef, {
        year,
        lastNumber: startNumber,
        updatedAt: Timestamp.now(),
      });
    });

    console.log(`[REG-NUMBER] Counter reset for year ${year} to ${startNumber}`);
  } catch (error) {
    throw new Error(
      `Failed to reset counter: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Preview what the next registration number will be without actually generating it
 * Useful for displaying to users before confirmation
 *
 * @param options - Optional configuration matching generateRegistrationNumber
 * @returns Promise<string> - The next registration number that would be generated
 *
 * @example
 * const nextNumber = await previewNextNumber();
 * console.log(`Next registration number will be: ${nextNumber}`);
 */
export async function previewNextNumber(
  options: GenerateOptions = {}
): Promise<string> {
  const {
    padding = DEFAULT_PADDING,
    prefix = 'REG',
    year = new Date().getFullYear(),
  } = options;

  const counter = await getCurrentCounter();

  let nextNumber = 1;
  if (counter && counter.year === year) {
    nextNumber = counter.lastNumber + 1;
  }

  const paddedNumber = String(nextNumber).padStart(padding, '0');
  return `${prefix}-${year}-${paddedNumber}`;
}

// Export types for convenience
export type { GenerateOptions, RegistraturaCounter };
