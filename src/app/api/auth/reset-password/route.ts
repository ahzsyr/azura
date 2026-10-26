import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordPolicySchema } from "@/schemas/password-policy";
import { consumePasswordResetToken } from "@/features/account/password-reset.service";
import { zodErrorMessage } from "@/lib/zod-error";

/**
 * Legacy link redemption. Reset requests now issue emailed codes, but a link
 * sent before the switch must still be usable exactly once.
 */
const legacyResetSchema = z
  .object({
    token: z.string().min(32, "Invalid or expired reset link").max(128),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = legacyResetSchema.parse(body);
    const result = await consumePasswordResetToken({
      token: data.token,
      password: data.password,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: zodErrorMessage(error) }, { status: 400 });
  }
}
