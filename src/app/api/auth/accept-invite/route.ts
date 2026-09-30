import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptAdminInvite } from "@/features/auth/admin-invite.service";
import { passwordPolicySchema } from "@/schemas/password-policy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { zodErrorMessage } from "@/lib/zod-error";

const bodySchema = z
  .object({
    token: z.string().min(32, "Invalid or expired invite link").max(128),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const rl = await enforceRateLimit({
    key: `accept-invite:ip:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);
    const result = await acceptAdminInvite({
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
