import type { TranslationStatus } from "@prisma/client";

export type TranslatableEntityType =
  | "BuilderBlock"
  | "CatalogCollection"
  | "CmsPage"
  | "CompanyInfo"
  | "ContentCollection"
  | "ContentItem"
  | "ContentItemMedia"
  | "ContentType"
  | "Custom404"
  | "DocPortal"
  | "DocSection"
  | "DocVersion"
  | "EmailTemplate"
  | "FaqItem"
  | "FaqSet"
  | "Footer"
  | "FooterColumn"
  | "FooterLink"
  | "Gallery"
  | "GalleryMedia"
  | "HeaderAction"
  | "KnowledgeArticle"
  | "KnowledgeBase"
  | "KnowledgeCategory"
  | "MediaAsset"
  | "MegaMenuPanel"
  | "MegaMenuTab"
  | "MenuItem"
  | "Navigation"
  | "Partner"
  | "PartnerCategory"
  | "PartnerProgram"
  | "Post"
  | "PostAuthor"
  | "PostCategory"
  | "PostTag"
  | "PricingCalculator"
  | "PricingCalculatorField"
  | "PricingPlan"
  | "PricingPlanFeature"
  | "PricingPlanSet"
  | "Product"
  | "ReleaseEntry"
  | "ReleaseSet"
  | "SeoMeta"
  | "SiteIdentity"
  | "StatusBoard"
  | "StatusIncident"
  | "StatusMaintenance"
  | "StatusService"
  | "TeamDepartment"
  | "TeamDirectory"
  | "TeamMember"
  | "Testimonial"
  | "TestimonialCollection";

export type TranslationRecord = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status: TranslationStatus;
};

export type LocalizedValueMap = Record<string, string>;

export type EntityTranslationInput = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status?: TranslationStatus;
  changedBy?: string;
};

export type TranslationCompletionStats = {
  entityType: string;
  totalFields: number;
  translatedFields: number;
  percentage: number;
  missingCount: number;
};

export type EntityLocaleCompletion = {
  totalRequired: number;
  translatedRequired: number;
  percentage: number;
};

export type EntityCompletionStats = {
  entityType: string;
  entityId: string;
  locales: Record<string, EntityLocaleCompletion>;
};

export type MissingTranslation = {
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  sourceValue?: string;
};

export type BulkCopyOptions = {
  entityType: string;
  entityId: string;
  sourceLocaleCode: string;
  targetLocaleCode: string;
  fields?: string[];
  status?: TranslationStatus;
};
