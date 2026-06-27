import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { DemoRecommendationsPanel } from "@/features/seo/admin/demo-recommendations-panel";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { recommendationService } from "@/features/seo/platform/services/recommendation.service";
import type { ContentSnapshot, ValidationResult } from "@/features/seo/platform/types";

const demoCtx = createExecutionContext({
  entityType: "CmsPage",
  entityId: "demo",
  locale: "en",
  source: "manual",
  trigger: "audit",
  mode: "preview",
});

const demoSnapshot: ContentSnapshot = Object.freeze({
  id: "demo-snapshot",
  entityType: "CmsPage",
  entityId: "demo",
  localeCode: "en",
  title: "Umrah Packages 2026",
  headings: Object.freeze([Object.freeze({ level: 1, text: "Umrah Packages 2026" })]),
  paragraphs: Object.freeze([
    "Premium Umrah packages with guided tours, visa support, and 5-star hotels near the Haram.",
  ]),
  tables: Object.freeze([]),
  images: Object.freeze([]),
  links: Object.freeze({ internal: Object.freeze([]), external: Object.freeze([]) }),
  faq: Object.freeze([]),
  products: Object.freeze([]),
  language: "en",
  signals: Object.freeze({
    h1Count: 1,
    h2Count: 0,
    wordCount: 16,
    paragraphCount: 1,
    imageCount: 0,
    imagesMissingAlt: 0,
    internalLinkCount: 0,
    externalLinkCount: 0,
    hasFaq: false,
    hasCta: false,
    hasTable: false,
    hasList: false,
  }),
  capturedAt: new Date().toISOString(),
});

const demoValidation: ValidationResult = Object.freeze({
  score: 62,
  violations: Object.freeze([
    {
      id: "desc-missing-en",
      field: "metaDescription",
      severity: "warn" as const,
      message: "Meta description (en) is missing",
    },
    {
      id: "og-image-missing",
      field: "ogImageUrl",
      severity: "warn" as const,
      message: "No OG image set",
    },
  ]),
  fieldScores: Object.freeze({ metaTitle: 100, metaDescription: 0 }),
});

const demoRules = Object.freeze({ violations: Object.freeze([]), recommendations: Object.freeze([]) });

const demoRecommendations = recommendationService.build(demoCtx, {
  snapshot: demoSnapshot,
  validation: demoValidation,
  rules: demoRules,
});

export default function AdminSeoRecommendationsPage() {
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Recommendations"
        layer="Services"
        description="View derived from validation, rules, and content signals. Toggle items to preview projected SEO score."
        relatedLinks={[{ href: "/admin/seo/analysis", label: "Content Analysis" }]}
      />
      <DemoRecommendationsPanel
        ctx={demoCtx}
        validation={demoValidation}
        recommendations={demoRecommendations}
      />
    </div>
  );
}
