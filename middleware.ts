import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  // Create response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add Service Worker headers
  if (request.nextUrl.pathname.endsWith('.js')) {
    response.headers.set('Service-Worker-Allowed', '/');
  }

  // Add PWA headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Add cache control for service worker
  if (request.nextUrl.pathname === '/sw-unified.js' || 
      request.nextUrl.pathname === '/sw.js' ||
      request.nextUrl.pathname === '/service-worker.js') {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};