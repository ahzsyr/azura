import type { EntityPresetId } from "@/features/entities/types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { Collection } from "@/features/collections/types";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { ProductCardViewModel } from "@/view-models/product-card";
import type { ProductDetailViewModel } from "@/view-models/product-detail";

import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import type { ContentPresetDetailViewModel } from "@/view-models/content-preset-detail";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import type { KnowledgeArticleDetailViewModel } from "@/view-models/knowledge-article-detail";
import type { TeamMemberCardViewModel } from "@/view-models/team-member-card";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { ContentFieldDefinition } from "@/features/content/types";
import type { EntityCardViewModel } from "@/view-models/entity-card";
import type { EntityDetailViewModel } from "@/view-models/entity-detail";

export type EntityCardTemplateId = "entity-card";
export type EntityDetailTemplateId = "entity-detail";
export type EntityListTemplateId = "entity-list";

export type ContentPresetCardTemplateId =
  | "destination-card"
  | "service-card"
  | "property-card";

export type ContentPresetDetailTemplateId =
  | "destination-detail"
  | "service-detail"
  | "property-detail";

export type KnowledgeArticleCardTemplateId = "knowledge-article-card";

export type KnowledgeArticleDetailTemplateId = "knowledge-article-detail";

export type KnowledgeCategoryListTemplateId = "knowledge-category-list";

export type TeamMemberCardTemplateId = "member-card";

export type PartnerCardTemplateId = "partner-card";

export type PricingPlanCardTemplateId = "plan-card";

/** Shipped template identifiers with active resolvers. */
export type ActiveTemplateId =
  | "product-card"
  | "product-detail"
  | EntityCardTemplateId
  | EntityDetailTemplateId
  | EntityListTemplateId
  | ContentPresetCardTemplateId
  | ContentPresetDetailTemplateId
  | KnowledgeArticleCardTemplateId
  | KnowledgeArticleDetailTemplateId
  | TeamMemberCardTemplateId
  | PartnerCardTemplateId
  | PricingPlanCardTemplateId;

/** Registered template identifiers (active + planned stubs). */
export type TemplateId =
  | ActiveTemplateId
  | "product-compare"
  | EntityCardTemplateId
  | EntityDetailTemplateId
  | EntityListTemplateId
  | "destination-card"
  | "destination-detail"
  | "service-card"
  | "service-detail"
  | "property-card"
  | "property-detail"
  | "member-card"
  | PartnerCardTemplateId
  | KnowledgeArticleCardTemplateId
  | KnowledgeArticleDetailTemplateId
  | KnowledgeCategoryListTemplateId
  | PricingPlanCardTemplateId
  | "plan-compare";

export type TemplateVariant = "card" | "detail" | "compare" | "featured";

export type TemplateStatus = "active" | "planned";

export type ResolverContext = {
  locale: string;
  localePrefix: string;
  numberLocale?: string;
  site?: Record<string, unknown>;
  cardTheme?: ProductCardTheme;
  priority?: boolean;
  linkPrefetch?: boolean;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
  layoutRules?: ProductPageLayoutRules;
  elementsRules?: ProductPageElementsRules;
  overflow?: ResolvedProductPageOverflow;
  allCollections?: Collection[];
  quoteCta?: ResolvedProductCtaConfig;
  siteProductCta?: unknown;
  displaySettings?: DisplaySettings;
  compareProps?: {
    contentTypeSlug: string;
    maxItems: number;
    label?: string;
  };
  contentTypeSlug?: string;
  fieldSchema?: ContentFieldDefinition[];
};

export type ViewModel =
  | ProductCardViewModel
  | ProductDetailViewModel
  | ContentPresetCardViewModel
  | ContentPresetDetailViewModel
  | EntityCardViewModel
  | EntityDetailViewModel
  | KnowledgeArticleCardViewModel
  | KnowledgeArticleDetailViewModel
  | TeamMemberCardViewModel
  | PartnerCardViewModel
  | PricingPlanCardViewModel;

export type TemplateDefinition = {
  id: TemplateId;
  presetId?: EntityPresetId;
  variant: TemplateVariant;
  status: TemplateStatus;
  label: string;
};
