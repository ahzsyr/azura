import { NextRequest, NextResponse } from "next/server";
import { attributionService } from "@/modules/marketing/attribution/service";
import type { MarketingClickIdType } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const visitorToken = String(body.visitorToken ?? "").trim();
    const sessionToken = String(body.sessionToken ?? "").trim();
    if (!visitorToken || !sessionToken) {
      return NextResponse.json({ error: "visitorToken and sessionToken required" }, { status: 400 });
    }

    const result = await attributionService.capture({
      visitorToken,
      sessionToken,
      consentStatus: (body.consentStatus as "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN") ?? "UNKNOWN",
      entryUrl: body.entryUrl ? String(body.entryUrl) : undefined,
      landingPagePath: body.landingPagePath ? String(body.landingPagePath) : undefined,
      referrer: body.referrer ? String(body.referrer) : undefined,
      deviceType: body.deviceType ? String(body.deviceType) : undefined,
      browser: body.browser ? String(body.browser) : undefined,
      os: body.os ? String(body.os) : undefined,
      country: body.country ? String(body.country) : undefined,
      region: body.region ? String(body.region) : undefined,
      utmSource: body.utmSource ? String(body.utmSource) : undefined,
      utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
      utmCampaign: body.utmCampaign ? String(body.utmCampaign) : undefined,
      utmContent: body.utmContent ? String(body.utmContent) : undefined,
      utmTerm: body.utmTerm ? String(body.utmTerm) : undefined,
      clickIdType: (body.clickIdType as MarketingClickIdType | null) ?? null,
      clickId: body.clickId ? String(body.clickId) : null,
      clientOccurredAt: body.clientOccurredAt ? String(body.clientOccurredAt) : undefined,
      rawPayload: body,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "capture_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
