import "server-only";

import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/features/account/password-reset.service";
import { genericResetRequestResponse } from "@/features/account/password-reset-otp.helpers";
import { forgotPasswordSchema } from "@/features/account/password-reset.schema";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { checkCaptcha } from "@/features/captcha/captcha.guard";
import { NextResponse } from "next/server";

/**
 * JSON API for the reset form (and any non-server-action client).
 *
 * The request step answers with the same body for every address. The optional
 * `ticket`/`hint` prove only that *this browser* was sent a code — a miss
 * response simply omits them, exactly like the email send it describes.
 */

export async function postForgotPassword(request: Request): Promise<Response> {
  const ip = getTrustedClientIp(request);
  const rl = await enforceRateLimit({
    key: `forgot-password:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(genericResetRequestResponse());
  }

  try {
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
    const result = await requestPasswordReset({ email: data.email, ip });
    return NextResponse.json({
      ...genericResetRequestResponse(),
      ...(result.ticket ? { ticket: result.ticket, hint: result.hint } : {}),
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues?: Array<{ message?: string }> }).issues;
      return NextResponse.json(
        { error: issues?.[0]?.message ?? "Enter a valid email address." },
        { status: 400 },
      );
    }
    return NextResponse.json(genericResetRequestResponse());
  }
}

export async function postVerifyResetCode(request: Request): Promise<Response> {
  const ip = getTrustedClientIp(request);
  try {
    const body = (await request.json()) as { ticket?: unknown; email?: unknown; code?: unknown };
    const result = await verifyPasswordResetCode({
      ticket: typeof body.ticket === "string" ? body.ticket : null,
      email: typeof body.email === "string" ? body.email : null,
      code: typeof body.code === "string" ? body.code : "",
      ip,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, ticket: result.ticket });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function postCompleteReset(request: Request): Promise<Response> {
  const ip = getTrustedClientIp(request);
  try {
    const body = (await request.json()) as { ticket?: unknown; password?: unknown };
    if (typeof body.ticket !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const result = await completePasswordReset({
      ticket: body.ticket,
      password: body.password,
      ip,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
