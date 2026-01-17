import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getEnv } from "./lib/utils/env";

// Edge-safe auth config for middleware
// This config does NOT include Prisma or bcrypt dependencies
// It's used by middleware which runs in Edge runtime

const googleClientId = getEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");

const googleProvider = googleClientId && googleClientSecret
  ? Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  : null;

export default {
  secret: getEnv("AUTH_SECRET"), // Required for JWT validation in middleware
  session: { strategy: "jwt" }, // JWT strategy works in Edge runtime
  providers: [
    // Google OAuth (optional - only enabled if credentials are provided)
    ...(googleProvider ? [googleProvider] : []),
    // Note: Credentials provider is NOT included here as it requires Prisma/bcrypt
    // Credentials auth is handled in the full auth.config.ts for API routes only
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
} satisfies NextAuthConfig;
