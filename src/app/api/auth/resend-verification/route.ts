import { NextResponse } from "next/server";
import { z } from "zod";
import { resendSignupVerification } from "@/features/account/email-verification.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { defineApiRoute } from "@/lib/api-auth";
import { emailInputSchema } from "@/lib/security/email-input";

const bodySchema = z.object({
  email: emailInputSchema,
  locale: z.string().min(2).max(10).default("en"),
});

/** Public resend — always returns success to avoid email enumeration. */
export const POST = defineApiRoute({
  access: "public",
  handler: async ({ request }) => {
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
  },
});
