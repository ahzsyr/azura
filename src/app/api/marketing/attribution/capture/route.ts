import { NextRequest, NextResponse } from "next/server";
import { attributionService } from "@/modules/marketing/attribution/service";
import { geoFromRequestHeaders, parseUserAgent } from "@/modules/marketing/attribution/ua-geo";
import { isRecoverableDbError } from "@/lib/debug/recoverable-db-error";
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

    const ua = request.headers.get("user-agent");
    const parsed = parseUserAgent(ua);
    const geo = geoFromRequestHeaders(request.headers);

    const campaignParam =
      (body.campaignParam ? String(body.campaignParam).trim() : "") ||
      (body.utmCampaign ? String(body.utmCampaign).trim() : "") ||
      undefined;

    const result = await attributionService.capture({
      visitorToken,
      sessionToken,
      consentStatus: (body.consentStatus as "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN") ?? "UNKNOWN",
      entryUrl: body.entryUrl ? String(body.entryUrl) : undefined,
      landingPagePath: body.landingPagePath ? String(body.landingPagePath) : undefined,
      referrer: body.referrer ? String(body.referrer) : undefined,
      deviceType: body.deviceType ? String(body.deviceType) : parsed.deviceType,
      browser: body.browser ? String(body.browser).slice(0, 64) : parsed.browser,
      os: body.os ? String(body.os) : parsed.os,
      country: body.country ? String(body.country) : geo.country,
      region: body.region ? String(body.region) : geo.region,
      campaignParam,
      utmSource: body.utmSource ? String(body.utmSource) : undefined,
      utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
      utmCampaign: body.utmCampaign ? String(body.utmCampaign) : campaignParam,
      utmContent: body.utmContent ? String(body.utmContent) : undefined,
      utmTerm: body.utmTerm ? String(body.utmTerm) : undefined,
      bindingId: body.bindingId
        ? String(body.bindingId)
        : body.utmContent
          ? String(body.utmContent)
          : undefined,
      clickIdType: (body.clickIdType as MarketingClickIdType | null) ?? null,
      clickId: body.clickId ? String(body.clickId) : null,
      clientOccurredAt: body.clientOccurredAt ? String(body.clientOccurredAt) : undefined,
      createTouch: body.createTouch !== false,
      // Never store raw IP — strip any accidental client fields
      rawPayload: {
        campaignParam,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        landingPagePath: body.landingPagePath,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isRecoverableDbError(error)) {
      console.warn(
        "[marketing/attribution/capture] skipped:",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json({ skipped: true, reason: "unavailable" });
    }
    const message = error instanceof Error ? error.message : "capture_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
