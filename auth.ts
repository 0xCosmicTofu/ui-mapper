import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Note: We're using JWT sessions, so we don't need PrismaAdapter for middleware
// The adapter is only needed for OAuth account linking, which happens in API routes
// For JWT strategy, sessions are stored in the token, not the database

// #region agent log
const authSecret = process.env.AUTH_SECRET;
const authSecretExists = authSecret !== undefined;
const authSecretLength = authSecret ? authSecret.length : 0;
const authSecretPreview = authSecret ? `${authSecret.substring(0, 4)}...` : 'undefined';
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:12',message:'AUTH_SECRET check',data:{exists:authSecretExists,length:authSecretLength,preview:authSecretPreview,allEnvKeys:Object.keys(process.env).filter(k => k.includes('AUTH') || k.includes('SECRET')).join(',')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
}
// #endregion

// #region agent log
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:26',message:'Initializing NextAuth',data:{hasSecret:!!authSecret,secretLength:authSecret?.length || 0,nextAuthUrl:process.env.NEXTAUTH_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
}
// #endregion

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: authSecret,
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

// #region agent log
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:45',message:'NextAuth initialized',data:{hasHandlers:!!handlers,hasAuth:!!auth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
}
// #endregion
