import { z } from "zod";

export const seoMetaBaseSchema = z.object({
  pageKey: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  canonicalUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  robots: z.string().optional().nullable(),
  focusKeywords: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional().nullable(),
  jsonLd: z.string().optional().nullable(),
});

/** @deprecated Legacy shape — localized SEO fields live in EntityTranslation. */
export const seoMetaSchema = seoMetaBaseSchema.extend({
  title: z.string().optional(),
  description: z.string().optional(),
  ogTitle: z.string().optional().nullable(),
});

export const redirectSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  type: z.enum(["PERMANENT", "TEMPORARY"]).default("PERMANENT"),
  isActive: z.boolean().default(true),
});
