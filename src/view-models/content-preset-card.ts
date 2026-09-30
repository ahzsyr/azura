import type { EntityPresetId } from "@/features/entities/types";
import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { ContentPresetCardTemplateId } from "@/view-models/types";

/** Flattened content preset card — no raw attributes JSON. */
export type ContentPresetCardViewModel = {
  templateId: ContentPresetCardTemplateId;
  presetId: Extract<EntityPresetId, "destination" | "service" | "property">;
  entityId: string;
  slug: string;
  contentTypeSlug: string;
  title: string;
  excerpt: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
  isFeatured: boolean;
  collectionLabel: string | null;
  display: DisplaySettings;
  price?: string | number | null;
  currency?: string;
  duration?: number | null;
  city?: string | null;
  stars?: number | null;
  icon?: string | null;
  ctaHref?: string | null;
  compareContentTypeSlug?: string;
  compareMaxItems?: number;
  compareLabel?: string;
};
