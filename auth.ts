import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getEnv } from "./lib/utils/env";

// Lazy-load Prisma to avoid Edge runtime issues
const getPrisma = async () => {
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

const authSecret = getEnv("AUTH_SECRET");

// Handle preview deployments with AUTH_REDIRECT_PROXY_URL
// Google OAuth doesn't support wildcards, so we can't register every preview URL
// Solution: Use AUTH_REDIRECT_PROXY_URL to always use production URL for OAuth callback
const productionUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://webflow-ui-mapper.vercel.app';

// Determine if this is a preview deployment using VERCEL_ENV
// VERCEL_ENV is "production" for production, "preview" for preview deployments
// VERCEL_URL is always the deployment-specific URL, not the production alias
const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

// #region agent log
console.log("[AUTH-CONFIG-DEBUG] Environment detection", {
  vercelEnv: process.env.VERCEL_ENV || "(not set)",
  vercelUrl: process.env.VERCEL_URL || "(not set)",
  isPreviewDeployment,
  productionUrl,
  existingAuthUrl: process.env.AUTH_URL || "(not set)",
  existingNextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
  existingRedirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL || "(not set)",
});
// #endregion

if (isPreviewDeployment) {
  // Preview deployment detected - use redirectProxyUrl to route OAuth through production
  if (!process.env.AUTH_REDIRECT_PROXY_URL) {
    process.env.AUTH_REDIRECT_PROXY_URL = `${productionUrl}/api/auth`;
  }
  
  // CRITICAL: When using redirectProxyUrl, AUTH_URL MUST be the production URL
  // Cookies are set on the AUTH_URL domain, and the callback goes to production
  // If AUTH_URL is preview URL, cookies are set on preview domain and production can't read them
  process.env.AUTH_URL = productionUrl;
} else {
  // Production deployment - no redirectProxyUrl needed, standard OAuth flow
  // Clear any existing AUTH_REDIRECT_PROXY_URL to avoid cross-domain cookie issues
  delete process.env.AUTH_REDIRECT_PROXY_URL;
  
  const explicitUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (explicitUrl) {
    process.env.AUTH_URL = explicitUrl;
  } else {
    process.env.AUTH_URL = productionUrl;
  }
}

// Only use redirectProxyUrl for preview deployments
const redirectProxyUrl = isPreviewDeployment ? process.env.AUTH_REDIRECT_PROXY_URL : undefined;

// #region agent log
console.log("[AUTH-CONFIG-DEBUG] Final configuration", {
  isPreviewDeployment,
  redirectProxyUrl: redirectProxyUrl || "(none)",
  finalAuthUrl: process.env.AUTH_URL || "(not set)",
  willUseCrossOriginCookies: !!redirectProxyUrl,
});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
  trustHost: true,
  ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  // When using redirectProxyUrl for cross-domain callbacks (preview → production),
  // cookies must be configured with sameSite: "none" and secure: true
  cookies: redirectProxyUrl ? {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none" as const,
        path: "/",
        maxAge: 900,
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
      // Handle preview URL redirects when using redirectProxyUrl
      let targetUrl = url;
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('-') && parsed.hostname.includes('.vercel.app')) {
          // This is a preview URL - use it directly
          targetUrl = url;
        } else if (parsed.origin === baseUrl) {
          targetUrl = url;
        } else {
          targetUrl = new URL(url, baseUrl).toString();
        }
      } catch {
        targetUrl = new URL(url, baseUrl).toString();
      }
      
      return targetUrl;
    },
  },
});
