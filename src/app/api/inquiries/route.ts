import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inquirySchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { isCustomerRole } from "@/features/auth/portal";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { attachLeadAttributionFromUtm } from "@/modules/marketing/leads/attribution-bridge";
import { isRecoverableDbError } from "@/lib/debug/recoverable-db-error";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rl = await enforceRateLimit({
      key: `inquiries:${ip}`,
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

    const data = inquirySchema.parse(body);
    const session = await auth();
    const customer =
      session?.user?.id && isCustomerRole(session.user.role) ? session.user : null;

    const email = (data.email || customer?.email || "").trim().toLowerCase();
    let userId = customer?.id ?? null;
    if (!userId && email) {
      const matched = await prisma.user.findFirst({
        where: { email, role: "CUSTOMER" },
        select: { id: true },
      });
      userId = matched?.id ?? null;
    }

    const utm =
      body?.utm && typeof body.utm === "object" && !Array.isArray(body.utm)
        ? (body.utm as Record<string, string>)
        : null;

    const inquiry = await prisma.inquiry.create({
      data: {
        type: data.type === "PACKAGE" ? "CONTENT" : data.type,
        name: data.name || customer?.name || "",
        email: data.email || customer?.email || "",
        phone: data.phone,
        message: data.message,
        contentItemId: data.contentItemId || data.packageId || null,
        locale: data.locale,
        userId,
      },
    });

    if (utm && (utm.campaign || utm.a || utm.utm_campaign || utm.visitor_token)) {
      try {
        const attribution = await attachLeadAttributionFromUtm({
          inquiryId: inquiry.id,
          utm,
          conversionKey: "form_submit",
        });
        await prisma.inquiry.update({
          where: { id: inquiry.id },
          data: {
            marketingCampaignId: attribution.internalCampaignId ?? null,
            attributionTouchId: attribution.lastTouchId ?? null,
            attributionSourceId: attribution.sourceId ?? null,
          },
        });
      } catch (error) {
        if (!isRecoverableDbError(error)) {
          console.warn(
            "[inquiries] attribution bridge failed:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
