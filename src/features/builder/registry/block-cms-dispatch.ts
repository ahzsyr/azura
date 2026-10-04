/**
 * CMS block dispatch — registry-first view/fields resolution.
 * Types without a dedicated loader fall through to the legacy switch
 * but must still be listed in LEGACY_* sets so orphan CI fails on gaps.
 */
import type { ComponentType } from "react";
import type { BlockNode, BlockType } from "@/types/builder";
import { BLOCK_DEFINITIONS } from "@/features/builder/registry/definitions";
import {
  AdvancedRichTextBlockFields,
  ChangelogBlockFields,
  CodeBlockFields,
  ComparisonBlockFields,
  ImageBlockFields,
  MarkdownBlockFields,
  TableBlockFields,
  TextBlockFields,
  TimelineBlockFields,
  VideoBlockFields,
} from "@/features/builder/blocks/content/fields";
import { CustomHtmlBlockFields } from "@/features/builder/blocks/content/custom-html/admin/custom-html-block-fields";
import {
  HeroProBlockFields,
  CtaBannerBlockFields,
  FeatureGridBlockFields,
  BenefitsGridBlockFields,
  TrustBadgesBlockFields,
  LogoCloudBlockFields,
  StatsCounterBlockFields,
  BeforeAfterBlockFields,
  TabbedShowcaseBlockFields,
} from "@/features/builder/blocks/marketing/fields";
import { AnnouncementBarBlockFields } from "@/features/announcement-bar/admin/announcement-bar-block-fields";
import {
  ProductGridBlockFields,
  ProductCarouselBlockFields,
  ProductComparisonBlockFields,
  ProductSpecificationsBlockFields,
  ProductReviewsBlockFields,
  ProductFaqBlockFields,
  RelatedProductsBlockFields,
} from "@/features/builder/blocks/commerce/product-blocks/fields";
import {
  SearchBlockFields,
  AdvancedFiltersBlockFields,
  CategoryExplorerBlockFields,
  RelatedContentBlockFields,
  RecentlyViewedBlockFields,
} from "@/features/builder/blocks/discovery/fields";
import {
  ProductShowcaseBlockFields,
  CategoryShowcaseBlockFields,
  BrandShowcaseBlockFields,
  TaxonomyProductTabsBlockFields,
  MegaCollectionBlockFields,
  ProductDiscoveryBlockFields,
} from "@/features/builder/blocks/commerce/commerce-showcase/fields";
import {
  VideoHeroBlockFields,
  VideoGalleryBlockFields,
  InteractiveHotspotsBlockFields,
  MasonryGalleryBlockFields,
} from "@/features/builder/blocks/media/fields";
import {
  StickyCtaBlockFields,
  LeadFormBlockFields,
  ContactFormBuilderBlockFields,
  MultiStepFormBlockFields,
  NewsletterSignupBlockFields,
  DownloadGateBlockFields,
} from "@/features/builder/blocks/conversion/fields";
import {
  PricingCalculatorBlockFields,
  KnowledgeBaseBlockFields,
  DocumentationNavBlockFields,
  StatusDashboardBlockFields,
  TeamDirectoryBlockFields,
  PartnerDirectoryBlockFields,
  PricingBlockFields,
} from "@/features/builder/blocks/portal/fields";
export type BlockFieldsProps = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export type BlockFieldsComponent = ComponentType<BlockFieldsProps>;

/** Dedicated admin field components registered for registry-first dispatch. */
export const BLOCK_FIELDS_REGISTRY: Partial<Record<BlockType, BlockFieldsComponent>> = {
  hero: HeroProBlockFields,
  text: TextBlockFields,
  image: ImageBlockFields,
  customHtml: CustomHtmlBlockFields,
  advancedRichText: AdvancedRichTextBlockFields,
  markdown: MarkdownBlockFields,
  code: CodeBlockFields,
  table: TableBlockFields,
  timeline: TimelineBlockFields,
  changelog: ChangelogBlockFields,
  comparison: ComparisonBlockFields,
  video: VideoBlockFields,
  cta: CtaBannerBlockFields,
  featureGrid: FeatureGridBlockFields,
  benefitsGrid: BenefitsGridBlockFields,
  announcementBar: AnnouncementBarBlockFields,
  trustBadges: TrustBadgesBlockFields,
  logoCloud: LogoCloudBlockFields,
  statsCounter: StatsCounterBlockFields,
  beforeAfter: BeforeAfterBlockFields,
  tabbedShowcase: TabbedShowcaseBlockFields,
  productGrid: ProductGridBlockFields,
  productCarousel: ProductCarouselBlockFields,
  productComparison: ProductComparisonBlockFields,
  productSpecifications: ProductSpecificationsBlockFields,
  productReviews: ProductReviewsBlockFields,
  productFaq: ProductFaqBlockFields,
  relatedProducts: RelatedProductsBlockFields,
  searchBlock: SearchBlockFields,
  advancedFilters: AdvancedFiltersBlockFields,
  categoryExplorer: CategoryExplorerBlockFields,
  relatedContent: RelatedContentBlockFields,
  recentlyViewed: RecentlyViewedBlockFields,
  productShowcase: ProductShowcaseBlockFields,
  categoryShowcase: CategoryShowcaseBlockFields,
  brandShowcase: BrandShowcaseBlockFields,
  taxonomyProductTabs: TaxonomyProductTabsBlockFields,
  megaCollectionShowcase: MegaCollectionBlockFields,
  productDiscovery: ProductDiscoveryBlockFields,
  videoHero: VideoHeroBlockFields,
  videoGallery: VideoGalleryBlockFields,
  interactiveHotspots: InteractiveHotspotsBlockFields,
  masonryGallery: MasonryGalleryBlockFields,
  stickyCta: StickyCtaBlockFields,
  leadForm: LeadFormBlockFields,
  contactFormBuilder: ContactFormBuilderBlockFields,
  multiStepForm: MultiStepFormBlockFields,
  newsletterSignup: NewsletterSignupBlockFields,
  downloadGate: DownloadGateBlockFields,
  pricingCalculator: PricingCalculatorBlockFields,
  knowledgeBase: KnowledgeBaseBlockFields,
  documentationNav: DocumentationNavBlockFields,
  statusDashboard: StatusDashboardBlockFields,
  teamDirectory: TeamDirectoryBlockFields,
  partnerDirectory: PartnerDirectoryBlockFields,
  pricing: PricingBlockFields,
};

