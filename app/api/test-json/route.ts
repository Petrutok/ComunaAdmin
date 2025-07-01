// app/api/test-json/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    step: 'Starting',
  };

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!raw) {
      throw new Error('No service account JSON');
    }

    results.originalLength = raw.length;
    results.first100Chars = raw.substring(0, 100);
    results.hasDoubleBackslash = raw.includes('\\\\');
    results.hasBackslashN = raw.includes('\\n');
    
    // Try different parsing methods
    results.attempts = [];

    // Attempt 1: Direct parse
    try {
      JSON.parse(raw);
      results.attempts.push({ method: 'direct', success: true });
    } catch (e: any) {
      results.attempts.push({ 
        method: 'direct', 
        success: false, 
        error: e.message,
        position: e.message.match(/position (\d+)/)?.[1]
      });
    }

    // Attempt 2: Replace \n
    try {
      const fixed1 = raw.replace(/\\n/g, '\n');
      JSON.parse(fixed1);
      results.attempts.push({ method: 'replace_n', success: true });
    } catch (e: any) {
      results.attempts.push({ 
        method: 'replace_n', 
        success: false, 
        error: e.message 
      });
    }

    // Attempt 3: Replace all escapes
    try {
      const fixed2 = raw
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
      JSON.parse(fixed2);
      results.attempts.push({ method: 'replace_all', success: true });
    } catch (e: any) {
      results.attempts.push({ 
        method: 'replace_all', 
        success: false, 
        error: e.message 
      });
    }

    // Attempt 4: Check what's at position 177
    if (raw.length > 177) {
      results.charAtError = {
        position: 177,
        char: raw[177],
        charCode: raw.charCodeAt(177),
        context: raw.substring(170, 185)
      };
    }

    // Check for common issues
    results.checks = {
      startsWithBrace: raw.startsWith('{'),
      endsWithBrace: raw.endsWith('}'),
      hasLineBreaks: raw.includes('\n'),
      hasCarriageReturns: raw.includes('\r'),
      hasTabs: raw.includes('\t')
    };

  } catch (error: any) {
    results.error = true;
    results.errorMessage = error.message;
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}