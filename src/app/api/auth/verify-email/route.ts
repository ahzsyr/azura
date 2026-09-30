import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailVerification } from "@/features/account/email-verification.service";
import { consumeSignupEmailOtp } from "@/features/auth/email-otp.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";

const bodySchema = z
  .object({
    token: z.string().min(32).max(128).optional(),
    email: z.string().email().optional(),
    code: z.string().min(6).max(6).optional(),
  })
  .refine((d) => Boolean(d.token) || (Boolean(d.email) && Boolean(d.code)), {
    message: "Provide token or email+code",
  });

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const rl = await enforceRateLimit({
    key: `verify:consume:ip:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if (data.email && data.code) {
      const result = await consumeSignupEmailOtp({
        email: data.email,
        code: data.code,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, purpose: "SIGNUP_VERIFY" });
    }

    const result = await consumeEmailVerification(data.token!);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, purpose: result.purpose });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
