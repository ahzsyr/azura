import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { resolveAuthSecret } from "@/lib/auth-secret.server";
import { getTrustedClientIp } from "@/lib/client-ip";
import {
  assertLoginIpAllowed,
  authorizeCredentials,
} from "@/features/auth/authorize-credentials";

const authSecret = await resolveAuthSecret();

if (!authSecret && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] AUTH_SECRET is missing or placeholder. Set AUTH_SECRET in env or complete /setup.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: authSecret ?? authConfig.secret,
  callbacks: {
    ...authConfig.callbacks,
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
        return token;
      }

      // Node-only: refresh role from DB (ADMIN → SUPER_ADMIN promote, etc.).
      if (typeof token.id === "string" && token.id) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const row = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              role: true,
              sessionVersion: true,
              mustChangePassword: true,
              totpEnabled: true,
              email: true,
              disabledAt: true,
            },
          });
          if (row && !row.disabledAt) {
            token.role = row.role;
            token.sessionVersion = row.sessionVersion;
            token.mustChangePassword = row.mustChangePassword;
            token.totpEnabled = row.totpEnabled;
            if (row.email) token.email = row.email;
          }
        } catch {
          /* ignore refresh failures */
        }
      }
      return token;
    },
  },
  events: {
    async signOut(message) {
      try {
        const { writeSecurityAuditLog } = await import("@/lib/security-audit");
        const token = "token" in message ? message.token : null;
        await writeSecurityAuditLog({
          action: "auth.logout",
          actorId: typeof token?.id === "string" ? token.id : null,
          actorRole: typeof token?.role === "string" ? token.role : null,
        });
      } catch {
        /* audit must not block logout */
      }
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA code", type: "text" },
      },
      async authorize(credentials, request) {
        const ip = getTrustedClientIp(request);
        if (!(await assertLoginIpAllowed(ip))) {
          return null;
        }
        return authorizeCredentials(
          {
            email: credentials?.email,
            password: credentials?.password,
            mfaCode: credentials?.mfaCode,
          },
          { ip },
        );
      },
    }),
  ],
});
