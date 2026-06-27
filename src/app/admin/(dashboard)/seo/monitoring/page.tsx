import { Suspense } from "react";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";

export default async function AdminSeoMonitoringPage() {
  let submissionMetrics: Awaited<ReturnType<typeof seoRepository.getSubmissionMetrics>> = {
    pending: 0,
    failed: 0,
    completed: 0,
    running: 0,
    exhausted: 0,
    failedLast24h: 0,
    stuck: 0,
    providerStats: [],
    recent: [],
  };
  let integrationHealth: Awaited<ReturnType<typeof seoIntegrationRegistry.health>> = [];

  try {
    [submissionMetrics, integrationHealth] = await Promise.all([
      seoRepository.getSubmissionMetrics(),
      seoIntegrationRegistry.health(),
    ]);
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Monitoring"
        layer="Observability + Quality"
        description="SEO quality scores, submission queue health, and integration status."
        relatedLinks={[
          { href: "/admin/seo/integrations", label: "Integrations" },
          { href: "/admin/seo/reports", label: "Reports" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pending", submissionMetrics.pending],
          ["Running", submissionMetrics.running],
          ["Completed", submissionMetrics.completed],
          ["Failed (24h)", submissionMetrics.failedLast24h],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <Suspense fallback={null}>
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-medium">Integration health</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {integrationHealth.length === 0 ? (
              <li className="text-muted-foreground">No integration data.</li>
            ) : (
              integrationHealth.map((item) => (
                <li key={item.provider} className="flex justify-between gap-4">
                  <span>{item.provider}</span>
                  <span className="text-muted-foreground">
                    {item.ok ? "ok" : item.message || "degraded"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </Suspense>
    </div>
  );
}
