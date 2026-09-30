import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { buildSearchAnalyticsReport } from "@/capabilities/search/analytics/search-analytics-report.service";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    const { searchParams } = request.nextUrl;
    const locale = searchParams.get("locale") ?? "en";
    const days = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? 30) || 30));

    const report = await buildSearchAnalyticsReport(locale, days);
    return NextResponse.json(report);
  },
});
