import { NextRequest, NextResponse } from 'next/server';
import { EmailService, isSpam } from '@/lib/email-service';
import { RegistraturaService } from '@/lib/registratura-service';
import { Timestamp } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

// IMPORTANT: Configuration for dynamic route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Define type for results
interface FetchResults {
  processed: number;
  skipped: number;
  spamFiltered: number;
  errors: string[];
}

/**
 * Verify if the request is from an authorized source
 */
async function verifyAuthorization(request: NextRequest): Promise<boolean> {
  // Check if it's a Vercel Cron job
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (isVercelCron) return true;

  // Check for cron secret (for manual triggers or other cron services)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Allow requests from localhost in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check for admin authentication
  // Note: In production, you should verify Firebase auth token
  if (authHeader?.startsWith('Bearer ')) {
    // You can add Firebase Admin SDK verification here
    // const token = authHeader.replace('Bearer ', '');
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // return decodedToken.isAdmin === true;
    return true; // Simplified for now
  }

  return false;
}

/**
 * Main GET handler - processes emails from IMAP
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const isAuthorized = await verifyAuthorization(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  const emailService = new EmailService();
  const registraturaService = new RegistraturaService();

  try {
    console.log('[FETCH-EMAILS] Starting email fetch process...');

    // Connect to email server
    await emailService.connect();
    console.log('[FETCH-EMAILS] Connected to email server');

    // Fetch new emails
    const newEmails = await emailService.fetchNewEmails();
    console.log(`[FETCH-EMAILS] Found ${newEmails.length} new emails`);

    // Initialize results with explicit types
    const results: FetchResults = {
      processed: 0,
      skipped: 0,
      spamFiltered: 0,
      errors: [],
    };

    // Process each email
    for (const email of newEmails) {
      try {
        // Check for spam
        if (isSpam(email.subject, email.body)) {
          results.spamFiltered++;
          console.log(`[FETCH-EMAILS] Spam filtered: ${email.subject}`);
          continue;
        }

        // Check if email already exists (avoid duplicates)
        if (email.messageId && await registraturaService.emailExists(email.messageId)) {
          results.skipped++;
          console.log(`[FETCH-EMAILS] Skipping duplicate: ${email.subject}`);
          continue;
        }

        // Generate registration number FIRST (before uploading attachments)
        const registrationNumber = await registraturaService.generateRegistrationNumber();
        console.log(`[FETCH-EMAILS] Generated registration number: ${registrationNumber}`);

        // Upload attachments to Firebase Storage with proper path
        const attachments = [];
        if (email.attachments && email.attachments.length > 0) {
          console.log(`[FETCH-EMAILS] Processing ${email.attachments.length} attachment(s)...`);

          for (const att of email.attachments) {
            try {
              const uploaded = await registraturaService.uploadAttachment(
                att.content,
                att.filename,
                registrationNumber,
                att.contentType // Pass MIME type
              );
              attachments.push(uploaded);
              console.log(`[FETCH-EMAILS] Uploaded: ${att.filename} (${att.size} bytes)`);
            } catch (attachError) {
              console.error('[FETCH-EMAILS] Failed to upload attachment:', attachError);
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

        console.log(`[FETCH-EMAILS] Created email record: ${emailId}`);
        results.processed++;
      } catch (error) {
        // Handle errors for individual emails
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        console.error('[FETCH-EMAILS] Failed to process email:', errorMessage);
        results.errors.push(`${email.subject}: ${errorMessage}`);
      }
    }

    // Disconnect from email server
    await emailService.disconnect();
    console.log('[FETCH-EMAILS] Disconnected from email server');

    // Return results
    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} emails successfully`,
      processed: results.processed,
      skipped: results.skipped,
      spamFiltered: results.spamFiltered,
      totalFound: newEmails.length,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[FETCH-EMAILS] Email fetch error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to fetch emails';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - allows manual triggering by admin users
 */
export async function POST(request: NextRequest) {
  try {
    // For POST requests, require authentication
    const isAuthorized = await verifyAuthorization(request);

    if (!isAuthorized) {
      // Try to verify admin status via Firebase Admin SDK
      try {
        const adminDb = getAdminDb();
        if (!adminDb) {
          return NextResponse.json(
            { error: 'Admin authentication not available' },
            { status: 503 }
          );
        }

        // In production, you would verify the user's admin status here
        // For now, we allow POST if there's any authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
          return NextResponse.json(
            { error: 'Forbidden - Admin authentication required' },
            { status: 403 }
          );
        }
      } catch (adminError) {
        console.error('[FETCH-EMAILS] Admin verification error:', adminError);
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 403 }
        );
      }
    }

    // Call GET handler
    return GET(request);
  } catch (error) {
    console.error('[FETCH-EMAILS] POST handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * HEAD handler - health check endpoint
 */
export async function HEAD(request: NextRequest) {
  // Check if email service is configured
  const requiredEnvVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    return new NextResponse(null, {
      status: 503,
      statusText: `Missing env vars: ${missingVars.join(', ')}`,
    });
  }

  return new NextResponse(null, { status: 200 });
}
