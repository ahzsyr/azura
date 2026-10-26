"use server";

import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { fail, ok, type ActionResult } from "@/types/api";
import { isLoginOtpChannel, type LoginOtpChannel } from "@/features/auth/login-mfa-factors";
import { clearMfaChallengeCookie, readMfaChallenge } from "@/features/auth/mfa-challenge-cookie";
import { issueAdminLoginOtp } from "@/features/auth/admin-login-otp.service";

/**
 * Authorise an OTP action for the *current* password challenge.
 *
 * The login form holds the email + password it just verified. We re-check the
 * password here (the user already proved they know it) and confirm the signed
 * challenge cookie says this same browser passed the password step for this
 * same account. Either check failing means "sign in again", never "send a code".
 */
async function authorizeChallenge(
  email: unknown,
  password: unknown,
): Promise<
  | { ok: true; user: { id: string; name: string; role: string; email: string; phone: string | null } }
  | { ok: false; error: string; code: "challenge_expired" | "invalid_credentials" | "rate_limited" }
> {
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { ok: false, error: "Sign in again to continue.", code: "challenge_expired" };
  }

  const normalized = email.trim().toLowerCase();
  const rl = await enforceRateLimit({
    key: `login-otp-action:${normalized}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return { ok: false, error: "Too many attempts. Try again later.", code: "rate_limited" };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, role: true, email: true, phone: true, passwordHash: true, disabledAt: true },
  });
  if (!user || user.disabledAt) {
    return { ok: false, error: "Invalid email or password", code: "invalid_credentials" };
  }

  const bcrypt = await import("bcryptjs");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, error: "Invalid email or password", code: "invalid_credentials" };
  }

  const challenge = await readMfaChallenge(user.id, user.passwordHash);
  if (!challenge.valid) {
    await clearMfaChallengeCookie().catch(() => undefined);
    return {
      ok: false,
      error: "Your sign-in session expired. Enter your password again.",
      code: "challenge_expired",
    };
  }

  return {
    ok: true,
    user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone },
  };
}

function messageForIssueFailure(
  reason: string,
  channel: LoginOtpChannel,
  errorCode?: string,
): string {
  switch (reason) {
    case "rate_limited":
      return "Too many codes requested. Wait a few minutes and try again.";
    case "not_configured":
      return channel === "email"
        ? "Email sign-in codes are not configured yet. Ask an administrator to choose the OTP email account under Settings → Email Accounts → Email delivery."
        : "That delivery channel is not available right now.";
    case "invalid_recipient":
      return "No phone number on file for this account.";
    default:
      // Name the provider error once ("not_configured", a rejected key, an
      // unverified sender domain) — it is what makes the problem fixable.
      return errorCode && errorCode !== "unknown" && errorCode !== "transport_error"
        ? `Could not send the code (${errorCode}). Ask an administrator to check the Email delivery account, or use another method.`
        : "Could not send the code. Try another method.";
  }
}

/**
 * Send a sign-in code over a chosen channel (email / SMS / WhatsApp).
 * `channel` may be omitted to reuse the strongest deliverable OTP channel.
 */
export async function sendLoginOtpAction(input: {
  email: string;
  password: string;
  channel?: LoginOtpChannel | null;
}): Promise<ActionResult<{ channel: LoginOtpChannel; maskedDestination: string }>> {
  try {
    const auth = await authorizeChallenge(input.email, input.password);
    if (!auth.ok) return fail(auth.error);

    const channel: LoginOtpChannel =
      input.channel && isLoginOtpChannel(input.channel) ? input.channel : "email";

    const issued = await issueAdminLoginOtp({ user: auth.user, channel });
    if (!issued.ok) {
      return fail(messageForIssueFailure(issued.reason, channel, issued.errorCode));
    }

    const source = channel === "email" ? auth.user.email : (auth.user.phone ?? "");
    return ok({ channel, maskedDestination: maskDestination(source) });
  } catch (error) {
    console.error(
      "[auth] sendLoginOtpAction failed",
      error instanceof Error ? error.message : "unknown",
    );
    return fail("Unable to send a sign-in code right now.");
  }
}

/** Hide most of an email/phone so the UI can say "sent to a•••@x.com". */
function maskDestination(value: string): string {
  if (!value) return "";
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    const head = local.slice(0, 1);
    return `${head}${"•".repeat(Math.max(1, Math.min(5, local.length - 1)))}@${domain}`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return digits.length > 4 ? `•••${digits.slice(-4)}` : "your phone";
}

/**
 * Report which factors this account can use, so the login form can label the
 * buttons ("Use authenticator app" vs "Email me a code"). Never sends anything.
 * Requires a valid password challenge, same as the send action.
 */
export async function getLoginMfaOptionsAction(input: {
  email: string;
  password: string;
}): Promise<
  ActionResult<{
    totpEnabled: boolean;
    channels: LoginOtpChannel[];
  }>
> {
  try {
    const auth = await authorizeChallenge(input.email, input.password);
    if (!auth.ok) return fail(auth.error);

    const { isAdminEmailMfaConfigured } = await import("@/features/auth/admin-auth-delivery");
    const { isLoginOtpChannelConfigured, isUsablePhoneNumber } = await import(
      "@/features/auth/login-otp-delivery"
    );
    const { rankLoginMfaFactors, otpChannelsFromFactors } = await import(
      "@/features/auth/login-mfa-factors"
    );

    const emailDeliverable = await isAdminEmailMfaConfigured().catch(() => false);
    const hasPhone = isUsablePhoneNumber(auth.user.phone);
    const sms = hasPhone && (await isLoginOtpChannelConfigured("sms", { emailConfigured: false }));
    const whatsapp =
      hasPhone && (await isLoginOtpChannelConfigured("whatsapp", { emailConfigured: false }));

    const row = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { totpEnabled: true },
    });
    const factors = rankLoginMfaFactors({
      totpEnabled: Boolean(row?.totpEnabled),
      emailDeliverable,
      phoneDeliverable: sms,
      whatsappDeliverable: whatsapp,
    });

    await writeSecurityAuditLog({
      action: "auth.mfa.options",
      actorId: auth.user.id,
      actorRole: auth.user.role,
      meta: { factors },
    });

    return ok({
      totpEnabled: factors.includes("totp"),
      channels: otpChannelsFromFactors(factors),
    });
  } catch {
    return fail("Unable to load sign-in options.");
  }
}
