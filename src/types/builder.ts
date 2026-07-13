export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "gallery"
  | "faq"
  | "testimonials"
  | "pricing"
  | "cta"
  | "video"
  | "richText"
  | "catalog"
  | "contentList"
  | "customHtml"
  | "spacer"
  | "divider"
  | "section"
  | "rowSection"
  | "inquiryForm"
  | "advancedRichText"
  | "markdown"
  | "code"
  | "table"
  | "timeline"
  | "changelog"
  | "comparison"
  | "featureGrid"
  | "benefitsGrid"
  | "trustBadges"
  | "announcementBar"
  | "logoCloud"
  | "statsCounter"
  | "beforeAfter"
  | "productGrid"
  | "productCarousel"
  | "productComparison"
  | "productSpecifications"
  | "productReviews"
  | "productFaq"
  | "relatedProducts"
  | "stickyCta"
  | "leadForm"
  | "contactFormBuilder"
  | "multiStepForm"
  | "newsletterSignup"
  | "downloadGate"
  | "pricingCalculator"
  | "knowledgeBase"
  | "documentationNav"
  | "statusDashboard"
  | "teamDirectory"
  | "partnerDirectory"
  | "searchBlock"
  | "advancedFilters"
  | "categoryExplorer"
  | "relatedContent"
  | "recentlyViewed"
  | "categoryShowcase"
  | "brandShowcase"
  | "productShowcase"
  | "taxonomyProductTabs"
  | "megaCollectionShowcase"
  | "productDiscovery"
  | "videoHero"
  | "videoGallery"
  | "interactiveHotspots"
  | "masonryGallery";

import type {
  BlockAnimationSettings,
  BlockLocalizationSettings,
  BlockResponsiveSettings,
  BlockSeoSettings,
  BlockStyleSettings,
  BlockSystemVersion,
  BlockVisibilityRules,
  BlockVisualSettings,
} from "@/types/block-system";

/**
 * Block instance on a page. Supports unlimited instances of the same type.
 * Legacy v1 uses `props`; v2 uses `settings` plus optional style/visibility layers.
 */
export type BlockNode = {
  id: string;
  type: BlockType;
  version?: BlockSystemVersion;
  /** @deprecated v1 — use settings; kept for backward compatibility */
  props: Record<string, unknown>;
  settings?: Record<string, unknown>;
  styles?: BlockStyleSettings;
  responsive?: BlockResponsiveSettings;
  localization?: BlockLocalizationSettings;
  visibility?: BlockVisibilityRules;
  seo?: BlockSeoSettings;
  animation?: BlockAnimationSettings;
  visual?: BlockVisualSettings;
  /** When true, block is omitted on the live site but kept in the editor (toggle via eye icon). */
  hidden?: boolean;
  children?: BlockNode[];
};

export type PageBlocks = BlockNode[];

export type {
  Composition,
  CompositionMetadata,
  LayoutDefinition,
  LayoutRenderOptions,
  LayoutSettings,
  LayoutType,
  RegionId,
  RegionPolicy,
} from "@/features/layout-engine/types";

/** Represents a single content type available for selection in block source dropdowns. */
export type ContentTypeOption = {
  /** Content type slug, e.g. "catalog-items", "listings", "offerings" */
  slug: string;
  /** Human-readable plural name, e.g. "Packages", "Properties", "Services" */
  labelPlural: string;
  isEnabled: boolean;
};
