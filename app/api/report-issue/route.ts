import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { generateRegistrationNumberAdmin } from '@/lib/generateRegistrationNumberAdmin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Max lengths to keep spam/abuse payloads out of Firestore
const MAX_FIELD_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;

interface ReportIssueRequest {
  name: string;
  contact: string;
  location: string;
  description: string;
  type: string;
  priority: string;
  title: string;
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export async function POST(request: NextRequest) {
  // Public endpoint: limit to 5 reports per hour per IP
  const limit = rateLimit(`report-issue:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Prea multe sesizări trimise. Încercați din nou mai târziu.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    // Parse request body
    const body: ReportIssueRequest = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'contact', 'location', 'description', 'type', 'priority', 'title'];
    for (const field of requiredFields) {
      if (!body[field as keyof ReportIssueRequest]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Reject oversized payloads
    for (const field of requiredFields) {
      const value = body[field as keyof ReportIssueRequest];
      const maxLen = field === 'description' ? MAX_DESCRIPTION_LENGTH : MAX_FIELD_LENGTH;
      if (typeof value === 'string' && value.length > maxLen) {
        return NextResponse.json(
          { success: false, error: `Field too long: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate contact field format (should be phone or email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+()]{7,}$/;

    if (!emailRegex.test(body.contact) && !phoneRegex.test(body.contact)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact must be a valid email address or phone number'
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Generate unique report ID
    const reportId = await generateRegistrationNumberAdmin({
      prefix: 'RAPORT',
      padding: 6
    });

    // Prepare issue document
    const issueData = {
      reporterName: body.name,
      reporterContact: body.contact,
      location: body.location,
      description: body.description,
      type: body.type,
      priority: body.priority,
      title: body.title,
      imageUrl: body.imageUrl || null,
      coordinates: body.coordinates || null,
      status: 'noua', // Initial status is 'new'
      reportId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      internalNotes: [],
      assignedTo: null,
      resolvedAt: null,
      resolution: null
    };

    // Save to Firestore (Admin SDK - bypasses security rules)
    const docRef = await db.collection('reported_issues').add(issueData);

    return NextResponse.json(
      {
        success: true,
        reportId,
        id: docRef.id,
        message: 'Issue reported successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error reporting issue:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to report issue'
      },
      { status: 500 }
    );
  }
}

// Optionally handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
