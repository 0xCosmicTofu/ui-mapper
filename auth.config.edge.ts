import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getEnv } from "./lib/utils/env";

// Edge-safe config for middleware (no Prisma/bcrypt)
// CRITICAL: AUTH_SECRET must match production when using redirectProxyUrl
const googleClientId = getEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");
const edgeAuthSecret = getEnv("AUTH_SECRET");

// #region agent log
console.log('[EDGE-CONFIG] Edge config initialization', {hasAuthSecret:!!edgeAuthSecret,authSecretLength:edgeAuthSecret.length,hasGoogleClientId:!!googleClientId,hasGoogleClientSecret:!!googleClientSecret,googleClientIdLength:googleClientId?.length || 0,googleClientSecretLength:googleClientSecret?.length || 0});
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.config.edge.ts:config',message:'Edge config initialization',data:{hasAuthSecret:!!edgeAuthSecret,authSecretLength:edgeAuthSecret.length,hasGoogleClientId:!!googleClientId,hasGoogleClientSecret:!!googleClientSecret,googleClientIdLength:googleClientId?.length || 0,googleClientSecretLength:googleClientSecret?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H5'})}).catch(()=>{});
// #endregion

const googleProvider = googleClientId && googleClientSecret
  ? Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  : null;

export default {
  secret: edgeAuthSecret,
  session: { strategy: "jwt" },
  trustHost: true, // Trust Vercel's Host header for auto URL detection
  providers: googleProvider ? [googleProvider] : [],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
} satisfies NextAuthConfig;
