import { z } from "zod";
import { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS } from "@/schemas/catalog/display-settings";

export { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS };

export const heroPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  subtitleEn: z.string().default(""),
  subtitleAr: z.string().default(""),
  imageUrl: z.string().default(""),
  mediaAssetId: z.string().default(""),
  ctaLabelEn: z.string().default(""),
  ctaLabelAr: z.string().default(""),
  ctaHref: z.string().default("/contact"),
});

export const textPropsSchema = z.object({
  contentEn: z.string().default(""),
  contentAr: z.string().default(""),
});

export const imagePropsSchema = z.object({
  url: z.string().default(""),
  mediaAssetId: z.string().default(""),
  altEn: z.string().default(""),
  altAr: z.string().default(""),
});

export const galleryPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  gallerySlug: z.string().default(""),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  limit: z.coerce.number().default(0),
  showViewAllLink: z.boolean().default(true),
});

export const faqPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  faqSetSlug: z.string().default(""),
  limit: z.coerce.number().default(0),
});

export const testimonialsPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  source: z.enum(["all", "collection", "manual"]).default("all"),
  testimonialCollectionSlug: z.string().default(""),
  testimonialIds: z.array(z.string()).default([]),
  limit: z.coerce.number().default(6),
  layoutMode: z.enum(["grid", "slider"]).default("grid"),
  sliderEnabled: z.boolean().default(false),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  cardVariant: z.enum(["default", "compact", "minimal", "featured"]).default("default"),
  showViewAllLink: z.boolean().default(true),
  autoplay: z.boolean().default(false),
  autoplayIntervalMs: z.coerce.number().default(5000),
});

export const pricingPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  packageCategorySlug: z.string().default(""),
  limit: z.coerce.number().default(3),
  showFeaturedOnly: z.boolean().default(false),
});

export const ctaPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  buttonEn: z.string().default(""),
  buttonAr: z.string().default(""),
  href: z.string().default("/contact"),
});

export const videoPropsSchema = z.object({
  titleEn: z.string().default(""),
  titleAr: z.string().default(""),
  url: z.string().default(""),
  captionEn: z.string().default(""),
  captionAr: z.string().default(""),
});

export const richTextPropsSchema = z.object({
  htmlEn: z.string().default(""),
  htmlAr: z.string().default(""),
});

export const customHtmlPropsSchema = z.object({
  htmlEn: z.string().default(""),
  htmlAr: z.string().default(""),
});

export const spacerPropsSchema = z.object({
  height: z.coerce.number().default(48),
});

export const dividerPropsSchema = z.object({
  style: z.enum(["solid", "dashed", "gold"]).default("solid"),
});

export const sectionPropsSchema = z.object({
  padding: z.enum(["none", "default", "large"]).default("default"),
  background: z.enum(["default", "muted", "primary"]).default("default"),
});
