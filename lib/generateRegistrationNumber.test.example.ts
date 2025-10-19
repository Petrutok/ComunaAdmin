/**
 * generateRegistrationNumber - Usage Examples and Tests
 *
 * This file demonstrates how to use the registration number generator
 * in various scenarios. Copy these examples to your test files or
 * use them as reference for implementation.
 */

import {
  generateRegistrationNumber,
  getCurrentCounter,
  previewNextNumber,
  resetCounter,
  type GenerateOptions,
} from './generateRegistrationNumber';

/**
 * EXAMPLE 1: Basic Usage
 * Generate a standard registration number
 */
async function example1_BasicUsage() {
  console.log('=== Example 1: Basic Usage ===');

  const regNumber = await generateRegistrationNumber();
  console.log('Generated:', regNumber);
  // Output: "REG-2025-000001" (first call)
  // Output: "REG-2025-000002" (second call)
}

/**
 * EXAMPLE 2: Custom Prefix
 * Use a different prefix for different document types
 */
async function example2_CustomPrefix() {
  console.log('\n=== Example 2: Custom Prefix ===');

  const options: GenerateOptions = {
    prefix: 'DOC',
  };

  const docNumber = await generateRegistrationNumber(options);
  console.log('Document Number:', docNumber);
  // Output: "DOC-2025-000001"
}

/**
 * EXAMPLE 3: Custom Padding
 * Change the number of digits
 */
async function example3_CustomPadding() {
  console.log('\n=== Example 3: Custom Padding ===');

  // 4-digit counter
  const shortNumber = await generateRegistrationNumber({
    padding: 4,
  });
  console.log('Short format:', shortNumber);
  // Output: "REG-2025-0001"

  // 8-digit counter
  const longNumber = await generateRegistrationNumber({
    padding: 8,
  });
  console.log('Long format:', longNumber);
  // Output: "REG-2025-00000002"
}

/**
 * EXAMPLE 4: Specific Year (Backdating)
 * Generate numbers for a specific year
 */
async function example4_SpecificYear() {
  console.log('\n=== Example 4: Specific Year ===');

  const oldDoc = await generateRegistrationNumber({
    year: 2024,
  });
  console.log('2024 Document:', oldDoc);
  // Output: "REG-2024-000001"
}

/**
 * EXAMPLE 5: Combined Options
 * Use multiple options together
 */
async function example5_CombinedOptions() {
  console.log('\n=== Example 5: Combined Options ===');

  const customNumber = await generateRegistrationNumber({
    prefix: 'INV',
    padding: 5,
    year: 2025,
  });
  console.log('Invoice Number:', customNumber);
  // Output: "INV-2025-00001"
}

/**
 * EXAMPLE 6: Check Current Counter
 * View the current state without generating a number
 */
async function example6_CheckCounter() {
  console.log('\n=== Example 6: Check Current Counter ===');

  const counter = await getCurrentCounter();

  if (counter) {
    console.log('Current Year:', counter.year);
    console.log('Last Number:', counter.lastNumber);
    console.log('Updated At:', counter.updatedAt.toDate());
  } else {
    console.log('Counter not initialized yet');
  }
}

/**
 * EXAMPLE 7: Preview Next Number
 * See what the next number will be without generating it
 */
async function example7_PreviewNext() {
  console.log('\n=== Example 7: Preview Next Number ===');

  const nextNumber = await previewNextNumber();
  console.log('Next number will be:', nextNumber);

  // With custom options
  const nextCustom = await previewNextNumber({
    prefix: 'ORDER',
    padding: 4,
  });
  console.log('Next custom number will be:', nextCustom);
}

/**
 * EXAMPLE 8: Error Handling
 * Proper error handling for production code
 */
async function example8_ErrorHandling() {
  console.log('\n=== Example 8: Error Handling ===');

  try {
    const regNumber = await generateRegistrationNumber();
    console.log('Success:', regNumber);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to generate registration number:', error.message);

      // Handle specific errors
      if (error.message.includes('overflow')) {
        console.error('Counter has reached maximum for this year!');
      } else if (error.message.includes('Transaction failed')) {
        console.error('Database transaction failed. Please retry.');
      }
    }
  }
}

/**
 * EXAMPLE 9: Concurrent Generation
 * Multiple calls in parallel (transaction-safe)
 */
async function example9_ConcurrentGeneration() {
  console.log('\n=== Example 9: Concurrent Generation ===');

  const promises = Array.from({ length: 5 }, () =>
    generateRegistrationNumber()
  );

  const numbers = await Promise.all(promises);
  console.log('Generated 5 numbers concurrently:');
  numbers.forEach((num, i) => console.log(`  ${i + 1}. ${num}`));
  // Output will have sequential numbers despite concurrent calls
  // REG-2025-000001
  // REG-2025-000002
  // REG-2025-000003
  // REG-2025-000004
  // REG-2025-000005
}

/**
 * EXAMPLE 10: Integration with Email Fetch
 * How to use in the fetch-emails API
 */
