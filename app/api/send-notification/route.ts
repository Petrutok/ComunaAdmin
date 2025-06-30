import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Notifications disabled', 
    recipients: 0 
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method to send notifications' 
  });
}
