import { z } from "zod";
import { catalogPropsSchema, DEFAULT_DISPLAY_SETTINGS } from "@/schemas/catalog/display-settings";
import {
  blockAnimationSettingsSchema,
  blockLocalizationSettingsSchema,
  blockResponsiveSettingsSchema,
  blockSeoSettingsSchema,
  blockStyleSettingsSchema,
  blockVisibilityRulesSchema,
} from "@/schemas/block-system";

export * from "./props";

export const blockTypeSchema = z.enum([
  "hero",
  "text",
  "image",
  "gallery",
  "faq",
  "testimonials",
  "pricing",
  "cta",
  "video",
  "richText",
  "catalog",
  "contentList",
  "customHtml",
  "spacer",
  "divider",
  "section",
  "inquiryForm",
]);

export const blockNodeSchema: z.ZodType<{
  id: string;
  type: z.infer<typeof blockTypeSchema>;
  version?: string;
  props: Record<string, unknown>;
  settings?: Record<string, unknown>;
  styles?: z.infer<typeof blockStyleSettingsSchema>;
  responsive?: z.infer<typeof blockResponsiveSettingsSchema>;
  localization?: z.infer<typeof blockLocalizationSettingsSchema>;
  visibility?: z.infer<typeof blockVisibilityRulesSchema>;
  seo?: z.infer<typeof blockSeoSettingsSchema>;
  animation?: z.infer<typeof blockAnimationSettingsSchema>;
  children?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: blockTypeSchema,
    version: z.string().optional(),
    props: z.record(z.unknown()),
    settings: z.record(z.unknown()).optional(),
    styles: blockStyleSettingsSchema.optional(),
    responsive: blockResponsiveSettingsSchema.optional(),
    localization: blockLocalizationSettingsSchema.optional(),
    visibility: blockVisibilityRulesSchema.optional(),
    seo: blockSeoSettingsSchema.optional(),
    animation: blockAnimationSettingsSchema.optional(),
    children: z.array(blockNodeSchema).optional(),
  })
);

export const pageBlocksSchema = z.array(blockNodeSchema);

export function createBlock(type: z.infer<typeof blockTypeSchema>, props: Record<string, unknown> = {}) {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    version: "2.0" as const,
    props,
    settings: props,
    styles: {},
    responsive: {},
    visibility: {},
    seo: {},
    animation: { enabled: false },
    children: type === "section" ? [] : undefined,
  };
}

export const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    titleEn: "Welcome",
    titleAr: "مرحباً",
    subtitleEn: "",
    subtitleAr: "",
    imageUrl: "",
    mediaAssetId: "",
    ctaLabelEn: "Learn more",
    ctaLabelAr: "اعرف المزيد",
    ctaHref: "/contact",
  },
  text: { contentEn: "", contentAr: "" },
  image: { mediaAssetId: "", url: "", altEn: "", altAr: "" },
  gallery: {
    titleEn: "Gallery",
    titleAr: "المعرض",
    gallerySlug: "",
    columns: 3,
    limit: 0,
    showViewAllLink: true,
  },
  faq: { titleEn: "FAQ", titleAr: "الأسئلة الشائعة", faqSetSlug: "", limit: 0 },
  testimonials: {
    titleEn: "Testimonials",
    titleAr: "آراء العملاء",
    source: "collection",
    testimonialCollectionSlug: "home",
    testimonialIds: [],
    limit: 6,
    layoutMode: "grid",
    sliderEnabled: false,
    columns: 3,
    cardVariant: "default",
    showViewAllLink: true,
    autoplay: false,
    autoplayIntervalMs: 5000,
  },
  pricing: {
    titleEn: "Pricing",
    titleAr: "الأسعار",
    packageCategorySlug: "",
    limit: 3,
    showFeaturedOnly: false,
  },
  cta: {
    titleEn: "Ready to travel?",
    titleAr: "هل أنت مستعد للسفر؟",
    buttonEn: "Contact us",
    buttonAr: "تواصل معنا",
    href: "/contact",
  },
  video: { titleEn: "", titleAr: "", url: "", captionEn: "", captionAr: "" },
  richText: { htmlEn: "", htmlAr: "" },
  catalog: {
    source: "packages",
    titleEn: "Catalog",
    titleAr: "العروض",
    subtitleEn: "",
    subtitleAr: "",
    categorySlug: "",
    city: "",
    serviceType: "",
    featuredOnly: false,
    manualIds: [],
    limit: 6,
    displaySettings: DEFAULT_DISPLAY_SETTINGS,
    viewAllHref: "",
    emptyMessageEn: "",
    emptyMessageAr: "",
  },
  contentList: {
    contentTypeSlug: "catalog-items",
    collectionSlug: "",
    titleEn: "Featured items",
    titleAr: "عناصر مميزة",
    subtitleEn: "",
    subtitleAr: "",
    featuredOnly: false,
    manualIds: [],
    limit: 6,
    attributeFilters: {},
    displaySettings: DEFAULT_DISPLAY_SETTINGS,
    viewAllHref: "",
    emptyMessageEn: "",
    emptyMessageAr: "",
  },
  customHtml: { htmlEn: "", htmlAr: "" },
  spacer: { height: 48 },
  divider: { style: "solid" },
  section: { padding: "default", background: "default" },
  inquiryForm: {
    titleEn: "Send an Inquiry",
    titleAr: "أرسل استفساراً",
    type: "CONTACT",
  },
};
