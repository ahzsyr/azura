import { NextRequest } from "next/server";
import { requireModulePermission } from "@/features/auth/guards";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";
import { verifyCronSecret } from "@/lib/cron/cron-auth";
import { bootstrapMarketingModule } from "@/modules/marketing/bootstrap";
import { runDueMarketingJobs } from "@/modules/marketing/jobs";
import { scheduleGoogleAdsSyncJobs } from "@/modules/marketing/ads/schedule";
import { resolveMarketingIngressAccess } from "@/modules/marketing/ingress-guard";
import { handleMarketingJobsIngress } from "@/modules/marketing/ingress/handlers";

export const runtime = "nodejs";

/**
 * Dual-auth: admin session OR CRON_SECRET (Phase 4).
 */
export async function POST(request: NextRequest) {
  return handleMarketingJobsIngress({
    resolveAccess: resolveMarketingIngressAccess,
    authorize: async () => {
      const cronOk = verifyCronSecret(request);
      if (cronOk) return "ok";
      try {
        await requireModulePermission(MARKETING_MODULE_ID, "manage");
        return "ok";
      } catch {
        return "unauthorized";
      }
    },
    run: async () => {
      await bootstrapMarketingModule();
      const scheduled = await scheduleGoogleAdsSyncJobs().catch(() => null);
      const results = await runDueMarketingJobs(20);
      return {
        scheduled,
        processed: results.length,
        results,
      };
    },
  });
}
