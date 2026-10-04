import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/cron-auth";
import { processPendingTranslationJobs } from "@/capabilities/ai/jobs/worker";

export const runtime = "nodejs";

/**
 * Hostinger cron: POST /api/translation/jobs/run
 * Authorization: Bearer $CRON_SECRET
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingTranslationJobs();
  return NextResponse.json({ ok: true, ...result });
}
