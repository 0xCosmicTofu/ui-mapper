import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getEnv } from "./lib/utils/env";

// Lazy-load Prisma to avoid Edge runtime issues
const getPrisma = async () => {
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

// #region agent log
// CRITICAL: AUTH_SECRET must be IDENTICAL across all environments (Production, Preview, Development)
// When using redirectProxyUrl, NextAuth uses AUTH_SECRET to verify OAuth state parameters
// If AUTH_SECRET differs between preview and production, state verification fails → Configuration error
const authSecret = getEnv("AUTH_SECRET");
const authSecretLength = authSecret.length;
const hasAuthSecret = !!authSecret;

// CRITICAL FIX: Handle preview deployments with AUTH_REDIRECT_PROXY_URL
// Google OAuth doesn't support wildcards, so we can't register every preview URL
// Solution: Use AUTH_REDIRECT_PROXY_URL to always use production URL for OAuth callback
// NextAuth will then redirect back to the preview URL after authentication
if (process.env.VERCEL_URL) {
  // Preview deployment detected
  const previewUrl = `https://${process.env.VERCEL_URL}`;
  const productionUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://webflow-ui-mapper.vercel.app';
  
  // For preview deployments, use AUTH_REDIRECT_PROXY_URL to always use production callback URL
  // CRITICAL: Must include full path /api/auth, not just base URL
  // This ensures OAuth callback always goes to the registered production URL
  // NextAuth will automatically redirect back to the preview URL after auth
  if (!process.env.AUTH_REDIRECT_PROXY_URL) {
    process.env.AUTH_REDIRECT_PROXY_URL = `${productionUrl}/api/auth`;
  }
  
  // IMPORTANT: AUTH_URL should remain as the preview URL for NextAuth to work correctly
  // redirectProxyUrl handles the OAuth callback URL specifically
  // AUTH_URL is used for other NextAuth operations and should match the actual deployment
  process.env.AUTH_URL = previewUrl;
  
  console.log('[AUTH-INIT] Preview deployment detected - using AUTH_REDIRECT_PROXY_URL', {
    vercelUrl: process.env.VERCEL_URL,
    previewUrl,
    productionUrl,
    authRedirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
    authUrl: process.env.AUTH_URL
  });
} else {
  // Production deployment - use explicit NEXTAUTH_URL or AUTH_URL if set
  const explicitUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (explicitUrl) {
    process.env.AUTH_URL = explicitUrl; // Ensure AUTH_URL is set for consistency
  }
}

const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
const hasNextAuthUrl = !!nextAuthUrl;
console.log('[AUTH-INIT] NextAuth initialization', {
  hasAuthSecret,
  authSecretLength,
  hasNextAuthUrl,
  nextAuthUrl,
  nodeEnv: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL,
  vercel: process.env.VERCEL,
  explicitNextAuthUrl: process.env.NEXTAUTH_URL,
  explicitAuthUrl: process.env.AUTH_URL
});
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:NextAuth:init',message:'NextAuth initialization',data:{hasAuthSecret,authSecretLength,hasNextAuthUrl,nextAuthUrl,nodeEnv:process.env.NODE_ENV,vercelUrl:process.env.VERCEL_URL,vercel:process.env.VERCEL,explicitNextAuthUrl:process.env.NEXTAUTH_URL,explicitAuthUrl:process.env.AUTH_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'preview-url-override-fix',hypothesisId:'H8'})}).catch(()=>{});
// #endregion

// CRITICAL FIX: We've already overridden NEXTAUTH_URL/AUTH_URL above for preview deployments
// With trustHost: true, NextAuth will use request headers, but having the correct AUTH_URL
// ensures consistency and prevents fallback to production URL
// Extract redirectProxyUrl if set for preview deployments
const redirectProxyUrl = process.env.AUTH_REDIRECT_PROXY_URL;

// #region agent log
console.log('[AUTH-CONFIG] NextAuth config being created', {
  hasRedirectProxyUrl: !!redirectProxyUrl,
  redirectProxyUrl,
  authUrl: process.env.AUTH_URL,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  trustHost: true
});
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:NextAuth:config',message:'NextAuth config',data:{hasRedirectProxyUrl:!!redirectProxyUrl,redirectProxyUrl,authUrl:process.env.AUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,trustHost:true},timestamp:Date.now(),sessionId:'debug-session',runId:'redirect-proxy-fix',hypothesisId:'H9'})}).catch(()=>{});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
  trustHost: true, // Trust Vercel's Host header for auto URL detection
  // AUTH_URL/NEXTAUTH_URL have been overridden above for preview deployments
  // AUTH_REDIRECT_PROXY_URL is set for preview deployments to use production callback URL
  // Pass redirectProxyUrl in config if set (NextAuth v5 requires this)
  ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      // Handle OAuth providers
      if (account && account.provider !== "credentials") {
        try {
          const prisma = await getPrisma();

          // Check if account already exists
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            include: { user: true },
          });

          if (existingAccount) {
            // Update tokens and return existing user ID
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });
            user.id = existingAccount.userId;
            return true;
          }

          // Check if user exists by email
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          // Create user if doesn't exist
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
              },
            });
          }

          // Create account link
          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          });

          user.id = dbUser.id;
          return true;
        } catch (error) {
          console.error("OAuth signIn error:", error);
          return false;
        }
      }

      // Allow credentials provider
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
