import { NextResponse } from "next/server";
import { newsletterSubscribeSchema } from "@/features/forms/schemas/form-definition";
import { subscribeNewsletter } from "@/features/forms/newsletter.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `newsletter:${ip}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const turnstileOk = await verifyTurnstileToken(
      typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined,
      ip,
    );
    if (!turnstileOk) {
      return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
    }

    const data = newsletterSubscribeSchema.parse(body);
    const result = await subscribeNewsletter({
      email: data.email,
      name: data.name,
      segment: data.segment,
      locale: data.locale,
      doubleOptIn: data.doubleOptIn,
      blockId: data.blockId,
      pageSlug: data.pageSlug,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
