import { z } from "zod";
import { postFeaturedImageSettingsSchema } from "@/schemas/featured-image-settings";

export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]);

export const cmsPageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  templateKey: z.string().optional(),
  status: contentStatusSchema.default("DRAFT"),
});

export const postSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  authorId: z.string().optional().nullable(),
  featuredImageId: z.string().optional().nullable(),
  featuredImageSettings: postFeaturedImageSettingsSchema.optional(),
  status: contentStatusSchema.default("DRAFT"),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  relatedPostIds: z.array(z.string()).optional(),
});

export const postCategorySchema = z.object({
  slug: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const postTagSchema = z.object({
  slug: z.string().min(1),
});

export const postAuthorSchema = z.object({
  name: z.string().min(1),
  avatarUrl: z.string().optional().nullable(),
});
