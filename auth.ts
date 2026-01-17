import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getEnv } from "./lib/utils/env";

// Lazy-load Prisma to avoid Edge runtime issues in middleware
// Prisma doesn't work in Edge runtime, so we only import it when needed (in callbacks)
const getPrisma = async () => {
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

// Note: We're using JWT sessions, so we don't need PrismaAdapter for middleware
// The adapter is only needed for OAuth account linking, which happens in API routes
// For JWT strategy, sessions are stored in the token, not the database

// Normalize NEXTAUTH_URL by trimming whitespace (fixes trailing newline issue)
const NEXTAUTH_URL = process.env.NEXTAUTH_URL?.trim() || process.env.NEXTAUTH_URL;

// #region agent log
console.log("[DEBUG] NextAuth initialization", {
  location: "auth.ts:NextAuth",
  hasAuthSecret: !!process.env.AUTH_SECRET,
  authSecretLength: process.env.AUTH_SECRET?.length || 0,
  nextAuthUrl: NEXTAUTH_URL,
  nextAuthUrlLength: NEXTAUTH_URL?.length || 0,
  rawNextAuthUrl: process.env.NEXTAUTH_URL,
  rawNextAuthUrlLength: process.env.NEXTAUTH_URL?.length || 0,
  hasAuthConfig: !!authConfig,
  providerCount: authConfig?.providers?.length || 0,
  providerNames: authConfig?.providers?.map((p: any) => p.id || p.name || "unknown") || [],
  timestamp: new Date().toISOString(),
  hypothesisId: "C",
});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: getEnv("AUTH_SECRET"),
  ...authConfig,
  debug: process.env.NODE_ENV === "development", // NODE_ENV is standard, no trim needed
  callbacks: {
    // #region agent log
    async signIn({ user, account, profile }) {
      console.log("[DEBUG] signIn callback invoked", {
        location: "auth.ts:signIn",
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
        hypothesisId: "D",
      });
      // #endregion
      
      // Handle OAuth providers (Google, etc.)
      if (account && account.provider !== "credentials") {
        // #region agent log
        console.log("[DEBUG] OAuth provider detected", {
          location: "auth.ts:signIn:OAuth",
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          timestamp: new Date().toISOString(),
          hypothesisId: "D",
        });
        // #endregion
        
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
            // #region agent log
            console.log("[DEBUG] Existing OAuth account found", {
              location: "auth.ts:signIn:existingAccount",
              userId: existingAccount.userId,
              timestamp: new Date().toISOString(),
              hypothesisId: "D",
            });
            // #endregion
            
            // Update account tokens
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

          if (!dbUser) {
            // #region agent log
            console.log("[DEBUG] Creating new OAuth user", {
              location: "auth.ts:signIn:createUser",
              email: user.email,
              timestamp: new Date().toISOString(),
              hypothesisId: "D",
            });
            // #endregion
            
            // Create new user
            dbUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
              },
            });
          }

          // #region agent log
          console.log("[DEBUG] Creating OAuth account link", {
            location: "auth.ts:signIn:createAccount",
            userId: dbUser.id,
            provider: account.provider,
            timestamp: new Date().toISOString(),
            hypothesisId: "D",
          });
          // #endregion
          
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
          
          // #region agent log
          console.log("[DEBUG] OAuth signIn completed successfully", {
            location: "auth.ts:signIn:success",
            userId: user.id,
            timestamp: new Date().toISOString(),
            hypothesisId: "D",
          });
          // #endregion
          
          return true;
        } catch (error) {
          // #region agent log
          console.error("[DEBUG] OAuth signIn error", {
            location: "auth.ts:signIn:error",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            hypothesisId: "D",
          });
          // #endregion
          
          console.error("OAuth signIn error:", error);
          return false;
        }
      }

      // For credentials provider, allow sign in
      return true;
    },
    // #endregion
    async jwt({ token, user }) {
      // #region agent log
      if (user) {
        console.log("[DEBUG] JWT callback with user", {
          location: "auth.ts:jwt",
          userId: user.id,
          userEmail: user.email,
          timestamp: new Date().toISOString(),
          hypothesisId: "A",
        });
      }
      // #endregion
      
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:session',message:'Session callback invoked',data:{hasToken:!!token,tokenId:token?.id,hasSession:!!session,sessionUserEmail:session?.user?.email,sessionUserId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H9'})}).catch(()=>{});
      // #endregion
      
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect',message:'Redirect callback invoked',data:{url,baseUrl,isRelative:url.startsWith('/'),isSameOrigin:url.startsWith('http') ? new URL(url).origin === baseUrl : false},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H10'})}).catch(()=>{});
      // #endregion
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:relative',message:'Redirecting to relative URL',data:{redirectUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H10'})}).catch(()=>{});
        // #endregion
        return redirectUrl;
      }
      // Handle absolute URLs from the same origin
      if (url.startsWith('http')) {
        try {
          const urlObj = new URL(url);
          if (urlObj.origin === baseUrl) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:absolute-same-origin',message:'Redirecting to same-origin absolute URL',data:{redirectUrl:url},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H10'})}).catch(()=>{});
            // #endregion
            return url;
          }
        } catch (e) {}
      }
      // Default to base URL (home page)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:default',message:'Redirecting to base URL (default)',data:{redirectUrl:baseUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-flow-trace',hypothesisId:'H10'})}).catch(()=>{});
      // #endregion
      return baseUrl;
    },
  },
});
