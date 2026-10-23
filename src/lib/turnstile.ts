import "server-only";

import { resolveTurnstileMissingKeyPolicy } from "@/lib/security/abuse-controls";

export { resolveTurnstileMissingKeyPolicy } from "@/lib/security/abuse-controls";

/**
 * Cloudflare Turnstile verification.
 *
 * Fail-closed in production: with no TURNSTILE_SECRET_KEY configured, public
 * forms / register / forgot-password reject. Set the key on the host before
 * deploying or those endpoints stop accepting submissions (intended).
 *
 * Development (and test) stays open when the key is unset.
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
