import { NextRequest, NextResponse } from "next/server";
import { seoAnalyticsIngestionService } from "@/features/seo/analytics/analytics-ingestion.service";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !verifyCronSecret(request, {
      envKeys: ["SEO_ANALYTICS_RUN_SECRET", "CRON_SECRET"],
      headerName: "x-seo-run-secret",
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(30, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 3));
  const result = await seoAnalyticsIngestionService.run(days);
  return NextResponse.json(result);
}
