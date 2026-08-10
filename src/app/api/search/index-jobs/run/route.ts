import { NextRequest, NextResponse } from "next/server";
import { processSearchIndexJobs } from "@/features/save-pipeline/search-index-jobs";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.SEARCH_INDEX_RUN_SECRET || process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const explicit = request.headers.get("x-search-index-run-secret");
  return bearer === expected || explicit === expected;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));
  return NextResponse.json(await processSearchIndexJobs(limit));
}
