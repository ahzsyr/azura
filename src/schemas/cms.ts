import { z } from "zod";

export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]);

export const cmsPageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  excerptEn: z.string().optional(),
  excerptAr: z.string().optional(),
  templateKey: z.string().optional(),
  status: contentStatusSchema.default("DRAFT"),
});

export const postSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  excerptEn: z.string().optional(),
  excerptAr: z.string().optional(),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  authorId: z.string().optional().nullable(),
  featuredImageId: z.string().optional().nullable(),
  status: contentStatusSchema.default("DRAFT"),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  relatedPostIds: z.array(z.string()).optional(),
});

export const postCategorySchema = z.object({
  slug: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const postTagSchema = z.object({
  slug: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
});

export const postAuthorSchema = z.object({
  name: z.string().min(1),
  bioEn: z.string().optional(),
  bioAr: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
});
