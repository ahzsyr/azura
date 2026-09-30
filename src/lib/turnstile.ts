import "server-only";

/**
 * Optional Cloudflare Turnstile verification.
 * When TURNSTILE_SECRET_KEY is unset: allow (local/dev). In production, warn once.
 */
let warnedMissing = false;

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production" && !warnedMissing) {
      warnedMissing = true;
      console.warn("[turnstile] TURNSTILE_SECRET_KEY unset — CAPTCHA not enforced");
    }
    return true;
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
    console.error("[turnstile] verify failed:", error);
    return false;
  }
}
