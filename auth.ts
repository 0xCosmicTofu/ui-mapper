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
// 
// IMPORTANT: When AUTH_REDIRECT_PROXY_URL is set (either via env var or auto-detected),
// BOTH preview and production need to use it for state verification to work correctly.
// The state is created on preview with redirectProxyUrl, so production must also
// recognize redirectProxyUrl when verifying the callback.
const productionUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://webflow-ui-mapper.vercel.app';

if (process.env.VERCEL_URL) {
  // Preview deployment detected
  const previewUrl = `https://${process.env.VERCEL_URL}`;
  
  // For preview deployments, use AUTH_REDIRECT_PROXY_URL to always use production callback URL
  // CRITICAL: Must include full path /api/auth, not just base URL
  // This ensures OAuth callback always goes to the registered production URL
  // NextAuth will automatically redirect back to the preview URL after auth
  if (!process.env.AUTH_REDIRECT_PROXY_URL) {
    process.env.AUTH_REDIRECT_PROXY_URL = `${productionUrl}/api/auth`;
  }
  
  // CRITICAL FIX: When using redirectProxyUrl, AUTH_URL MUST be the production URL
  // This is because:
  // 1. Cookies are set on the AUTH_URL domain
  // 2. The callback goes to the redirectProxyUrl (production)
  // 3. Production needs to read the cookies to verify the state
  // 4. If AUTH_URL is preview URL, cookies are set on preview domain and production can't read them
  // The redirect callback will handle sending users back to preview after successful auth
  process.env.AUTH_URL = productionUrl;
  
  const authSecretHashPreview = process.env.AUTH_SECRET ? Buffer.from(process.env.AUTH_SECRET).toString('base64').substring(0, 16) : 'MISSING';
  const authSecretFullHashPreview = process.env.AUTH_SECRET ? Buffer.from(process.env.AUTH_SECRET).toString('base64') : 'MISSING';
  console.log('[AUTH-INIT] Preview deployment - AUTH_URL set to production for cookie domain consistency', {
    vercelUrl: process.env.VERCEL_URL,
    previewUrl,
    productionUrl,
    authRedirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
    authUrl: process.env.AUTH_URL,
    authSecretHash: authSecretHashPreview,
    note: 'AUTH_URL = productionUrl so cookies are set on production domain where callback arrives'
  });
} else {
  // Production deployment
  // CRITICAL: If AUTH_REDIRECT_PROXY_URL is explicitly set (e.g., from preview deployments),
  // we MUST use it here too, otherwise state verification will fail when callbacks
  // from preview deployments come to production
  // If not explicitly set, production should use its own URL
  if (!process.env.AUTH_REDIRECT_PROXY_URL) {
    // Production can optionally set AUTH_REDIRECT_PROXY_URL if it wants to use a different callback URL
    // But by default, production should use its own URL
    process.env.AUTH_REDIRECT_PROXY_URL = `${productionUrl}/api/auth`;
  }
  
  // Use explicit NEXTAUTH_URL or AUTH_URL if set
  const explicitUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (explicitUrl) {
    process.env.AUTH_URL = explicitUrl; // Ensure AUTH_URL is set for consistency
  } else {
    process.env.AUTH_URL = productionUrl;
  }
  
  const authSecretHashProd = process.env.AUTH_SECRET ? Buffer.from(process.env.AUTH_SECRET).toString('base64').substring(0, 16) : 'MISSING';
  const authSecretFullHashProd = process.env.AUTH_SECRET ? Buffer.from(process.env.AUTH_SECRET).toString('base64') : 'MISSING';
  console.log('[AUTH-INIT] Production deployment', {
    productionUrl,
    authRedirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
    authUrl: process.env.AUTH_URL,
    authSecretHash: authSecretHashProd,
    authSecretFullHash: authSecretFullHashProd,
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    note: 'Production will handle callbacks from both production and preview deployments'
  });
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:AUTH-INIT:production',message:'Production deployment init',data:{productionUrl,authRedirectProxyUrl:process.env.AUTH_REDIRECT_PROXY_URL,authUrl:process.env.AUTH_URL,authSecretHash:authSecretHashProd,authSecretFullHash:authSecretFullHashProd,authSecretLength:process.env.AUTH_SECRET?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-v3',hypothesisId:'H18'})}).catch(()=>{});
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

