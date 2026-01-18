import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getEnv } from "./lib/utils/env";

// Edge-safe config for middleware (no Prisma/bcrypt)
const googleClientId = getEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");

const googleProvider = googleClientId && googleClientSecret
  ? Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  : null;

export default {
  secret: getEnv("AUTH_SECRET"),
  session: { strategy: "jwt" },
  providers: googleProvider ? [googleProvider] : [],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
} satisfies NextAuthConfig;
