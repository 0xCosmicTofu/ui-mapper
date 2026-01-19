import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Bypass all auth for local development
export default async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)"],
};
