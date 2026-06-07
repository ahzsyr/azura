import { z } from "zod";

export const seoMetaSchema = z.object({
  pageKey: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionAr: z.string().min(1),
  canonicalUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  robots: z.string().optional().nullable(),
  focusKeywords: z.string().optional().nullable(),
  ogTitleEn: z.string().optional().nullable(),
  ogTitleAr: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional().nullable(),
  jsonLd: z.string().optional().nullable(),
});

export const redirectSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  type: z.enum(["PERMANENT", "TEMPORARY"]).default("PERMANENT"),
  isActive: z.boolean().default(true),
});
