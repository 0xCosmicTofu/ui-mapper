import { handlers } from "../../../../auth";
import { NextRequest } from "next/server";

// #region agent log
console.log("[DEBUG] NextAuth route handler loaded", {
  location: "app/api/auth/[...nextauth]/route.ts",
  hasHandlers: !!handlers,
  hasGET: typeof handlers?.GET === "function",
  hasPOST: typeof handlers?.POST === "function",
  nextAuthUrl: process.env.NEXTAUTH_URL,
  authSecret: !!process.env.AUTH_SECRET,
  timestamp: new Date().toISOString(),
  hypothesisId: "A",
});
// #endregion

export const GET = async (req: NextRequest) => {
  // #region agent log
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  console.log("[DEBUG] NextAuth GET handler called", {
    location: "app/api/auth/[...nextauth]/route.ts:GET",
    url: req.url,
    pathname: req.nextUrl.pathname,
    searchParams,
    hasHandlers: !!handlers,
    hasGET: typeof handlers?.GET === "function",
    timestamp: new Date().toISOString(),
    hypothesisId: "A",
  });
  // #endregion
  
  try {
    const response = await handlers.GET(req);
    // #region agent log
    console.log("[DEBUG] NextAuth GET handler response", {
      location: "app/api/auth/[...nextauth]/route.ts:GET:response",
      status: response?.status,
      statusText: response?.statusText,
      hasHeaders: !!response?.headers,
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    console.error("[DEBUG] NextAuth GET handler error", {
      location: "app/api/auth/[...nextauth]/route.ts:GET:error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
    // #endregion
    throw error;
  }
};

export const POST = async (req: NextRequest) => {
  // #region agent log
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  console.log("[DEBUG] NextAuth POST handler called", {
    location: "app/api/auth/[...nextauth]/route.ts:POST",
    url: req.url,
    pathname: req.nextUrl.pathname,
    searchParams,
    hasHandlers: !!handlers,
    hasPOST: typeof handlers?.POST === "function",
    timestamp: new Date().toISOString(),
    hypothesisId: "A",
  });
  // #endregion
  
  try {
    const response = await handlers.POST(req);
    // #region agent log
    console.log("[DEBUG] NextAuth POST handler response", {
      location: "app/api/auth/[...nextauth]/route.ts:POST:response",
      status: response?.status,
      statusText: response?.statusText,
      hasHeaders: !!response?.headers,
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    console.error("[DEBUG] NextAuth POST handler error", {
      location: "app/api/auth/[...nextauth]/route.ts:POST:error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      timestamp: new Date().toISOString(),
      hypothesisId: "A",
    });
    // #endregion
    throw error;
  }
};

