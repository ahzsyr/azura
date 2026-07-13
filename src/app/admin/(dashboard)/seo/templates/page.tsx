import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";

export default function AdminSeoTemplatesPage() {
  const templates = pluginSdk.getTemplates();
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Templates"
        layer="Intelligence Layer"
        description="Tokenized patterns resolved against ContentSnapshot and brand context."
      />
      <ul className="space-y-3 text-sm">
        {templates.map((t) => (
          <li key={t.id} className="rounded-lg border p-3">
            <p className="font-medium">{t.id}</p>
            <p className="text-muted-foreground">{t.field}: {t.pattern}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
