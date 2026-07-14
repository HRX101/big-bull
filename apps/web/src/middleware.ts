import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ROUTES, PUBLIC_ROUTES } from '@car-spa/shared';

const AUTH_COOKIE = 'car-spa-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const oobCode = request.nextUrl.searchParams.get('oobCode');

  if (oobCode && pathname !== AUTH_ROUTES.authAction && pathname !== '/__/auth/action') {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.authAction;
    return NextResponse.redirect(url);
  }

  if (pathname === '/__/auth/action') {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.authAction;
    return NextResponse.redirect(url);
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith('/auth'),
  );
  const hasAuthCookie = request.cookies.has(AUTH_COOKIE);

  if (!isPublic && !hasAuthCookie && !pathname.startsWith('/_next')) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_ROUTES.signIn;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