/**
 * Types that still use the legacy switch / contact registry / inline fields
 * in block-field-editor.tsx. Must stay in sync until fully migrated.
 */
export const BLOCK_FIELDS_LEGACY_TYPES = new Set<BlockType>([
  "richText",
  "gallery",
  "faq",
  "faqSetGrid",
  "testimonials",
  "catalog",
  "contentList",
  "spacer",
  "divider",
  "section",
  "rowSection",
  "contactSection",
  "contactMap",
  "contactLocation",
  "contactPhone",
  "contactSocial",
]);

/** View keys for registry-first public render (lazy module keys). */
export const BLOCK_VIEW_KEYS: Record<BlockType, string> = Object.fromEntries(
  BLOCK_DEFINITIONS.map((def) => [def.type, def.componentKey || `block.view.${def.type}`]),
) as Record<BlockType, string>;

/** Fields keys for registry-first admin edit. */
export const BLOCK_FIELDS_KEYS: Record<BlockType, string> = Object.fromEntries(
  BLOCK_DEFINITIONS.map((def) => [
    def.type,
    BLOCK_FIELDS_REGISTRY[def.type]
      ? `block.fields.${def.type}`
      : `block.fields.legacy.${def.type}`,
  ]),
) as Record<BlockType, string>;

/**
 * Types rendered via the legacy switch in block-renderer.tsx.
 * Every definition type must appear here or in BLOCK_VIEW_EXTRACTED_TYPES.
 */
export const BLOCK_VIEW_LEGACY_TYPES = new Set<BlockType>(
  BLOCK_DEFINITIONS.map((def) => def.type),
);

/** Types with a dedicated extracted view module (subset; grows over time). */
export const BLOCK_VIEW_EXTRACTED_TYPES = new Set<BlockType>([
  "advancedRichText",
  "code",
  "markdown",
  "table",
  "timeline",
  "customHtml",
  "changelog",
  "comparison",
  "image",
  "video",
]);

export function resolveBlockFieldsComponent(type: BlockType): BlockFieldsComponent | "legacy" | null {
  const registered = BLOCK_FIELDS_REGISTRY[type];
  if (registered) return registered;
  if (BLOCK_FIELDS_LEGACY_TYPES.has(type)) return "legacy";
  return null;
}

export function hasBlockViewDispatch(type: BlockType): boolean {
  return BLOCK_VIEW_EXTRACTED_TYPES.has(type) || BLOCK_VIEW_LEGACY_TYPES.has(type);
}

export function hasBlockFieldsDispatch(type: BlockType): boolean {
  return resolveBlockFieldsComponent(type) !== null;
}

export function listOrphanBlockViewTypes(): BlockType[] {
  return BLOCK_DEFINITIONS.map((d) => d.type).filter((type) => !hasBlockViewDispatch(type));
}

export function listOrphanBlockFieldsTypes(): BlockType[] {
  return BLOCK_DEFINITIONS.map((d) => d.type).filter((type) => !hasBlockFieldsDispatch(type));
}

export function getCmsBlockDispatchCoverage() {
  return {
    definitionCount: BLOCK_DEFINITIONS.length,
    fieldsRegistered: Object.keys(BLOCK_FIELDS_REGISTRY).length,
    fieldsLegacy: BLOCK_FIELDS_LEGACY_TYPES.size,
    viewExtracted: BLOCK_VIEW_EXTRACTED_TYPES.size,
    viewLegacy: BLOCK_VIEW_LEGACY_TYPES.size,
    orphanViews: listOrphanBlockViewTypes(),
    orphanFields: listOrphanBlockFieldsTypes(),
  };
}
