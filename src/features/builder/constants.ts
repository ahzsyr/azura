import type { PageBlocks } from "@/types/builder";
import { BUILTIN_PAGE_TEMPLATE_BLOCKS } from "./builtin-page-template-blocks";

export const BLOCK_PRESETS_NAMESPACE = "block-presets";
export const BLOCK_TEMPLATES_NAMESPACE = "block-templates";

export type BlockPresetRecord = {
  name: string;
  type: string;
  props: Record<string, unknown>;
  createdAt?: string;
};

export type PageTemplateRecord = {
  name: string;
  description?: string;
  blocks: PageBlocks;
};

/** Maps CMS templateKey / slug aliases to builtin template keys. */
export const TEMPLATE_KEY_ALIASES: Record<string, string> = {
  home: "landing",
  "hotels-transport": "hotels",
};

/** CMS slugs wired to live marketing routes (not /pages/[slug]). */
export const CMS_WIRED_MARKETING_SLUGS: Record<string, string> = {
  home: "/",
  about: "/about",
  contact: "/contact",
  packages: "/packages",
  gallery: "/gallery",
  testimonials: "/testimonials",
  "hotels-transport": "/hotels-transport",
  products: "/products",
  collections: "/collections",
  services: "/services",
  compare: "/compare",
  favorites: "/favorites",
  account: "/account",
  "smart-home": "/smart-home",
  "security-solutions": "/security-solutions",
  "enterprise-wireless": "/enterprise-wireless",
  "why-choose-us": "/why-choose-us",
};

export function resolveTemplateKey(templateKey: string, slug?: string): string {
  const key = templateKey.trim().toLowerCase();
  if (key && TEMPLATE_KEY_ALIASES[key]) return TEMPLATE_KEY_ALIASES[key];
  if (key && BUILTIN_PAGE_TEMPLATES[key]) return key;
  if (slug) {
    const slugKey = slug.trim().toLowerCase();
    if (TEMPLATE_KEY_ALIASES[slugKey]) return TEMPLATE_KEY_ALIASES[slugKey];
    if (BUILTIN_PAGE_TEMPLATES[slugKey]) return slugKey;
  }
  return key;
}

export function resolveBuiltinTemplate(
  templateKey: string,
  slug?: string
): PageTemplateRecord | undefined {
  const resolved = resolveTemplateKey(templateKey, slug);
  return BUILTIN_PAGE_TEMPLATES[resolved];
}

export const BUILTIN_PAGE_TEMPLATES: Record<string, PageTemplateRecord> = {
  landing: {
    name: "Landing page",
    description: "Hero, features, catalog, stats, testimonials, and CTA",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.landing,
  },
  about: {
    name: "About page",
    description: "Hero, story, values, and rich text",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.about,
  },
  contact: {
    name: "Contact page",
    description: "Hero, inquiry form, and contact details",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.contact,
  },
  faq: {
    name: "FAQ page",
    description: "Hero and FAQ accordion",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.faq,
  },
  gallery: {
    name: "Gallery page",
    description: "Hero and masonry gallery",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.gallery,
  },
  testimonials: {
    name: "Testimonials page",
    description: "Hero and testimonial grid",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.testimonials,
  },
  packages: {
    name: "Packages listing page",
    description: "Hero, package catalog, and FAQ",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.packages,
  },
  hotels: {
    name: "Hotels & transport page",
    description: "Hero, hotels, and transport catalogs",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.hotels,
  },
  products: {
    name: "Products listing page",
    description: "Hero and product grid",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.products,
  },
  collections: {
    name: "Collections listing page",
    description: "Hero and collection explorer",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.collections,
  },
  services: {
    name: "Services page",
    description: "Hero, feature grid, and service catalog",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.services,
  },
  compare: {
    name: "Compare page",
    description: "Hero and product comparison table",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.compare,
  },
  favorites: {
    name: "Favorites page",
    description: "Hero and saved items",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.favorites,
  },
  account: {
    name: "Account page",
    description: "Hero and account intro",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.account,
  },
};
