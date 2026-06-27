import type { PageBlocks } from "@/types/builder";
import type { ContentFieldDefinition } from "@/features/content/types";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import type { EntityDetailTemplateId } from "@/view-models/types";
import type { ContentPresetAttributeSection } from "@/view-models/content-preset-detail";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import type { WhatsAppPageButtonSettings } from "@/features/whatsapp/whatsapp.schema";

export type EntityMediaViewModel = {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
};

export type EntityDetailViewModel = {
  templateId: EntityDetailTemplateId;
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
  media: EntityMediaViewModel[];
  blocks: PageBlocks;
  showInquiry: boolean;
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
  pageTranslationBundle: TranslationBundle;
  whatsappAppearance: WhatsAppPageButtonSettings;
};
