import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";

export default function AdminSeoAssistantPage() {
  const providers = pluginSdk.getProviders();
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="AI Assistant"
        layer="Intelligence Layer"
        description="AI providers read ContentSnapshot, rules, templates, and knowledge only — never raw block trees."
      />
      <ul className="space-y-2 text-sm text-muted-foreground">
        {providers.map((p) => (
          <li key={p.id}>Provider: {p.id}</li>
        ))}
      </ul>
    </div>
  );
}
