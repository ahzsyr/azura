import type { TranslationStatus } from "@prisma/client";

export type TranslatableEntityType =
  | "ContentItem"
  | "ContentCollection"
  | "ContentType"
  | "CmsPage"
  | "Post"
  | "PostCategory"
  | "PostTag"
  | "PostAuthor"
  | "Gallery"
  | "GalleryMedia"
  | "Testimonial"
  | "TestimonialCollection"
  | "FaqSet"
  | "FaqItem"
  | "CompanyInfo"
  | "SeoMeta"
  | "SeoSettings"
  | "Custom404"
  | "MediaAsset"
  | "ContentItemMedia"
  | "Navigation"
  | "MenuItem"
  | "Footer"
  | "FooterColumn"
  | "FooterLink"
  | "SiteIdentity"
  | "EmailTemplate"
  | "BuilderBlock";

export type TranslationRecord = {
  entityType: string;
  entityId: string;
  field: string;
  languageCode: string;
  value: string;
  status: TranslationStatus;
};

export type LocalizedValueMap = Record<string, string>;

export type EntityTranslationInput = {
  entityType: string;
  entityId: string;
  field: string;
  languageCode: string;
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

export type MissingTranslation = {
  entityType: string;
  entityId: string;
  field: string;
  languageCode: string;
  sourceValue?: string;
};

export type BulkCopyOptions = {
  entityType: string;
  entityId: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  fields?: string[];
  status?: TranslationStatus;
};
