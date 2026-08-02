import type { DisplaySettings } from "@/schemas/content/display-settings";
import type { EntityCardTemplateId } from "@/view-models/types";

/** Generic custom entity card — schema-driven content types without code presets. */
export type EntityCardViewModel = {
  templateId: EntityCardTemplateId;
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
};
