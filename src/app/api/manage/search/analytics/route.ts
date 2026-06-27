import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildSearchAnalyticsReport } from "@/capabilities/search/analytics/search-analytics-report.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale") ?? "en";
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? 30) || 30));

  const report = await buildSearchAnalyticsReport(locale, days);
  return NextResponse.json(report);
}
