import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma). Used by middleware and merged in auth.ts.
 */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.mustChangePassword = Boolean(
          (user as { mustChangePassword?: boolean }).mustChangePassword,
        );
        token.totpEnabled = Boolean((user as { totpEnabled?: boolean }).totpEnabled);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session.user as { sessionVersion?: number }).sessionVersion =
          typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword =
          Boolean(token.mustChangePassword);
        (session.user as { totpEnabled?: boolean }).totpEnabled = Boolean(token.totpEnabled);
        if (token.email && !session.user.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
