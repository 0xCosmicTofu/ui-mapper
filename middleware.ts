import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "./auth.config.edge";

const { auth } = NextAuth(authConfig);

export default async function middleware(req: NextRequest) {
  // Bypass auth for mock data mode (checked at runtime, not build time)
  const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
  if (useMockData) {
    return NextResponse.next();
  }

  const session = await auth();
  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');

  // Allow public routes and API routes
  if (isPublicRoute || isApiRoute) {
    // If authenticated user tries to access auth pages, redirect to home
    if (session && pathname.startsWith('/auth') && pathname !== '/auth/error') {
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
