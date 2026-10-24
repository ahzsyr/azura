import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/features/setup/setup-complete.schema";
import { isRegistrationEnabled } from "@/features/setup/setup.service";
import { issueEmailOtp } from "@/features/auth/email-otp.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { zodErrorMessage } from "@/lib/zod-error";
import { EmailDomainError, assertDeliverableEmail } from "@/lib/security/email-domain.server";
import { linkVisitorTokenToUser } from "@/features/account/admin/visitor-link.service";
import { normalizeVisitorToken } from "@/features/account/admin/visitor-link-policy";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `register:${ip}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    if (!(await isRegistrationEnabled())) {
      return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
    }

    const body = await request.json();
    const turnstileOk = await verifyTurnstileToken(
      typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined,
      ip,
    );
    if (!turnstileOk) {
      return NextResponse.json({ error: "Captcha failed. Please try again." }, { status: 400 });
    }

    const data = registerSchema.parse(body);
    const visitorToken = normalizeVisitorToken(body?.visitorToken);
    // Normalized by emailInputSchema (trim + lowercase).
    const email = data.email;
    await assertDeliverableEmail(email);

    // Identical response for new and existing addresses — no account enumeration.
    const UNIFORM_RESPONSE = { success: true as const, requiresVerification: true as const };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(UNIFORM_RESPONSE);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await prisma.user.create({
      data: {
        email,
        name: data.name,
        passwordHash,
        role: "CUSTOMER",
        emailVerifiedAt: null,
      },
      select: { id: true },
    });

    const settings = await accountSettingsService.get();
    await issueEmailOtp({
      userId: created.id,
      purpose: "SIGNUP_VERIFY",
      toEmail: email,
      emailAccountId: settings.emailVerification.emailAccountId || null,
    });

    if (visitorToken) {
      await linkVisitorTokenToUser(created.id, visitorToken);
    }

    return NextResponse.json(UNIFORM_RESPONSE);
  } catch (error) {
    if (error instanceof EmailDomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: zodErrorMessage(error) }, { status: 400 });
  }
}
