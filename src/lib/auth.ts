import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { resolveAuthSecret } from "@/lib/auth-secret.server";
import { getTrustedClientIp } from "@/lib/client-ip";
import { decideJwtRefresh, hasSessionUserId } from "@/lib/session-revocation";
import {
  assertLoginIpAllowed,
  authorizeCredentials,
} from "@/features/auth/authorize-credentials";

/** Remove identity so the session callback cannot treat the token as signed in. */
function dropSessionClaims(token: {
  id?: unknown;
  sub?: unknown;
  role?: unknown;
  email?: unknown;
  mustChangePassword?: unknown;
  totpEnabled?: unknown;
  adminOtpUnconfigured?: unknown;
}) {
  delete token.id;
  delete token.sub;
  delete token.role;
  delete token.email;
  delete token.mustChangePassword;
  delete token.totpEnabled;
  delete token.adminOtpUnconfigured;
}

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
        token.adminOtpUnconfigured = Boolean(
          (user as { adminOtpUnconfigured?: boolean }).adminOtpUnconfigured,
        );
        return token;
      }

      // Node-only refresh. sessionVersion was frozen at sign-in and is NEVER
      // written back here: copying the DB value onto the token would make a
      // revoked session compare equal on its next request.
      //
      // - disabledAt set or DB version differs → drop the session (no claims)
      // - version matches → refresh role / mustChangePassword / totpEnabled only
      // - unexpected DB error, including a missing sessionVersion column →
      //   fail closed. Apply prisma/migrations/20260821120000_security_hardening
      //   before this code. There is no P2022 bypass: that error fires before
      //   disabledAt can be read.
      try {
        const { prisma } = await import("@/lib/prisma");
        const userId = hasSessionUserId(token.id)
          ? token.id
          : hasSessionUserId(token.sub)
            ? token.sub
            : "";

        // No id on the token: do not look the account up by email or role.
        if (!userId) {
          dropSessionClaims(token);
          return token;
        }

        const row = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            sessionVersion: true,
            mustChangePassword: true,
            totpEnabled: true,
            email: true,
            disabledAt: true,
          },
        });

        if (row && !row.disabledAt) token.id = row.id;
        if (!token.sub && row?.id) token.sub = row.id;

        const decision = decideJwtRefresh(
          typeof token.sessionVersion === "number" ? token.sessionVersion : 0,
          row,
        );

        if (decision.action === "revoke") {
          // Drop identity + privilege claims. The session callback then yields
          // no user, and the API gate / layouts treat the session as gone.
          dropSessionClaims(token);
          return token;
        }

        token.role = decision.role;
        token.mustChangePassword = decision.mustChangePassword;
        token.totpEnabled = decision.totpEnabled;
        if (decision.email) token.email = decision.email;
        // NOTE: token.sessionVersion is intentionally not assigned here.
      } catch (error) {
        console.error(
          "[auth] session refresh failed; dropping session claims",
          error instanceof Error ? error.name : "unknown",
        );
        dropSessionClaims(token);
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
