import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getEnv } from "./lib/utils/env";

// Lazy-load Prisma to avoid Edge runtime issues
const getPrisma = async () => {
  const { prisma } = await import("./lib/prisma");
  return prisma;
};

// #region agent log
const authSecret = getEnv("AUTH_SECRET");
const authSecretLength = authSecret.length;
const hasAuthSecret = !!authSecret;
const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
const hasNextAuthUrl = !!nextAuthUrl;
console.log('[AUTH-INIT] NextAuth initialization', {hasAuthSecret,authSecretLength,hasNextAuthUrl,nextAuthUrl,nodeEnv:process.env.NODE_ENV});
fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:NextAuth:init',message:'NextAuth initialization',data:{hasAuthSecret,authSecretLength,hasNextAuthUrl,nextAuthUrl,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
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
