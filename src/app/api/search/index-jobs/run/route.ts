import { NextRequest, NextResponse } from "next/server";
import { processSearchIndexJobs } from "@/features/save-pipeline/search-index-jobs";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !verifyCronSecret(request, {
      envKeys: ["SEARCH_INDEX_RUN_SECRET", "CRON_SECRET"],
      headerName: "x-search-index-run-secret",
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));
  return NextResponse.json(await processSearchIndexJobs(limit));
}
