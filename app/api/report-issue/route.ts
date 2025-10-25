import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateRegistrationNumber } from '@/lib/generateRegistrationNumber';

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

    // Generate unique report ID
    const reportId = await generateRegistrationNumber({
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

    // Save to Firestore
    const issuesCollection = collection(db, 'reported_issues');
    const docRef = await addDoc(issuesCollection, issueData);

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
