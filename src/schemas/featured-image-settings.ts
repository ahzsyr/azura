import { z } from "zod";

export const featuredImageAspectRatioSchema = z.enum(["auto", "16:9", "4:3", "1:1"]);
export const featuredImageObjectFitSchema = z.enum(["cover", "contain"]);
export const featuredImageFocalPointSchema = z.enum(["center", "top", "bottom", "left", "right"]);

export const postFeaturedImageSettingsSchema = z
  .object({
    aspectRatio: featuredImageAspectRatioSchema.optional(),
    objectFit: featuredImageObjectFitSchema.optional(),
    focalPoint: featuredImageFocalPointSchema.optional(),
  })
  .partial();

export type FeaturedImageAspectRatio = z.infer<typeof featuredImageAspectRatioSchema>;
export type FeaturedImageObjectFit = z.infer<typeof featuredImageObjectFitSchema>;
export type FeaturedImageFocalPoint = z.infer<typeof featuredImageFocalPointSchema>;
export type PostFeaturedImageSettings = z.infer<typeof postFeaturedImageSettingsSchema>;

export const DEFAULT_POST_FEATURED_IMAGE_SETTINGS: PostFeaturedImageSettings = {
  aspectRatio: "16:9",
  objectFit: "cover",
  focalPoint: "center",
};

export function parsePostFeaturedImageSettings(raw: unknown): PostFeaturedImageSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_POST_FEATURED_IMAGE_SETTINGS };
  }
  const result = postFeaturedImageSettingsSchema.safeParse(raw);
  if (!result.success) return { ...DEFAULT_POST_FEATURED_IMAGE_SETTINGS };
  return { ...DEFAULT_POST_FEATURED_IMAGE_SETTINGS, ...result.data };
}

export function mergePostFeaturedImageSettings(
  partial: Partial<PostFeaturedImageSettings> | undefined,
): PostFeaturedImageSettings {
  return { ...DEFAULT_POST_FEATURED_IMAGE_SETTINGS, ...partial };
}
