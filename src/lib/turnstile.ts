import "server-only";

import { resolveTurnstileMissingKeyPolicy } from "@/lib/security/abuse-controls";

export { resolveTurnstileMissingKeyPolicy } from "@/lib/security/abuse-controls";

/**
 * Cloudflare Turnstile verification.
 *
 * Whether a captcha is enforced is decided by the captcha settings
 * (`resolveCaptchaFor`), not here. Callers should call
 * `checkCaptchaForScope` / `checkCaptchaForForm` from
 * `@/features/captcha/captcha.guard` so the widget and the server always agree.
 *
 * This low-level verify still fails closed in production when no secret is
 * configured (direct callers), and stays open in development/test.
 */

let warnedMissing = false;

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    const policy = resolveTurnstileMissingKeyPolicy(process.env.NODE_ENV);
    if (!warnedMissing) {
      warnedMissing = true;
      if (policy === "deny") {
        console.error(
          "[turnstile] TURNSTILE_SECRET_KEY unset in production — rejecting public form submissions",
        );
      } else {
        console.warn("[turnstile] TURNSTILE_SECRET_KEY unset — CAPTCHA not enforced (non-production)");
      }
    }
    return policy === "allow";
  }
  if (!token?.trim()) return false;

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token.trim());
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (error) {
    // Never log the secret or the submitted token.
    console.error("[turnstile] verify failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

/**
 * Verify with the secret currently stored in captcha settings (falling back to
 * the env secret). Used by the settings guard, which resolves the secret from
 * JsonStore rather than env alone.
 */
export async function verifyTurnstileTokenWithSecret(
  secret: string,
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  if (!secret.trim()) return false;
  if (!token?.trim()) return false;
  try {
    const body = new URLSearchParams();
    body.set("secret", secret.trim());
    body.set("response", token.trim());
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (error) {
    console.error("[turnstile] verify failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
