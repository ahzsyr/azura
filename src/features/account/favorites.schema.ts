import { z } from "zod";

export const favoriteEntityTypeSchema = z.enum(["CATALOG_PRODUCT", "CONTENT_ITEM"]);

export const favoriteToggleSchema = z.object({
  entityType: favoriteEntityTypeSchema,
  entityId: z.string().min(1),
  locale: z.string().default("en"),
});

export const favoriteMergeSchema = z.object({
  products: z.array(z.string().min(1)).default([]),
  contentItems: z.array(z.string().min(1)).default([]),
  locale: z.string().default("en"),
});
