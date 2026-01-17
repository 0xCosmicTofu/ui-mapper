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
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    // #region agent log
    async signIn({ user, account, profile }) {
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:entry',message:'signIn callback invoked',data:{hasUser:!!user,hasAccount:!!account,provider:account?.provider,userEmail:user?.email,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H13'})}).catch(()=>{});
      // #endregion
      
      // Handle OAuth providers (Google, etc.)
      if (account && account.provider !== "credentials") {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:oauth-detected',message:'OAuth provider detected',data:{provider:account.provider,providerAccountId:account.providerAccountId},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H14'})}).catch(()=>{});
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
            fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:existing-account',message:'Existing OAuth account found',data:{userId:existingAccount.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H15'})}).catch(()=>{});
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
            // #region agent log
            const returnData = {userId:user.id};
            console.log('[OAUTH-SIGNIN] signIn returning true for existing account', returnData);
            fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:return-true-existing',message:'signIn returning true for existing account',data:returnData,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H16'})}).catch(()=>{});
            // #endregion
            return true;
          }

          // Check if user exists by email
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!dbUser) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:create-user',message:'Creating new OAuth user',data:{email:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H17'})}).catch(()=>{});
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
          fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:create-account',message:'Creating OAuth account link',data:{userId:dbUser.id,provider:account.provider},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H18'})}).catch(()=>{});
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
          const returnDataNew = {userId:user.id};
          console.log('[OAUTH-SIGNIN] signIn returning true for new account', returnDataNew);
          fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:return-true-new',message:'signIn returning true for new account',data:returnDataNew,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H19'})}).catch(()=>{});
          // #endregion
          
          return true;
        } catch (error) {
          // #region agent log
          const errorData = {error:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack?.split('\n').slice(0,3).join('\n') : undefined};
          console.error('[OAUTH-SIGNIN] OAuth signIn error:', errorData);
          fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:error',message:'OAuth signIn error',data:errorData,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H20'})}).catch(()=>{});
          // #endregion
          
          console.error("OAuth signIn error:", error);
          return false;
        }
      }

      // For credentials provider, allow sign in
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:return-true-credentials',message:'signIn returning true for credentials',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H21'})}).catch(()=>{});
      // #endregion
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
      const logData = {url,baseUrl,isRelative:url.startsWith('/'),isAuthPage:url.includes('/auth/'),isSameOrigin:url.startsWith('http') ? new URL(url).origin === baseUrl : false};
      console.log('[OAUTH-REDIRECT] Redirect callback invoked', logData);
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect',message:'Redirect callback invoked',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H22'})}).catch(()=>{});
      // #endregion
      
      // Normalize URL to handle query params and fragments
      let normalizedUrl = url;
      try {
        const urlObj = new URL(url, baseUrl);
        normalizedUrl = urlObj.pathname + urlObj.search;
      } catch (e) {
        // If URL parsing fails, use as-is
      }
      
      // Prevent redirecting back to auth pages after successful OAuth
      // Check both the original URL and normalized pathname
      if (normalizedUrl.includes('/auth/signin') || 
          normalizedUrl.includes('/auth/signup') || 
          url.includes('/auth/signin') || 
          url.includes('/auth/signup')) {
        // #region agent log
        const preventData = {originalUrl:url,normalizedUrl,redirectUrl:baseUrl};
        console.log('[OAUTH-REDIRECT] Preventing redirect to auth page, using home instead', preventData);
        fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:prevent-auth-page',message:'Preventing redirect to auth page, using home instead',data:preventData,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H23'})}).catch(()=>{});
        // #endregion
        return baseUrl;
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        // Ensure relative URLs don't point to auth pages
        if (url.startsWith('/auth/') && !url.startsWith('/auth/error')) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:relative-auth-blocked',message:'Blocking relative URL to auth page',data:{url,redirectUrl:baseUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H24'})}).catch(()=>{});
          // #endregion
          return baseUrl;
        }
        const redirectUrl = `${baseUrl}${url}`;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:relative',message:'Redirecting to relative URL',data:{redirectUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H25'})}).catch(()=>{});
        // #endregion
        return redirectUrl;
      }
      // Handle absolute URLs from the same origin
      if (url.startsWith('http')) {
        try {
          const urlObj = new URL(url);
          if (urlObj.origin === baseUrl) {
            // Check if absolute URL points to auth page
            if (urlObj.pathname.startsWith('/auth/') && !urlObj.pathname.startsWith('/auth/error')) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:absolute-auth-blocked',message:'Blocking absolute URL to auth page',data:{url,redirectUrl:baseUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H26'})}).catch(()=>{});
              // #endregion
              return baseUrl;
            }
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:absolute-same-origin',message:'Redirecting to same-origin absolute URL',data:{redirectUrl:url},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H27'})}).catch(()=>{});
            // #endregion
            return url;
          }
        } catch (e) {}
      }
      // Default to base URL (home page)
      // After OAuth, always redirect to home to prevent loops
      // #region agent log
      const defaultData = {redirectUrl:baseUrl,originalUrl:url};
      console.log('[OAUTH-REDIRECT] Redirecting to base URL (default)', defaultData);
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:redirect:default',message:'Redirecting to base URL (default)',data:defaultData,timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H28'})}).catch(()=>{});
      // #endregion
      return baseUrl;
    },
  },
});
