import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Use NextAuth's middleware helper that works with Edge Runtime
// We can't import auth directly because it pulls in Prisma
// Instead, we'll use a simpler approach for Edge Runtime
export const runtime = "experimental-edge";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // For Edge Runtime, we'll do basic route protection
  // Full auth check happens in API routes (Node.js runtime)
  // This middleware just handles redirects based on cookies
  
  const token = req.cookies.get("authjs.session-token") || 
                req.cookies.get("__Secure-authjs.session-token");
  const isLoggedIn = !!token;

  // Public routes
  const publicRoutes = ["/auth/signin", "/auth/signup", "/auth/error"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes that require auth - let API route handle auth check
  const protectedApiRoutes = ["/api/analyze"];
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to sign-in if accessing protected route without auth
  if (!isLoggedIn && !isPublicRoute && (pathname !== "/" || isProtectedApiRoute)) {
    if (isProtectedApiRoute) {
      // Let API route handle the 401 response
      return NextResponse.next();
    }
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to home if accessing auth pages while logged in
  if (isLoggedIn && isPublicRoute && pathname !== "/auth/signout") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  const publicRoutes = ["/auth/signin", "/auth/signup", "/auth/error"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes that require auth
  const protectedApiRoutes = ["/api/analyze"];
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to sign-in if accessing protected route without auth
  if (!isLoggedIn && !isPublicRoute && (pathname !== "/" || isProtectedApiRoute)) {
    if (isProtectedApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect to home if accessing auth pages while logged in
  if (isLoggedIn && isPublicRoute && pathname !== "/auth/signout") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
