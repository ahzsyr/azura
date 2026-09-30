import { z } from "zod";
import { displaySettingsSchema, DEFAULT_DISPLAY_SETTINGS } from "@/schemas/content/display-settings";

export const contentPresetIdSchema = z.enum(["destination", "service", "property"]);

export const contentCardTemplateIdSchema = z.enum([
  "destination-card",
  "service-card",
  "property-card",
]);

export const contentEntityBindingSchema = z.object({
  presetId: contentPresetIdSchema.optional(),
  templateId: contentCardTemplateIdSchema.optional(),
});

export const contentListBlockPropsSchema = z.object({
  contentTypeSlug: z.string().default("catalog-items"),
  collectionSlug: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  featuredOnly: z.boolean().default(false),
  manualIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  attributeFilters: z.record(z.string()).default({}),
  displaySettings: displaySettingsSchema.default(DEFAULT_DISPLAY_SETTINGS),
  viewAllHref: z.string().default(""),
  emptyMessage: z.string().default(""),
  ...contentEntityBindingSchema.shape,
});

export type ContentListBlockProps = z.infer<typeof contentListBlockPropsSchema>;

export function parseContentListBlockProps(raw: Record<string, unknown>): ContentListBlockProps {
  return contentListBlockPropsSchema.parse(raw);
}
