import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/cron-auth";
import { processDueScheduled } from "@/features/cms/scheduling";

export const runtime = "nodejs";

/**
 * Hostinger cron: POST /api/cms/scheduled/run
 * Authorization: Bearer $CRON_SECRET
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueScheduled({ force: true });
  return NextResponse.json({ ok: true, ...result });
}
