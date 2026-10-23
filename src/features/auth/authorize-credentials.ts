import "server-only";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  clearLoginLockout,
  isAccountDisabled,
  isAccountTemporarilyLocked,
  recordFailedPasswordAttempt,
} from "@/features/auth/login-lockout.service";
import { isCustomerEmailUnverified } from "@/features/auth/account-status";
import { requiresMfaAtLogin } from "@/features/auth/mfa-policy";
import {
  DatabaseUnavailableError,
  MfaInvalidError,
  MfaRequiredError,
} from "@/lib/auth-errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { loginSchema } from "@/schemas/auth";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;
const MFA_WINDOW_MS = 15 * 60 * 1000;
const MFA_LIMIT = 5;

/**
 * A real bcrypt hash (cost 12, matching password writes) of a random value
 * that is never a password. Used only to equalize work on the
 * user-does-not-exist path. Lazily computed once per process.
 */
let dummyPasswordHash: string | null = null;

export function getDummyPasswordHash(): string {
  if (!dummyPasswordHash) {
    dummyPasswordHash = bcrypt.hashSync(crypto.randomUUID(), 12);
  }
  return dummyPasswordHash;
}

export type AuthorizeCredentialsInput = {
  email?: unknown;
  password?: unknown;
  mfaCode?: unknown;
};

export type AuthorizeResultUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  /**
   * Admin signed in with password only because no sendable email-OTP sender is
   * configured. Carried into the JWT so every admin route except account
   * settings redirects there until a sender exists.
   */
  adminOtpUnconfigured: boolean;
};

/**
 * Shared authorize logic for Credentials provider.
 * Rate limiting for IP/email should run before this when IP is available.
 */
export async function authorizeCredentials(
  credentials: AuthorizeCredentialsInput,
  options?: { ip?: string | null },
): Promise<AuthorizeResultUser | null> {
  const ip = options?.ip ?? null;
  const parsed = loginSchema.safeParse({
    email: credentials.email,
    password: credentials.password,
    mfaCode: credentials.mfaCode,
  });
  if (!parsed.success) return null;

  const email = parsed.data.email.trim().toLowerCase();
  const mfaCode =
    typeof credentials.mfaCode === "string" ? credentials.mfaCode.trim() : "";

  const emailRl = await enforceRateLimit({
    key: `login:email:${email}`,
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!emailRl.allowed) {
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      ip,
      meta: { reason: "RATE_LIMITED", email },
    });
    return null;
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error("[auth] database lookup failed:", error);
    throw new DatabaseUnavailableError();
  }

  if (!user) {
    // Do the same bcrypt work as a real comparison so the missing-user path is
    // not distinguishable by response time. The result is still uniformly null.
    try {
      await bcrypt.compare(String(credentials.password ?? ""), getDummyPasswordHash());
    } catch {
      /* timing equalizer only */
    }
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      ip,
      meta: { reason: "INVALID_CREDENTIALS", email },
    });
    return null;
  }

  if (isAccountDisabled(user.disabledAt)) {
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { reason: "ACCOUNT_DISABLED" },
    });
    return null;
  }

  if (isAccountTemporarilyLocked(user.lockedUntil)) {
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { reason: "ACCOUNT_LOCKED" },
    });
    return null;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordFailedPasswordAttempt(user.id, ip);
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { reason: "INVALID_CREDENTIALS" },
    });
    return null;
  }

  if (isCustomerEmailUnverified(user.role, user.emailVerifiedAt)) {
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { reason: "EMAIL_UNVERIFIED" },
    });
    return null;
  }

  let adminOtpUnconfigured = false;
  if (requiresMfaAtLogin(user.role, user.totpEnabled)) {
    const { isAdminEmailMfaConfigured, resolveAdminOtpProviderConfig } = await import(
      "@/features/auth/admin-auth-delivery"
    );
    const mfaDeliveryReady = await isAdminEmailMfaConfigured();
    if (!mfaDeliveryReady) {
      // Password-only admin login when Master Admin has not configured a
      // sendable OTP sender. Mark the session so the lifecycle gate sends the
      // admin to Account Settings to configure one; once it exists, OTP is
      // required again at the next sign-in.
      adminOtpUnconfigured = true;
      await writeSecurityAuditLog({
        action: "auth.mfa.unconfigured",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { passwordOnly: true },
      });
    } else if (!mfaCode) {
      const { accountSettingsService } = await import(
        "@/features/account/account-settings.service"
      );
      const settings = await accountSettingsService.get();
      const otpAccountId = settings.adminAuth.otpEmailAccountId?.trim() || null;
      const providerConfig = await resolveAdminOtpProviderConfig();
      const { issueEmailOtp } = await import("@/features/auth/email-otp.service");
      await issueEmailOtp({
        userId: user.id,
        purpose: "ADMIN_LOGIN",
        toEmail: user.email,
        emailAccountId: otpAccountId,
        providerConfig,
        allowEnvFallback: false,
      });
      await writeSecurityAuditLog({
        action: "auth.mfa.challenge",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { channel: "email_otp" },
      });
      throw new MfaRequiredError();
    } else {
      const mfaRl = await enforceRateLimit({
        key: `mfa:${user.id}`,
        limit: MFA_LIMIT,
        windowMs: MFA_WINDOW_MS,
      });
      if (!mfaRl.allowed) {
        await writeSecurityAuditLog({
          action: "auth.mfa.failure",
          actorId: user.id,
          actorRole: user.role,
          ip,
          meta: { reason: "RATE_LIMITED" },
        });
        throw new MfaInvalidError();
      }

      const { consumeEmailOtp } = await import("@/features/auth/email-otp.service");
      const otpResult = await consumeEmailOtp({
        userId: user.id,
        purpose: "ADMIN_LOGIN",
        code: mfaCode,
      });
      if ("error" in otpResult) {
        await writeSecurityAuditLog({
          action: "auth.mfa.failure",
          actorId: user.id,
          actorRole: user.role,
          ip,
          meta: { reason: "INVALID_MFA" },
        });
        throw new MfaInvalidError();
      }

      await writeSecurityAuditLog({
        action: "auth.mfa.success",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { channel: "email_otp" },
      });
    }
  }

  await clearLoginLockout(user.id);
  await writeSecurityAuditLog({
    action: "auth.login.success",
    actorId: user.id,
    actorRole: user.role,
    ip,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion ?? 0,
    mustChangePassword: Boolean(user.mustChangePassword),
    totpEnabled: Boolean(user.totpEnabled),
    adminOtpUnconfigured,
  };
}

/** Pre-authorize IP rate limit (call from login server action / wrapper). */
export async function assertLoginIpAllowed(ip: string): Promise<boolean> {
  const rl = await enforceRateLimit({
    key: `login:ip:${ip}`,
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!rl.allowed) {
    await writeSecurityAuditLog({
      action: "auth.login.failure",
      ip,
      meta: { reason: "RATE_LIMITED" },
    });
  }
  return rl.allowed;
}
