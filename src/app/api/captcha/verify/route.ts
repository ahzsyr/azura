import { NextResponse } from "next/server";
import { checkCaptcha } from "@/features/captcha/captcha.guard";
import { getTrustedClientIp } from "@/lib/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Pre-flight captcha check for the credentials login form.
 *
 * Auth.js owns the sign-in endpoint, so the form verifies its captcha token
 * here first and only then calls `signIn("credentials", …)`. Sign-in itself is
 * still rate limited inside `authorizeCredentials`; this pre-flight is only
 * about the captcha decision (which follows Settings → Captcha).
 *
 * When captcha is not enforced for `login`, this always returns ok so the form
 * behaves exactly as before.
 */
export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `captcha-preflight:${ip}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await checkCaptcha({
      scope: "login",
      token: typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined,
      remoteIp: ip,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Captcha failed. Please try again." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, enforced: result.enforced });
  } catch (error) {
    console.error(
      "[captcha] login preflight failed:",
      error instanceof Error ? error.name : "unknown",
    );
    // Fail open: the credentials flow still enforces its own rate limits and
    // password check, so an infrastructure hiccup must not lock users out.
    return NextResponse.json({ ok: true, enforced: false });
  }
}
