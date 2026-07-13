import { NextRequest, NextResponse } from "next/server";
import { seoAnalyticsIngestionService } from "@/features/seo/analytics/analytics-ingestion.service";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SEO_ANALYTICS_RUN_SECRET || process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const explicit = request.headers.get("x-seo-run-secret");
  return bearer === expected || explicit === expected;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(30, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 3));
  const result = await seoAnalyticsIngestionService.run(days);
  return NextResponse.json(result);
}
