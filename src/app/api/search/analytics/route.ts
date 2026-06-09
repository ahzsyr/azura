import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchAnalytics } from "@/features/search-framework/analytics/search-analytics";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("conversion"),
    locale: z.string().min(1).max(16),
    q: z.string().max(200),
    entityType: z.string(),
    entityId: z.string().max(64),
    title: z.string().max(300).optional(),
    urlPath: z.string().max(500),
  }),
  z.object({
    type: z.literal("filter"),
    locale: z.string().min(1).max(16),
    filterId: z.string().max(80),
    values: z.array(z.string().max(120)).max(12),
  }),
  z.object({
    type: z.literal("listing_query"),
    locale: z.string().min(1).max(16),
    q: z.string().max(200),
    resultCount: z.number().int().min(0),
  }),
]);

export async function POST(request: NextRequest) {
  const admin = await ensureSearchRuntimeConfig();
  if (!admin.analytics.enabled) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = parsed.data;
  if (event.type === "conversion") {
    searchAnalytics.trackResultSelection({
      q: event.q,
      locale: event.locale,
      entityType: event.entityType as import("@prisma/client").SearchEntityType,
      entityId: event.entityId,
      title: event.title,
      urlPath: event.urlPath,
    });
  } else if (event.type === "filter" && admin.analytics.recordFilters !== false) {
    searchAnalytics.trackFilter({
      locale: event.locale,
      filterId: event.filterId,
      values: event.values,
    });
  } else if (event.type === "listing_query") {
    searchAnalytics.trackQuery({
      q: event.q,
      locale: event.locale,
      resultCount: event.resultCount,
      durationMs: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
