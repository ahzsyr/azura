import { NextRequest, NextResponse } from "next/server";
import { seoSubmissionRunner } from "@/features/seo/integrations/submission-runner.service";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !verifyCronSecret(request, {
      envKeys: ["SEO_INTEGRATION_RUN_SECRET", "CRON_SECRET"],
      headerName: "x-seo-run-secret",
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));
  const result = await seoSubmissionRunner.runDue(limit);
  return NextResponse.json(result);
}
