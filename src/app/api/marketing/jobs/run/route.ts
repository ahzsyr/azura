import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { runDueMarketingJobs } from "@/modules/marketing/jobs";
import { scheduleGoogleAdsSyncJobs } from "@/modules/marketing/ads/schedule";

export const runtime = "nodejs";

export async function POST() {
  await requireAdmin();
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
