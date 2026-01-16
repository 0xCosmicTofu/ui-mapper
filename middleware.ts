import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Middleware disabled - authentication removed for testing
// Removed experimental-edge runtime to avoid dev server issues

export default async function middleware(req: NextRequest) {
  // No authentication checks - all routes are public
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
