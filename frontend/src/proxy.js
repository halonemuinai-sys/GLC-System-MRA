import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('glc_mra_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If user is trying to access dashboard/admin routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // Redirect to login page if token doesn't exist
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. If user is trying to access login page or root path
  if (pathname === '/login' || pathname === '/') {
    if (token) {
      // If already logged in, redirect to dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    } else if (pathname === '/') {
      // If not logged in and accessing root, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Config to specify which paths this proxy runs on
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
  ],
};
