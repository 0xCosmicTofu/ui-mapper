import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Note: We're using JWT sessions, so we don't need PrismaAdapter for middleware
// The adapter is only needed for OAuth account linking, which happens in API routes
// For JWT strategy, sessions are stored in the token, not the database

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  ...authConfig,
  callbacks: {
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
