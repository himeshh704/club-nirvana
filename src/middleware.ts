import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. If someone visits /?ticket=TOKEN, rewrite or redirect to /pass/TOKEN
  if (pathname === '/' && searchParams.has('ticket')) {
    const ticketToken = searchParams.get('ticket');
    if (ticketToken) {
      const passUrl = new URL(`/pass/${ticketToken}`, request.url);
      return NextResponse.redirect(passUrl);
    }
  }

  // 2. Protect /admin and /staff/dashboard routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff/dashboard')) {
    const authCookie = request.cookies.get('staff_authenticated')?.value;
    
    // If not authenticated via cookie, check if request is coming from staff login
    if (authCookie !== 'true') {
      // Allow client-side localstorage fallback on login page redirect, but enforce header/cookie check for direct server requests
      const referer = request.headers.get('referer') || '';
      if (!referer.includes('/staff/login') && !referer.includes('/admin') && !referer.includes('/staff/dashboard')) {
        // Unauthenticated direct access attempt -> Redirect to staff login
        const loginUrl = new URL('/staff/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/staff/dashboard/:path*'],
};
