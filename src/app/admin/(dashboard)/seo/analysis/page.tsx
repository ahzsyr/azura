import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";

export default function AdminSeoAnalysisPage() {
  const analyzerCount = pluginSdk.getAnalyzers().length;
  return (
    <SeoPlatformSection
      title="Content Analysis"
      layer="Content Layer"
      description={`Immutable ContentSnapshot from block trees and ${analyzerCount} registered analyzer(s). Use the platform facade content.analyze() to preview structure signals before generation.`}
      relatedLinks={[
        { href: "/admin/seo/metadata", label: "Metadata hub" },
        { href: "/admin/seo/recommendations", label: "Recommendations" },
      ]}
    />
  );
}
