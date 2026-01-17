import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getEnv, getEnvBool } from "./lib/utils/env";

// Lazy-load bcrypt to avoid Edge runtime issues in middleware
// bcrypt is a Node.js native module that doesn't work in Edge runtime
const bcryptCompare = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
};

// Gate debug logging
const isDebug = getEnvBool("DEBUG_LOGGING", false);
const isDevelopment = process.env.NODE_ENV === "development";

// Normalize NEXTAUTH_URL by trimming whitespace (fixes trailing newline issue)
const NEXTAUTH_URL = process.env.NEXTAUTH_URL?.trim() || process.env.NEXTAUTH_URL;

// Dynamically import Prisma to avoid Edge Runtime issues
const getPrisma = async () => {
  if (isDebug || isDevelopment) {
    console.log("[DEBUG] getPrisma called", {
      location: "auth.config.ts:getPrisma",
    });
  }
  
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

if (isDebug || isDevelopment) {
  console.log("[DEBUG] Auth config loading", {
    location: "auth.config.ts:config",
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  });
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.ts:config:env-check',message:'Auth config env check',data:{hasAuthSecret:!!process.env.AUTH_SECRET,authSecretLength:process.env.AUTH_SECRET?.length || 0,hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,googleClientIdLength:process.env.GOOGLE_CLIENT_ID?.length || 0,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,googleClientSecretLength:process.env.GOOGLE_CLIENT_SECRET?.length || 0,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,hasAuthUrl:!!process.env.AUTH_URL,nextAuthUrlNormalized:NEXTAUTH_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

const googleClientId = getEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");
const googleClientIdMasked = googleClientId ? `${googleClientId.substring(0, 8)}...${googleClientId.length}chars` : 'missing';
const googleClientSecretMasked = googleClientSecret ? `${googleClientSecret.substring(0, 8)}...${googleClientSecret.length}chars` : 'missing';
// #region agent log
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.ts:google:credentials:read',message:'Google credentials read from env',data:{hasClientId:!!googleClientId,clientIdMasked:googleClientIdMasked,clientIdLength:googleClientId?.length || 0,clientIdHasQuotes:googleClientId?.startsWith('"') && googleClientId?.endsWith('"'),clientIdHasSpaces:googleClientId?.trim() !== googleClientId,hasClientSecret:!!googleClientSecret,clientSecretMasked:googleClientSecretMasked,clientSecretLength:googleClientSecret?.length || 0,clientSecretHasQuotes:googleClientSecret?.startsWith('"') && googleClientSecret?.endsWith('"'),clientSecretHasSpaces:googleClientSecret?.trim() !== googleClientSecret},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

const googleProvider = googleClientId && googleClientSecret
  ? Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  : null;

// #region agent log
if (googleProvider) {
  const providerChecks = Array.isArray((googleProvider as any).checks) ? (googleProvider as any).checks : [];
  const authorizationParams = (googleProvider as any)?.authorization?.params || {};
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.ts:providers:google:details',message:'Google provider details',data:{checks:providerChecks,authorizationParamKeys:Object.keys(authorizationParams),expectedCallbackUrl:NEXTAUTH_URL ? `${NEXTAUTH_URL}/api/auth/callback/google` : "not set"},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H4'})}).catch(()=>{});
}
// #endregion

if (isDebug || isDevelopment) {
  if (googleProvider) {
    console.log("[DEBUG] Google OAuth provider configured", {
      location: "auth.config.ts:providers:google",
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nextAuthUrl: NEXTAUTH_URL,
    });
  } else {
    console.log("[DEBUG] Google OAuth provider NOT configured", {
      location: "auth.config.ts:providers:google",
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    });
  }
}

// #region agent log
if (googleProvider) {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.ts:providers:google',message:'Google OAuth provider configured',data:{hasClientId:!!process.env.GOOGLE_CLIENT_ID,hasClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,clientIdLength:process.env.GOOGLE_CLIENT_ID?.length || 0,clientSecretLength:process.env.GOOGLE_CLIENT_SECRET?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H2'})}).catch(()=>{});
} else {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.ts:providers:google',message:'Google OAuth provider missing',data:{hasClientId:!!process.env.GOOGLE_CLIENT_ID,hasClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,clientIdLength:process.env.GOOGLE_CLIENT_ID?.length || 0,clientSecretLength:process.env.GOOGLE_CLIENT_SECRET?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H3'})}).catch(()=>{});
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

        const isPasswordValid = await bcryptCompare(
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
