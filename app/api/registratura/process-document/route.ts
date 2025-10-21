import { NextRequest, NextResponse } from 'next/server';
import { processStorageFile, generateTrackingUrl, getProcessingSummary } from '@/lib/services/document-processor';
import { db, COLLECTIONS } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * API Route: Process Registratura Documents
 * POST /api/registratura/process-document
 *
 * Processes email attachments by:
 * 1. Converting to PDF if needed
 * 2. Applying registration stamp
 * 3. Uploading processed version to Storage
 * 4. Updating Firestore document with processed file URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      emailId,
      registrationNumber,
      dateReceived,
      organizationName,
      departmentName,
      attachments, // Array of { downloadURL, fileName, fileType }
      stampAllPages,
      stampPosition,
    } = body;

    // Validate required fields
    if (!emailId || !registrationNumber || !dateReceived || !attachments || !Array.isArray(attachments)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: emailId, registrationNumber, dateReceived, attachments',
        },
        { status: 400 }
      );
    }

    // Generate tracking URL for QR code
    const trackingUrl = generateTrackingUrl(registrationNumber);

    // Process each attachment
    const results = [];
    for (const attachment of attachments) {
      const result = await processStorageFile(
        attachment.downloadURL,
        attachment.fileName,
        attachment.fileType,
        {
          registrationNumber,
          dateReceived: new Date(dateReceived),
          organizationName,
          departmentName,
          trackingUrl,
          stampPosition: stampPosition || 'top-right',
          stampAllPages: stampAllPages || false,
          uploadToStorage: true,
        }
      );

      results.push(result);
    }

    // Get summary
    const summary = getProcessingSummary(results);

    // Update Firestore document with processed attachments
    if (summary.successful > 0) {
      const emailRef = doc(db, COLLECTIONS.REGISTRATURA_EMAILS, emailId);

      const processedAttachments = results
        .filter(r => r.success && r.downloadURL)
        .map(r => ({
          fileName: r.originalFileName.replace(/\.[^/.]+$/, '') + '.pdf',
          downloadURL: r.downloadURL!,
          fileSize: r.fileSize!,
          fileType: 'application/pdf',
          pageCount: r.pageCount,
          wasConverted: r.wasConverted,
          processedAt: new Date().toISOString(),
          storagePath: r.storagePath,
        }));

      await updateDoc(emailRef, {
        processedAttachments: processedAttachments,
        lastProcessed: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      summary,
      results: results.map(r => ({
        fileName: r.originalFileName,
        success: r.success,
        wasConverted: r.wasConverted,
        wasStamped: r.wasStamped,
        downloadURL: r.downloadURL,
        fileSize: r.fileSize,
        pageCount: r.pageCount,
        error: r.error,
      })),
    });

  } catch (error) {
    console.error('[API] Process document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
