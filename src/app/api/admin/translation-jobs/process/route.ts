import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { processPendingTranslationJobs } from "@/features/translation/translation-job.worker";

export async function POST() {
  try {
    await requireAdmin();
    const result = await processPendingTranslationJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process translation jobs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
