import { pluginSdk } from "./plugin-sdk";
import { aiGenerationProvider, ruleBasedProvider } from "./layers/intelligence/providers/ai-provider";
import {
  brandEntityProvider,
  categoryEntityProvider,
  cmsPageEntityProvider,
  collectionEntityProvider,
  contentItemEntityProvider,
  packageEntityProvider,
  postEntityProvider,
  productEntityProvider,
  staticPageEntityProvider,
} from "./providers";
import "@/features/seo/platform/bulk/bulk-execution.engine";
import type {
  ContentAnalyzer,
  ContentSnapshot,
  ContentSnapshotDraft,
  ValidationInput,
} from "./types";

const structureAnalyzer: ContentAnalyzer = {
  id: "structure",
  async analyze(_ctx, draft: ContentSnapshotDraft) {
    return draft;
  },
};

const ctaAnalyzer: ContentAnalyzer = {
  id: "cta",
  async analyze(_ctx, draft: ContentSnapshotDraft) {
    const hasCta = draft.paragraphs.some((p) =>
      /\b(book now|contact us|get started|sign up|buy|shop)\b/i.test(p)
    );
    return { ...draft, language: draft.language || "en" };
  },
};

export const defaultRules = [
  {
    id: "product-schema",
    entityTypes: ["Product", "PRODUCT", "ContentItem"],
    requires: ["ProductSchema"] as const,
    message: "Product pages should include product structured data",
    severity: "warn" as const,
  },
  {
    id: "faq-schema",
    entityTypes: ["CmsPage", "CMS_PAGE", "Post", "POST"],
    when: (snapshot: ContentSnapshot) => snapshot.signals.hasFaq,
    requires: ["FAQSchema"] as const,
    message: "FAQ content detected — add FAQ schema",
    severity: "info" as const,
  },
  {
    id: "h1-required",
    entityTypes: ["CmsPage", "CMS_PAGE", "Post", "POST"],
    requires: ["H1"] as const,
    message: "Page should have exactly one H1",
    severity: "warn" as const,
  },
  {
    id: "og-image",
    entityTypes: [
      "CmsPage",
      "CMS_PAGE",
      "Post",
      "POST",
      "Product",
      "PRODUCT",
      "ContentItem",
      "content_item",
    ],
    requires: ["OGImage"] as const,
    message: "Add a hero or OG image for social sharing",
    severity: "info" as const,
  },
];

