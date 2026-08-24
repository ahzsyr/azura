import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { RecommendationsClient } from "@/features/seo/workspace/components/recommendations-client";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { SEO_PIPELINE_VERSION } from "@/features/seo/workspace/types";

export default async function AdminSeoRecommendationsPage() {
  const issues = await seoWorkspaceService.getRecommendations();
  const snapshot = await seoWorkspaceService.getLatestSnapshot();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Recommended Improvements"
        description="Read-only suggestions derived from SEO Issues with source recommendation."
      />
      <RecommendationsClient initialIssues={issues} />
      <SeoDeveloperDetailsPanel
        details={{
          correlationId: snapshot?.correlationId,
          analyzerIds: snapshot?.analyzerIds ?? [],
          ruleIds: snapshot?.ruleIds ?? [],
          snapshotId: snapshot?.id,
          pipelineVersion: snapshot?.pipelineVersion ?? SEO_PIPELINE_VERSION,
          executionTimeMs: snapshot?.durationMs,
        }}
      />
    </div>
  );
}
