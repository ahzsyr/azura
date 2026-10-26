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
import { requiresSecondFactorForUser } from "@/features/auth/mfa-policy";
import {
  DatabaseUnavailableError,
  MfaDeliveryError,
  MfaInvalidError,
  MfaRequiredError,
} from "@/lib/auth-errors";
import { issueMfaChallengeCookie } from "@/features/auth/mfa-challenge-cookie";
import { pickLoginUser } from "@/features/auth/login-user";
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

/**
 * Match the typed address against the current login email or a pending change.
 * A second lookup covers collations where `email` is stored with different case.
 */
async function findUserForLogin(email: string) {
  const normalized = email.trim().toLowerCase();
  const direct = await prisma.user.findMany({
    where: {
      OR: [{ email: normalized }, { pendingEmail: normalized }],
    },
    take: 5,
  });
  const picked = pickLoginUser(normalized, direct);
  if (picked) return picked;

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM \`User\`
      WHERE LOWER(\`email\`) = ${normalized}
         OR LOWER(\`pendingEmail\`) = ${normalized}
      LIMIT 5
    `;
    if (!rows.length) return null;
    const extra = await prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
    });
    return pickLoginUser(normalized, extra);
  } catch (error) {
    console.error(
      "[auth] case-insensitive email lookup failed",
      error instanceof Error ? error.name : "unknown",
    );
    return null;
  }
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
   * configured. The dashboard layout re-checks live delivery config and keeps
   * Email Accounts reachable until a sender exists.
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
    user = await findUserForLogin(email);
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
  const needsSecondFactor = requiresSecondFactorForUser(user);
  if (needsSecondFactor) {
    adminOtpUnconfigured = await completeMfaChallenge(user, mfaCode, ip);

    // Record how this browser completed the challenge so the "send a code"
    // / "switch channel" actions can be authorised. Best-effort: a cookie that
    // cannot be written must not block sign-in.
    if (!adminOtpUnconfigured) {
      try {
        await issueMfaChallengeCookie({ userId: user.id, passwordHash: user.passwordHash });
      } catch (error) {
        console.error(
          "[auth] could not issue MFA challenge cookie",
          error instanceof Error ? error.message : "unknown",
        );
      }
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

type LoginUserRow = Awaited<ReturnType<typeof findUserForLogin>>;

/**
 * Enforce the second factor (admins, and customers who enrolled one).
 *
 * Order of precedence: an enrolled authenticator app is tried first, then a
 * delivered email code. SMS/WhatsApp stay available when an operator wires a
 * transport, but email is always deliverable whenever the site has a sender.
 *
 * Returns `true` when an admin account has no usable factor at all (caller
 * marks the session `adminOtpUnconfigured`). Returns `false` when sign-in may
 * proceed. Throws a CredentialsSignin subclass when a challenge is required or
 * failed.
 */
async function completeMfaChallenge(
  user: NonNullable<LoginUserRow>,
  mfaCode: string,
  ip: string | null,
): Promise<boolean> {
  const { isAdminEmailMfaConfigured } = await import("@/features/auth/admin-auth-delivery");
  const { isLoginOtpChannelConfigured, isUsablePhoneNumber } = await import(
    "@/features/auth/login-otp-delivery"
  );
  const { rankLoginMfaFactors, resolveLoginMfaAttempt } = await import(
    "@/features/auth/login-mfa-factors"
  );
  const { resolveMfaState } = await import("@/features/auth/mfa-policy.helpers");

  const mfaState = resolveMfaState(user);
  // A customer is challenged only for the factor they enrolled. An admin's
  // authenticator counts regardless of the per-user column (legacy rows).
  const totpEnabled = mfaState.enrolled
    ? mfaState.method === "AUTHENTICATOR"
    : Boolean(user.totpEnabled);
  const emailDeliverable = await isAdminEmailMfaConfigured();
  const phoneDeliverable =
    isUsablePhoneNumber(user.phone) &&
    (await isLoginOtpChannelConfigured("sms", { emailConfigured: false }));
  const whatsappDeliverable =
    isUsablePhoneNumber(user.phone) &&
    (await isLoginOtpChannelConfigured("whatsapp", { emailConfigured: false }));

  const factors = rankLoginMfaFactors({
    totpEnabled,
    emailDeliverable,
    phoneDeliverable,
    whatsappDeliverable,
  });

  // No factor at all: password-only sign-in, flagged so the admin lifecycle
  // gate can prompt for a factor. (An admin normally always has email OTP;
  // this branch means the site has no sender yet.)
  if (factors.length === 0) {
    await writeSecurityAuditLog({
      action: "auth.mfa.unconfigured",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { passwordOnly: true, mfaMethod: mfaState.method },
    });
    return true;
  }

  const {
    hasPendingAdminLoginOtp,
    consumeAdminLoginOtp,
    issueAdminLoginOtp,
  } = await import("@/features/auth/admin-login-otp.service");

  // No code yet: ask for one. Send an OTP immediately only when there is no
  // authenticator to fall back on; otherwise wait for the user to ask.
  if (!mfaCode) {
    if (!totpEnabled) {
      const channel =
        factors[0] === "email_otp" ? "email" : factors[0] === "sms_otp" ? "sms" : "whatsapp";
      const issued = await issueAdminLoginOtp({ user, channel });
      if (!issued.ok) {
        await writeSecurityAuditLog({
          action: "auth.mfa.failure",
          actorId: user.id,
          actorRole: user.role,
          ip,
          meta: { reason: "MFA_DELIVERY_FAILED", channel },
        });
        throw new MfaDeliveryError();
      }
    }
    throw new MfaRequiredError();
  }

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

  const attempt = resolveLoginMfaAttempt({
    code: mfaCode,
    totpEnabled,
    hasDeliveredOtp: await hasPendingAdminLoginOtp(user.id),
  });

  if (attempt.kind === "recovery") {
    const { verifyAuthenticatorCode } = await import("@/features/auth/mfa-totp.service");
    const recovery = await verifyAuthenticatorCode(user.id, mfaCode);
    if (!recovery.ok) {
      await writeSecurityAuditLog({
        action: "auth.mfa.failure",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { reason: "INVALID_RECOVERY_CODE" },
      });
      throw new MfaInvalidError();
    }
    await writeSecurityAuditLog({
      action: "auth.mfa.success",
      actorId: user.id,
      actorRole: user.role,
      ip,
      meta: { channel: "recovery_code" },
    });
    return false;
  }

  // Authenticator app first: strongest factor, needs no delivery.
  if (attempt.tryAuthenticatorFirst) {
    const { verifyAuthenticatorCode } = await import("@/features/auth/mfa-totp.service");
    const authenticator = await verifyAuthenticatorCode(user.id, mfaCode);
    if (authenticator.ok && !authenticator.usedRecoveryCode) {
      await writeSecurityAuditLog({
        action: "auth.mfa.success",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { channel: "authenticator" },
      });
      return false;
    }
    if (!attempt.tryDeliveredOtp) {
      await writeSecurityAuditLog({
        action: "auth.mfa.failure",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { reason: "INVALID_TOTP" },
      });
      throw new MfaInvalidError();
    }
    // 6 digits are ambiguous with a delivered OTP; fall through and try those.
  }

  if (attempt.tryDeliveredOtp) {
    const otpResult = await consumeAdminLoginOtp(user.id, mfaCode);
    if ("ok" in otpResult) {
      await writeSecurityAuditLog({
        action: "auth.mfa.success",
        actorId: user.id,
        actorRole: user.role,
        ip,
        meta: { channel: otpResult.channel },
      });
      return false;
    }
  }

  await writeSecurityAuditLog({
    action: "auth.mfa.failure",
    actorId: user.id,
    actorRole: user.role,
    ip,
    meta: { reason: "INVALID_MFA", factors },
  });
  throw new MfaInvalidError();
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