async function example10_EmailFetchIntegration() {
  console.log('\n=== Example 10: Email Fetch Integration ===');

  // In your fetch-emails route:
  // import { generateRegistrationNumber } from '@/lib/generateRegistrationNumber';

  // For each new email
  try {
    const regNumber = await generateRegistrationNumber();

    // Use the registration number
    console.log('Registering email with number:', regNumber);

    // Save to Firestore with this number
    // await saveEmailToFirestore({ numarInregistrare: regNumber, ... });
  } catch (error) {
    console.error('Failed to generate registration number for email');
    throw error;
  }
}

/**
 * EXAMPLE 11: Manual Registration Form
 * Use in a manual document registration interface
 */
async function example11_ManualRegistration() {
  console.log('\n=== Example 11: Manual Registration ===');

  // Step 1: Preview the number for the user
  const preview = await previewNextNumber();
  console.log('The document will be registered as:', preview);

  // Step 2: User confirms, generate the actual number
  // (This ensures the number matches what they saw)
  const confirmed = true; // User clicked "Confirm"

  if (confirmed) {
    const regNumber = await generateRegistrationNumber();
    console.log('Document registered:', regNumber);

    // Note: The number might differ from preview if another
    // registration happened between preview and confirmation
  }
}

/**
 * EXAMPLE 12: Different Document Types
 * Use different prefixes for different document categories
 */
async function example12_DocumentTypes() {
  console.log('\n=== Example 12: Document Types ===');

  const documentTypes = {
    incoming: 'REG-IN',
    outgoing: 'REG-OUT',
    internal: 'REG-INT',
    contract: 'CTR',
    invoice: 'INV',
  };

  // Generate numbers for different types
  const incomingDoc = await generateRegistrationNumber({
    prefix: documentTypes.incoming,
  });
  console.log('Incoming:', incomingDoc);

  const contractDoc = await generateRegistrationNumber({
    prefix: documentTypes.contract,
    padding: 5,
  });
  console.log('Contract:', contractDoc);
}

/**
 * EXAMPLE 13: Year Rollover Scenario
 * What happens on New Year's Day
 */
async function example13_YearRollover() {
  console.log('\n=== Example 13: Year Rollover ===');

  // December 31, 2024
  const lastDoc2024 = await generateRegistrationNumber({
    year: 2024,
  });
  console.log('Last doc of 2024:', lastDoc2024);
  // Output: "REG-2024-000123" (example)

  // January 1, 2025 - counter resets
  const firstDoc2025 = await generateRegistrationNumber({
    year: 2025,
  });
  console.log('First doc of 2025:', firstDoc2025);
  // Output: "REG-2025-000001" (starts from 1)
}

/**
 * EXAMPLE 14: Batch Generation
 * Generate multiple numbers for batch processing
 */
async function example14_BatchGeneration() {
  console.log('\n=== Example 14: Batch Generation ===');

  const batchSize = 10;
  const registrationNumbers: string[] = [];

  for (let i = 0; i < batchSize; i++) {
    const regNumber = await generateRegistrationNumber();
    registrationNumbers.push(regNumber);
  }

  console.log(`Generated ${batchSize} registration numbers:`);
  console.log(registrationNumbers);
}

/**
 * EXAMPLE 15: Reset Counter (Admin Function)
 * WARNING: Use with extreme caution!
 */
async function example15_ResetCounter() {
  console.log('\n=== Example 15: Reset Counter (ADMIN ONLY) ===');

  // DANGER: This will reset the counter
  // Only use for testing or in very specific admin scenarios

  // Reset to start from 1
  await resetCounter();
  console.log('Counter reset to 0');

  // Reset to start from a specific number
  await resetCounter(2025, 1000);
  console.log('Counter set to start from 1000');

  // Next number will be 1001
  const nextNumber = await generateRegistrationNumber();
  console.log('Next number:', nextNumber);
  // Output: "REG-2025-001001"
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Registration Number Generator - Examples\n');

  try {
    await example1_BasicUsage();
    await example2_CustomPrefix();
    await example3_CustomPadding();
    await example4_SpecificYear();
    await example5_CombinedOptions();
    await example6_CheckCounter();
    await example7_PreviewNext();
    await example8_ErrorHandling();
    await example9_ConcurrentGeneration();
    await example10_EmailFetchIntegration();
    await example11_ManualRegistration();
    await example12_DocumentTypes();
    await example13_YearRollover();
    await example14_BatchGeneration();
    // await example15_ResetCounter(); // Commented out - dangerous!

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Uncomment to run:
// runAllExamples();

// Export for use in tests
export {
  example1_BasicUsage,
  example2_CustomPrefix,
  example3_CustomPadding,
  example4_SpecificYear,
  example5_CombinedOptions,
  example6_CheckCounter,
  example7_PreviewNext,
  example8_ErrorHandling,
  example9_ConcurrentGeneration,
  example10_EmailFetchIntegration,
  example11_ManualRegistration,
  example12_DocumentTypes,
  example13_YearRollover,
  example14_BatchGeneration,
  example15_ResetCounter,
  runAllExamples,
};
