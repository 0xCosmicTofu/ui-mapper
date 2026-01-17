import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

/**
 * API route to get available authentication providers
 * Used by client-side to conditionally show OAuth buttons
 */
export async function GET() {
  try {
    // Get the auth config to check available providers
    // In NextAuth v5, we can't directly access providers from the client
    // So we check environment variables instead
    const hasGoogleOAuth = !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );

    return NextResponse.json({
      providers: {
        google: hasGoogleOAuth,
        credentials: true, // Always available
      },
    });
  } catch (error) {
    console.error("Error getting providers:", error);
    return NextResponse.json(
      { error: "Failed to get providers" },
      { status: 500 }
    );
  }
}
