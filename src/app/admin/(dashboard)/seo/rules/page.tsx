import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";

export default function AdminSeoRulesPage() {
  const rules = pluginSdk.getRules();
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Rules"
        layer="Governance Layer"
        description="Declarative requirements evaluated against ContentSnapshot and entity type."
      />
      <ul className="space-y-3 text-sm">
        {rules.map((r) => (
          <li key={r.id} className="rounded-lg border p-3">
            <p className="font-medium">{r.id}</p>
            <p className="text-muted-foreground">{r.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
