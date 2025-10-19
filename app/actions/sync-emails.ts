/**
 * Server Action for syncing emails
 * Runs server-side with admin privileges
 */
'use server';

import { EmailService, isSpam } from '@/lib/email-service';
import { RegistraturaService } from '@/lib/registratura-service';
import { Timestamp } from 'firebase/firestore';

interface SyncEmailsResult {
  success: boolean;
  message?: string;
  processed: number;
  skipped: number;
  spamFiltered: number;
  totalFound: number;
  errors: string[];
  timestamp: string;
}

/**
 * Server Action to sync emails from IMAP
 * This runs server-side and has admin privileges
 */
export async function syncEmailsAction(): Promise<SyncEmailsResult> {
  const emailService = new EmailService();
  const registraturaService = new RegistraturaService();

  try {
    console.log('[SYNC-EMAILS] Starting email sync via server action...');

    // Connect to email server
    await emailService.connect();
    console.log('[SYNC-EMAILS] Connected to email server');

    // Fetch new emails
    const newEmails = await emailService.fetchNewEmails();
    console.log(`[SYNC-EMAILS] Found ${newEmails.length} new emails`);

    // Initialize results
    const results = {
      processed: 0,
      skipped: 0,
      spamFiltered: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const email of newEmails) {
      try {
        // Check for spam
        if (isSpam(email.subject, email.body)) {
          results.spamFiltered++;
          console.log(`[SYNC-EMAILS] Spam filtered: ${email.subject}`);
          continue;
        }

        // Check if email already exists (avoid duplicates)
        if (email.messageId && await registraturaService.emailExists(email.messageId)) {
          results.skipped++;
          console.log(`[SYNC-EMAILS] Skipping duplicate: ${email.subject}`);
          continue;
        }

        // Generate registration number FIRST (before uploading attachments)
        // This ensures attachments are stored in the correct folder
        const registrationNumber = await registraturaService.generateRegistrationNumber();
        console.log(`[SYNC-EMAILS] Generated registration number: ${registrationNumber}`);

        // Upload attachments to Firebase Storage with proper path
        const attachments = [];
        if (email.attachments && email.attachments.length > 0) {
          console.log(`[SYNC-EMAILS] Processing ${email.attachments.length} attachment(s)...`);

          for (const att of email.attachments) {
            try {
              const uploaded = await registraturaService.uploadAttachment(
                att.content,
                att.filename,
                registrationNumber,
                att.contentType // Pass MIME type
              );
              attachments.push(uploaded);
              console.log(`[SYNC-EMAILS] Uploaded: ${att.filename} (${att.size} bytes)`);
            } catch (attachError) {
              console.error('[SYNC-EMAILS] Failed to upload attachment:', attachError);
              results.errors.push(`Attachment upload failed: ${att.filename}`);
              // Continue processing even if attachment upload fails
            }
          }
        }

        // Create email record in Firestore with the generated registration number
        const emailId = await registraturaService.createEmailRecord({
          numarInregistrare: registrationNumber, // Use pre-generated number
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          bodyHtml: email.bodyHtml,
          dateReceived: Timestamp.fromDate(email.date),
          attachments,
          messageId: email.messageId,
        });

        console.log(`[SYNC-EMAILS] Created email record: ${emailId}`);
        results.processed++;
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        console.error('[SYNC-EMAILS] Failed to process email:', errorMessage);
        results.errors.push(`${email.subject}: ${errorMessage}`);
      }
    }

    // Disconnect from email server
    await emailService.disconnect();
    console.log('[SYNC-EMAILS] Disconnected from email server');

    // Return results
    return {
      success: true,
      message: `Processed ${results.processed} emails successfully`,
      processed: results.processed,
      skipped: results.skipped,
      spamFiltered: results.spamFiltered,
      totalFound: newEmails.length,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SYNC-EMAILS] Email sync error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to sync emails';

    return {
      success: false,
      message: errorMessage,
      processed: 0,
      skipped: 0,
      spamFiltered: 0,
      totalFound: 0,
      errors: [errorMessage],
      timestamp: new Date().toISOString(),
    };
  }
}
