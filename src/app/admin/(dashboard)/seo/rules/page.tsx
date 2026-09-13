import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";
import { SEO_PIPELINE_VERSION } from "@/features/seo/workspace/types";
import "@/features/seo/platform/seo-platform.impl";

export default function AdminSeoRulesPage() {
  const rules = pluginSdk.getRules();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Rules"
        description="Requirements checked during content analysis and site audits."
      />
      <ul className="space-y-3 text-sm">
        {rules.map((r) => (
          <li key={r.id} className="rounded-lg border p-3">
            <p className="font-medium">{r.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Applies to: {(r.entityTypes ?? ["all"]).join(", ")}
            </p>
          </li>
        ))}
      </ul>
      <SeoDeveloperDetailsPanel
        details={{
          analyzerIds: [],
          ruleIds: rules.map((r) => r.id),
          pipelineVersion: SEO_PIPELINE_VERSION,
        }}
      />
    </div>
  );
}
