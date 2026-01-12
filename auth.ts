import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { prisma } from "./lib/prisma";

// Note: We're using JWT sessions, so we don't need PrismaAdapter for middleware
// The adapter is only needed for OAuth account linking, which happens in API routes
// For JWT strategy, sessions are stored in the token, not the database

// #region agent log
console.log("[DEBUG] NextAuth initialization", {
  location: "auth.ts:NextAuth",
  hasAuthSecret: !!process.env.AUTH_SECRET,
  authSecretLength: process.env.AUTH_SECRET?.length || 0,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasAuthConfig: !!authConfig,
  timestamp: new Date().toISOString(),
  hypothesisId: "C",
});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  ...authConfig,
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
      console.log("[DEBUG] Session callback", {
        location: "auth.ts:session",
        hasToken: !!token,
        tokenId: token?.id,
        timestamp: new Date().toISOString(),
        hypothesisId: "A",
      });
      // #endregion
      
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
