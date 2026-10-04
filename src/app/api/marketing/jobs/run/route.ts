import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { verifyCronSecret } from "@/lib/cron/cron-auth";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { runDueMarketingJobs } from "@/modules/marketing/jobs";
import { scheduleGoogleAdsSyncJobs } from "@/modules/marketing/ads/schedule";

export const runtime = "nodejs";

/**
 * Dual-auth: admin session OR CRON_SECRET (Phase 4).
 */
export async function POST(request: NextRequest) {
  const cronOk = verifyCronSecret(request);
  if (!cronOk) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  bootstrapMarketingModule();
  const scheduled = await scheduleGoogleAdsSyncJobs().catch(() => null);
  const results = await runDueMarketingJobs(20);
  return NextResponse.json({
    ok: true,
    scheduled,
    processed: results.length,
    results,
  });
}
