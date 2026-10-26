"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  forgotPasswordSchema,
  completeResetSchema,
  verifyResetCodeSchema,
  verifyResetCodeWithoutTicketSchema,
} from "@/features/account/password-reset.schema";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/features/account/password-reset.service";
import { genericResetRequestResponse } from "@/features/account/password-reset-otp.helpers";
import { getTrustedClientIp } from "@/lib/client-ip";
import { checkCaptcha } from "@/features/captcha/captcha.guard";
import { enforceRateLimit } from "@/lib/rate-limit";
import { zodErrorMessage } from "@/lib/zod-error";

/**
 * Customer-facing reset endpoints.
 *
 * These run for anonymous visitors, so they never expose whether an address
 * has an account: step 1 always answers with the same generic message, and the
 * only extra value returned is the caller's own ticket/delivery hint.
 */

async function clientIp(): Promise<string> {
  const h = await headers();
  return getTrustedClientIp(new Request("http://local", { headers: h }));
}

export type ForgotPasswordResult =
  | { success: true; message: string; ticket?: string; hint?: string }
  | { success: false; error: string };

export async function requestPasswordResetAction(
  payload: unknown,
): Promise<ForgotPasswordResult> {
  const generic = genericResetRequestResponse();
  try {
    const ip = await clientIp();
    const rl = await enforceRateLimit({
      key: `forgot-password:action:${ip}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) return { ...generic };

    const raw = (payload ?? {}) as { turnstileToken?: unknown };
    const captcha = await checkCaptcha({
      scope: "passwordReset",
      token: typeof raw.turnstileToken === "string" ? raw.turnstileToken : undefined,
      remoteIp: ip,
    });
    if (!captcha.ok) {
      return { success: false, error: "Captcha failed. Please try again." };
    }

    const data = forgotPasswordSchema.parse(payload);
    const result = await requestPasswordReset({ email: data.email, ip });
    return {
      ...generic,
      ...(result.ticket ? { ticket: result.ticket, hint: result.hint } : {}),
    };
  } catch (error) {
    // Validation errors are safe to surface (they describe the input, never the
    // account); anything unexpected still answers generically.
    if (error instanceof z.ZodError && error.issues[0]?.message) {
      return { success: false, error: error.issues[0].message };
    }
    return { ...generic };
  }
}

export type ResetStepResult = { success: true; ticket: string } | { success: false; error: string };

/** Verify the 6-digit code for the current ticket (or for an address). */
export async function verifyResetCodeAction(payload: unknown): Promise<ResetStepResult> {
  try {
    const ip = await clientIp();
    const withTicket = verifyResetCodeSchema.safeParse(payload);
    const parsed = withTicket.success
      ? withTicket
      : verifyResetCodeWithoutTicketSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid request";
      return { success: false, error: first };
    }

    const result = await verifyPasswordResetCode({
      ticket: "ticket" in parsed.data ? parsed.data.ticket : null,
      email: "email" in parsed.data ? parsed.data.email : null,
      code: parsed.data.code,
      ip,
    });
    if ("error" in result) return { success: false, error: result.error };
    return { success: true, ticket: result.ticket };
  } catch {
    return { success: false, error: "Could not verify the code. Try again." };
  }
}

export async function completePasswordResetAction(
  payload: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const ip = await clientIp();
    const data = completeResetSchema.parse(payload);
    const result = await completePasswordReset({
      ticket: data.ticket,
      password: data.password,
      ip,
    });
    if ("error" in result) return { success: false, error: result.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: zodErrorMessage(error, "Could not reset the password.") };
  }
}
