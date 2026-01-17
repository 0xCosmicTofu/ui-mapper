import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { auth } from "./auth";

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
  const isAuthPage = pathname.startsWith('/auth');
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');
  
  // Allow public routes and API routes (API routes handle their own auth)
  if (isPublicRoute || isApiRoute) {
    // If authenticated user tries to access auth pages, redirect to home
    if (session && isAuthPage && pathname !== '/auth/error') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  
  // Protect all other routes - require authentication
  if (!session) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
