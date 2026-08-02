import "@/features/seo/platform/seo-platform.impl";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";
import { SEO_PIPELINE_VERSION } from "@/features/seo/workspace/types";

export default function AdminSeoTemplatesPage() {
  const templates = pluginSdk.getTemplates();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Templates"
        description="Patterns used to generate titles and descriptions from page content."
      />
      <ul className="space-y-3 text-sm">
        {templates.map((t) => (
          <li key={t.id} className="rounded-lg border p-3">
            <p className="font-medium">{t.field}</p>
            <p className="text-muted-foreground mt-1">{t.pattern}</p>
          </li>
        ))}
      </ul>
      <SeoDeveloperDetailsPanel
        details={{
          analyzerIds: [],
          ruleIds: templates.map((t) => t.id),
          pipelineVersion: SEO_PIPELINE_VERSION,
        }}
      />
    </div>
  );
}
