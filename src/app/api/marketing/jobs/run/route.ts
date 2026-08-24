import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { runDueMarketingJobs } from "@/modules/marketing/jobs";

export const runtime = "nodejs";

export async function POST() {
  await requireAdmin();
  bootstrapMarketingModule();
  const results = await runDueMarketingJobs(20);
  return NextResponse.json({ ok: true, processed: results.length, results });
}
