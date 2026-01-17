import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "./auth.config.edge";

// Create Edge-safe auth function for middleware
// This avoids importing the full auth.ts which has Prisma/bcrypt dependencies
const { auth } = NextAuth(authConfig);

export default async function middleware(req: NextRequest) {
  // #region agent log
  const pathname = req.nextUrl.pathname;
  const sessionStartTime = Date.now();
  // #endregion
  const session = await auth();
  // #region agent log
  const sessionDuration = Date.now() - sessionStartTime;
  const hasSession = !!session;
  const sessionUserId = session?.user?.id;
  const sessionUserEmail = session?.user?.email;
  const cookieHeader = req.headers.get('cookie') || '';
  const authCookies = cookieHeader.split(';').filter(c => c.includes('authjs') || c.includes('next-auth')).map(c => c.trim().substring(0, 50));
  // #endregion
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
  const isAuthPage = pathname.startsWith('/auth');
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:middleware',message:'Middleware check',data:{pathname,hasSession,sessionUserId,sessionUserEmail,sessionDuration,isAuthPage,isPublicRoute,isApiRoute,authCookiesCount:authCookies.length,authCookies},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H6'})}).catch(()=>{});
  // #endregion
  
  // Allow public routes and API routes (API routes handle their own auth)
  if (isPublicRoute || isApiRoute) {
    // If authenticated user tries to access auth pages, redirect to home
    if (session && isAuthPage && pathname !== '/auth/error') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:redirect-authenticated',message:'Redirecting authenticated user away from auth page',data:{pathname,sessionUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  
  // Protect all other routes - require authentication
  if (!session) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:redirect-unauthenticated',message:'Redirecting unauthenticated user to signin',data:{pathname,callbackUrl:pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
