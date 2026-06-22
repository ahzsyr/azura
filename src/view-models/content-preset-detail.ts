import type { PageBlocks } from "@/types/builder";
import type { ContentFieldDefinition } from "@/features/content/types";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import type { ContentPresetDetailTemplateId } from "@/view-models/types";
import type { EntityPresetId } from "@/features/entities/types";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import type { WhatsAppPageButtonSettings } from "@/features/whatsapp/whatsapp.schema";

export type ContentPresetMediaViewModel = {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
};

export type ContentPresetAttributeRow = {
  key: string;
  label: string;
  value: string;
};

export type ContentPresetAttributeSection = {
  title: string;
  rows: ContentPresetAttributeRow[];
};

export type ContentPresetDetailViewModel = {
  templateId: ContentPresetDetailTemplateId;
  presetId: Extract<EntityPresetId, "destination" | "service" | "property">;
  entityId: string;
  slug: string;
  locale: string;
  path: string;
  contentTypeSlug: string;
  contentTypeId: string;
  routePrefix: string | null;
  title: string;
  excerpt: string;
  description: string;
  coverUrl: string;
  coverAlt: string;
  media: ContentPresetMediaViewModel[];
  blocks: PageBlocks;
  price: number | null;
  currency: string;
  showInquiry: boolean;
  comparable: boolean;
  compareMaxItems: number;
  compareLabel: string;
  attributeSections: ContentPresetAttributeSection[];
  collectionLabel: string | null;
  whatsappPhone: string;
  whatsappMessage: string;
  brandName: string;
  siteUrl: string;
  fieldSchema: ContentFieldDefinition[];
  itemTranslations: EntityTranslation[];
  collectionTranslations: EntityTranslation[];
  enabledLocales: PublicLocale[];
  defaultCode: string;
  discoveryCategorySlugs: string[];
  discoveryTags: string[];
  pageTranslationBundle: TranslationBundle;
  whatsappAppearance: WhatsAppPageButtonSettings;
};
