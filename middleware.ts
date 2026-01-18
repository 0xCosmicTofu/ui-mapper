import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "./auth.config.edge";

const { auth } = NextAuth(authConfig);

export default async function middleware(req: NextRequest) {
  // #region agent log
  const middlewareStart = Date.now();
  const pathname = req.nextUrl.pathname;
  console.log('[MIDDLEWARE-ENTRY] Middleware executing', { pathname, url: req.url, timestamp: middlewareStart });
  // #endregion

  const session = await auth();
  
  // #region agent log
  console.log('[MIDDLEWARE-SESSION] Session check result', {
    pathname,
    hasSession: !!session,
    sessionType: typeof session,
    sessionKeys: session ? Object.keys(session) : null,
    sessionUser: session?.user ? { email: session.user.email, name: session.user.name } : null,
    sessionExpires: session?.expires,
    isSessionTruthy: session ? true : false,
  });
  // #endregion

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');

  // Allow public routes and API routes
  if (isPublicRoute || isApiRoute) {
    // If authenticated user tries to access auth pages, redirect to home
    if (session && pathname.startsWith('/auth') && pathname !== '/auth/error') {
      // #region agent log
      console.log('[MIDDLEWARE-AUTH-REDIRECT] Authenticated user on auth page, redirecting to home', { pathname });
      // #endregion
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes - require authentication
  if (!session) {
    // #region agent log
    console.log('[MIDDLEWARE-PROTECT] No session, redirecting to signin', { pathname });
    // #endregion
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // #region agent log
  console.log('[MIDDLEWARE-ALLOW] Session valid, allowing access', { pathname, userEmail: session?.user?.email });
  // #endregion

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
