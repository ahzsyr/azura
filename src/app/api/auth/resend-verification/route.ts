import { NextResponse } from "next/server";
import { z } from "zod";
import { resendSignupVerification } from "@/features/account/email-verification.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.string().min(2).max(10).default("en"),
});

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const rl = await enforceRateLimit({
    key: `verify:ip:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);
    await resendSignupVerification({
      email: data.email,
      locale: data.locale,
      ip,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
