import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define paths that are public
  const isPublicPath = pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico';
  const isApiAuth = pathname.startsWith('/api/auth');

  // Skip auth checks for public assets or authentication APIs
  if (isPublicPath || isApiAuth) {
    return NextResponse.next();
  }

  // Get session cookie
  const session = request.cookies.get('user_session');

  // If trying to access dashboard/API and no session exists, redirect to login
  if (!session) {
    // If it's an API request, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Otherwise redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and going to root or login, redirect to dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (except auth or custom ones)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