// #region agent log - Before NextAuth initialization
const authSecretHashForConfig = authSecret ? Buffer.from(authSecret).toString('base64').substring(0, 16) : 'MISSING';
console.log('[NEXTAUTH-CONFIG-FINAL] Final NextAuth config values', {
  hasRedirectProxyUrl: !!redirectProxyUrl,
  redirectProxyUrl,
  authUrl: process.env.AUTH_URL,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  authSecretHash: authSecretHashForConfig,
  authSecretLength: authSecret.length,
  vercelUrl: process.env.VERCEL_URL,
  isPreview: !!process.env.VERCEL_URL,
  trustHost: true
});
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:NextAuth:config:final',message:'Final NextAuth config',data:{hasRedirectProxyUrl:!!redirectProxyUrl,redirectProxyUrl,authUrl:process.env.AUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,authSecretHash:authSecretHashForConfig,authSecretLength:authSecret.length,vercelUrl:process.env.VERCEL_URL,isPreview:!!process.env.VERCEL_URL,trustHost:true},timestamp:Date.now(),sessionId:'debug-session',runId:'state-verification-debug',hypothesisId:'H13'})}).catch(()=>{});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
  trustHost: true, // Trust Vercel's Host header for auto URL detection
  // AUTH_URL/NEXTAUTH_URL have been overridden above for preview deployments
  // AUTH_REDIRECT_PROXY_URL is set for preview deployments to use production callback URL
  // Pass redirectProxyUrl in config if set (NextAuth v5 requires this)
  ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  // CRITICAL: When using redirectProxyUrl for cross-domain callbacks (preview → production),
  // cookies must be configured with sameSite: "none" and secure: true
  // This ensures the state cookie is sent from preview domain to production domain
  cookies: redirectProxyUrl ? {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        secure: true, // Required for cross-domain
        sameSite: "none" as const, // Required for cross-domain (preview → production)
        path: "/",
        maxAge: 900, // 15 minutes
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
        path: "/",
        maxAge: 900,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
        path: "/",
        maxAge: 900,
      },
    },
  } : undefined,
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
    async redirect({ url, baseUrl }) {
      // CRITICAL: When using redirectProxyUrl, the callback goes to production
      // but we need to redirect back to the preview URL if that's where the user started
      // NextAuth preserves the original callbackUrl in the state, so url should contain it
      
      // If url is relative, resolve it against baseUrl
      let targetUrl = url;
      try {
        const parsed = new URL(url);
        // If it's an absolute URL, check if it's a preview URL (contains VERCEL_URL pattern)
        // If so, use it directly to redirect back to preview
        if (parsed.hostname.includes('-') && parsed.hostname.includes('.vercel.app')) {
          // This is a preview URL - use it directly
          targetUrl = url;
        } else if (parsed.origin === baseUrl) {
          // Same origin - use it
          targetUrl = url;
        } else {
          // Different origin - resolve relative to baseUrl
          targetUrl = new URL(url, baseUrl).toString();
        }
      } catch {
        // url is relative, resolve against baseUrl
        targetUrl = new URL(url, baseUrl).toString();
      }
      
      // #region agent log
      const isProduction = baseUrl.includes('webflow-ui-mapper.vercel.app') && !baseUrl.includes('-');
      const isPreviewUrl = targetUrl.includes('-') && targetUrl.includes('.vercel.app');
      console.log('[REDIRECT-CALLBACK] Redirect callback', {
        url,
        baseUrl,
        targetUrl,
        isProduction,
        isPreviewUrl,
        vercelUrl: process.env.VERCEL_URL,
        hasRedirectProxyUrl: !!process.env.AUTH_REDIRECT_PROXY_URL
      });
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:callback',message:'Redirect callback',data:{url,baseUrl,targetUrl,isProduction,isPreviewUrl,vercelUrl:process.env.VERCEL_URL,hasRedirectProxyUrl:!!process.env.AUTH_REDIRECT_PROXY_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'redirect-callback-fix',hypothesisId:'H12'})}).catch(()=>{});
      // #endregion
      
      return targetUrl;
    },
  },
});
