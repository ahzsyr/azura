import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/account/password-reset.schema";
import { requestPasswordReset } from "@/features/account/password-reset.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { checkCaptcha } from "@/features/captcha/captcha.guard";
import { zodErrorMessage } from "@/lib/zod-error";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `forgot-password:${ip}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists for that email, you will receive password reset instructions shortly.",
      });
    }

    const body = await request.json();
    const captcha = await checkCaptcha({
      scope: "passwordReset",
      token: typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined,
      remoteIp: ip,
    });
    if (!captcha.ok) {
      return NextResponse.json({ error: "Captcha failed. Please try again." }, { status: 400 });
    }

    const data = forgotPasswordSchema.parse(body);
    await requestPasswordReset({ email: data.email, locale: data.locale });
    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, you will receive password reset instructions shortly.",
    });
  } catch (error) {
    return NextResponse.json({ error: zodErrorMessage(error, "Enter a valid email address.") }, { status: 400 });
  }
}
