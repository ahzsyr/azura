import { NextResponse } from "next/server";
import { newsletterSubscribeSchema } from "@/features/forms/schemas/form-definition";
import { subscribeNewsletter } from "@/features/forms/newsletter.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { attachLeadAttributionFromUtm } from "@/modules/marketing/leads/attribution-bridge";
import { isRecoverableDbError } from "@/lib/debug/recoverable-db-error";
import { EmailDomainError, assertDeliverableEmail } from "@/lib/security/email-domain.server";

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
    await assertDeliverableEmail(data.email);
    const result = await subscribeNewsletter({
      email: data.email,
      name: data.name,
      segment: data.segment,
      locale: data.locale,
      doubleOptIn: data.doubleOptIn,
      blockId: data.blockId,
      pageSlug: data.pageSlug,
    });

    const utm = data.utm ?? null;
    if (
      result.id &&
      utm &&
      (utm.campaign || utm.a || utm.utm_campaign || utm.visitor_token)
    ) {
      try {
        await attachLeadAttributionFromUtm({
          subscriberId: result.id,
          utm,
          pageSlug: data.pageSlug,
          conversionKey: "newsletter",
        });
      } catch (error) {
        if (!isRecoverableDbError(error)) {
          console.warn(
            "[newsletter] attribution bridge failed:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    // Public body is exactly { success, status }. The `id` stays server-side
    // (attribution only) so the response cannot correlate submissions or
    // reveal whether the address was already subscribed.
    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    if (error instanceof EmailDomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
