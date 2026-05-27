import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  if (isApiRoute) {
    return;
  }

  if (!isAuthenticated && !isAuthPage) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }

  if (isAuthenticated && isAuthPage) {
    return Response.redirect(new URL('/', req.nextUrl));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
