import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Dynamically import Prisma to avoid Edge Runtime issues
const getPrisma = async () => {
  // #region agent log
  console.log("[DEBUG] getPrisma called", {
    location: "auth.config.ts:getPrisma",
    timestamp: new Date().toISOString(),
    hypothesisId: "B",
  });
  // #endregion
  
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

// #region agent log
console.log("[DEBUG] Auth config loading", {
  location: "auth.config.ts:config",
  hasAuthSecret: !!process.env.AUTH_SECRET,
  authSecretLength: process.env.AUTH_SECRET?.length || 0,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
  googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
  googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) || "none",
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
  hypothesisId: "C",
});
// #endregion

const googleProvider = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  : null;

// #region agent log
if (googleProvider) {
  console.log("[DEBUG] Google OAuth provider configured", {
    location: "auth.config.ts:providers:google",
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    expectedCallbackUrl: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : "not set",
    timestamp: new Date().toISOString(),
    hypothesisId: "B",
  });
} else {
  console.log("[DEBUG] Google OAuth provider NOT configured", {
    location: "auth.config.ts:providers:google",
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    timestamp: new Date().toISOString(),
    hypothesisId: "B",
  });
}
// #endregion

export default {
  providers: [
    // Google OAuth (optional - only enabled if credentials are provided)
    ...(googleProvider ? [googleProvider] : []),
    // Email/Password authentication
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
} satisfies NextAuthConfig;
