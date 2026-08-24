import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marketingEventService } from "@/modules/marketing/events/service";
import { mapUtmSourceToKey, resolveSourceByKey } from "@/modules/marketing/sources/service";
import { campaignService } from "@/modules/marketing/campaigns/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    const clientOccurredAt = String(body.clientOccurredAt ?? new Date().toISOString());
    if (!name || !idempotencyKey) {
      return NextResponse.json({ error: "name and idempotencyKey required" }, { status: 400 });
    }

    const visitorToken = body.visitorToken ? String(body.visitorToken) : null;
    const sessionToken = body.sessionToken ? String(body.sessionToken) : null;

    let visitorId: string | null = null;
    let sessionId: string | null = null;
    if (visitorToken) {
      const visitor = await prisma.marketingVisitor.findUnique({ where: { visitorToken } });
      visitorId = visitor?.id ?? null;
    }
    if (sessionToken) {
      const session = await prisma.marketingSession.findUnique({ where: { sessionToken } });
      sessionId = session?.id ?? null;
    }

    const utmCampaign = body.utmCampaign ? String(body.utmCampaign) : null;
    const utmSource = body.utmSource ? String(body.utmSource) : null;
    const source = utmSource ? await resolveSourceByKey(mapUtmSourceToKey(utmSource)) : null;
    const campaign = utmCampaign ? await campaignService.findByUtmCampaign(utmCampaign) : null;

    const result = await marketingEventService.ingest({
      name,
      idempotencyKey,
      eventId: body.eventId ? String(body.eventId) : undefined,
      visitorId,
      sessionId,
      internalCampaignId: campaign?.id ?? null,
      landingPagePath: body.landingPagePath ? String(body.landingPagePath) : null,
      sourceId: source?.id ?? null,
      medium: body.utmMedium ? String(body.utmMedium) : null,
      properties: (body.properties as Record<string, unknown>) ?? {},
      clientOccurredAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "event_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