export const defaultValidators = [
  {
    id: "scoring-keywords",
    validate(input: ValidationInput) {
      const kw = input.suggestion?.focusKeywords?.trim();
      if (!kw) {
        return [
          {
            id: "keywords-missing",
            field: "focusKeywords",
            severity: "info" as const,
            message: "Focus keywords not set",
          },
        ];
      }
      const count = kw.split(",").filter(Boolean).length;
      if (count > 10) {
        return [
          {
            id: "keywords-too-many",
            field: "focusKeywords",
            severity: "warn" as const,
            message: `Too many keywords (${count}, aim ≤10)`,
          },
        ];
      }
      return [];
    },
  },
  {
    id: "scoring-robots",
    validate(input: ValidationInput) {
      const robots = input.suggestion?.robots ?? "index, follow";
      if (robots.toLowerCase().includes("noindex")) {
        return [
          {
            id: "robots-noindex",
            field: "robots",
            severity: "warn" as const,
            message: "Page is set to noindex",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "scoring-canonical",
    validate(input: ValidationInput) {
      if (!input.suggestion?.canonicalUrl?.trim()) {
        return [
          {
            id: "canonical-missing",
            field: "canonicalUrl",
            severity: "info" as const,
            message: "Canonical URL not set — optional but recommended",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "scoring-og-image",
    validate(input: ValidationInput) {
      if (!input.suggestion?.ogImageUrl?.trim() && input.snapshot.images.length === 0) {
        return [];
      }
      if (!input.suggestion?.ogImageUrl?.trim()) {
        return [
          {
            id: "og-image-from-content",
            field: "ogImageUrl",
            severity: "info" as const,
            message: "OG image available from content but not assigned to meta",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "scoring-og-titles",
    validate(input: ValidationInput) {
      if (!input.suggestion?.ogTitle?.trim() && input.suggestion?.metaTitle?.trim()) {
        return [
          {
            id: "og-title-fallback",
            field: "ogTitle",
            severity: "info" as const,
            message: "OG title will fall back to meta title",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "scoring-jsonld",
    validate(input: ValidationInput) {
      const jsonLd = input.suggestion?.jsonLd;
      if (jsonLd == null || jsonLd === "" || jsonLd === "{}") {
        return [
          {
            id: "jsonld-missing",
            severity: "info" as const,
            message: "Structured data (JSON-LD) not configured",
          },
        ];
      }
      return [];
    },
  },
];

export const defaultTemplates = [
  {
    id: "title-default",
    field: "metaTitle" as const,
    pattern: "{Title} | {SiteName}",
  },
  {
    id: "desc-default",
    field: "metaDescription" as const,
    pattern: "{Title} — {SiteName}",
  },
  {
    id: "product-title",
    entityTypes: ["Product", "PRODUCT"],
    field: "metaTitle" as const,
    pattern: "{ProductName} — {Category} | {Brand}",
  },
];

export const defaultStrategies = [
  {
    id: "balanced",
    label: "Balanced",
    ruleIds: ["h1-required", "og-image"],
    templateIds: ["title-default", "desc-default"],
    schemaTypes: ["WebPage"],
  },
  {
    id: "product",
    label: "Product",
    ruleIds: ["product-schema", "og-image"],
    templateIds: ["product-title", "desc-default"],
    schemaTypes: ["Product", "Offer"],
  },
];

export const defaultSchemas = [
  {
    id: "web-page",
    type: "WebPage",
    factory: (ctx: Record<string, unknown>) => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: ctx.title,
      description: ctx.description,
    }),
  },
  {
    id: "faq-page",
    type: "FAQPage",
    factory: (ctx: Record<string, unknown>) => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (ctx.faq as Array<{ question: string; answer: string }> | undefined)?.map(
        (item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })
      ),
    }),
  },
];

let defaultsRegistered = false;

export function registerPlatformDefaults(): void {
  if (defaultsRegistered) return;
  defaultsRegistered = true;

  pluginSdk.registerAnalyzer(structureAnalyzer);
  pluginSdk.registerAnalyzer(ctaAnalyzer);

  for (const rule of defaultRules) pluginSdk.registerRule(rule);
  for (const validator of defaultValidators) pluginSdk.registerValidator(validator);
  for (const template of defaultTemplates) pluginSdk.registerTemplate(template);
  for (const strategy of defaultStrategies) pluginSdk.registerStrategy(strategy);
  for (const schema of defaultSchemas) pluginSdk.registerSchema(schema);

  pluginSdk.registerProvider(ruleBasedProvider);
  pluginSdk.registerProvider(aiGenerationProvider);

  pluginSdk.registerEntityProvider(cmsPageEntityProvider);
  pluginSdk.registerEntityProvider(postEntityProvider);
  pluginSdk.registerEntityProvider(staticPageEntityProvider);
  pluginSdk.registerEntityProvider(productEntityProvider);
  pluginSdk.registerEntityProvider(brandEntityProvider);
  pluginSdk.registerEntityProvider(collectionEntityProvider);
  pluginSdk.registerEntityProvider(categoryEntityProvider);
  pluginSdk.registerEntityProvider(packageEntityProvider);
  pluginSdk.registerEntityProvider(contentItemEntityProvider);

  pluginSdk.registerGenerationProfile({
    id: "conservative",
    label: "Conservative",
    strategyId: "balanced",
    providerId: "rule-based",
    templateIds: ["title-default", "desc-default"],
  });
  pluginSdk.registerGenerationProfile({
    id: "balanced",
    label: "Balanced",
    strategyId: "balanced",
    providerId: "rule-based",
    templateIds: ["title-default", "desc-default"],
  });
  pluginSdk.registerGenerationProfile({
    id: "aggressive",
    label: "Aggressive",
    strategyId: "product",
    providerId: "rule-based",
    templateIds: ["title-default", "desc-default", "product-title"],
  });
  pluginSdk.registerGenerationProfile({
    id: "ai_assisted",
    label: "AI Assisted",
    strategyId: "balanced",
    providerId: "ai",
    templateIds: ["title-default", "desc-default"],
  });
}

export function resetPlatformDefaultsForTests(): void {
  defaultsRegistered = false;
}
