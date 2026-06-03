import type { PageBlocks } from "@/types/builder";
import { createBlock } from "@/schemas/blocks";

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
  visa: "/visa",
  "hotels-transport": "/hotels-transport",
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
    description: "Hero, packages, testimonials, CTA",
    blocks: [
      createBlock("hero", {
        titleEn: "Premium Umrah & Islamic Travel",
        titleAr: "عمرة فاخرة وسفر إسلامي",
        subtitleEn: "Trusted journeys to the holy cities",
        subtitleAr: "رحلات موثوقة إلى المدن المقدسة",
        ctaLabelEn: "View packages",
        ctaLabelAr: "عرض الباقات",
        ctaHref: "/packages",
      }),
      createBlock("catalog", {
        source: "packages",
        titleEn: "Our Packages",
        titleAr: "باقاتنا",
        limit: 6,
      }),
      createBlock("testimonials", {
        titleEn: "What travelers say",
        titleAr: "آراء المسافرين",
        source: "collection",
        testimonialCollectionSlug: "home",
        limit: 3,
        layoutMode: "grid",
        columns: 3,
        cardVariant: "default",
      }),
      createBlock("cta", {
        titleEn: "Start your journey",
        titleAr: "ابدأ رحلتك",
        buttonEn: "Contact us",
        buttonAr: "تواصل معنا",
        href: "/contact",
      }),
    ] as PageBlocks,
  },
  about: {
    name: "About page",
    description: "Hero, story text, and contact CTA",
    blocks: [
      createBlock("hero", {
        titleEn: "About {brandName}",
        titleAr: "عن سفير المدينة",
        subtitleEn: "Your companion for sacred travel",
        subtitleAr: "رفيقك في السفر المقدس",
      }),
      createBlock("text", {
        contentEn: "Share your story and mission here.",
        contentAr: "شارك قصتكم ورسالتكم هنا.",
      }),
      createBlock("cta", { href: "/contact" }),
    ] as PageBlocks,
  },
  contact: {
    name: "Contact page",
    description: "Hero, inquiry form, and office details",
    blocks: [
      createBlock("hero", {
        titleEn: "Contact us",
        titleAr: "اتصل بنا",
        subtitleEn: "We are here to help plan your trip",
        subtitleAr: "نحن هنا لمساعدتك في التخطيط لرحلتك",
      }),
      createBlock("inquiryForm", {
        titleEn: "Send an Inquiry",
        titleAr: "أرسل استفساراً",
        type: "CONTACT",
      }),
      createBlock("text", {
        contentEn: "Office hours, phone, and inquiry details.",
        contentAr: "ساعات العمل والهاتف وتفاصيل الاستفسار.",
      }),
    ] as PageBlocks,
  },
  faq: {
    name: "FAQ page",
    description: "Hero with FAQ accordion section",
    blocks: [
      createBlock("hero", { titleEn: "Frequently asked questions", titleAr: "الأسئلة الشائعة" }),
      createBlock("faq", { titleEn: "FAQ", titleAr: "أسئلة وأجوبة", faqSetSlug: "general", limit: 0 }),
    ] as PageBlocks,
  },
  gallery: {
    name: "Gallery page",
    description: "Hero with gallery album grid",
    blocks: [
      createBlock("hero", {
        titleEn: "Journey Gallery",
        titleAr: "معرض الرحلات",
        subtitleEn: "Moments from sacred travels",
        subtitleAr: "لحظات من الرحلات المقدسة",
      }),
      createBlock("gallery", {
        titleEn: "Gallery",
        titleAr: "المعرض",
        gallerySlug: "",
        columns: 3,
        limit: 0,
        showViewAllLink: false,
      }),
    ] as PageBlocks,
  },
  testimonials: {
    name: "Testimonials page",
    description: "Hero with testimonial grid",
    blocks: [
      createBlock("hero", {
        titleEn: "Pilgrim Stories",
        titleAr: "قصص الحجاج",
        subtitleEn: "Hear from those who traveled with us",
        subtitleAr: "استمع إلى من سافروا معنا",
      }),
      createBlock("testimonials", {
        titleEn: "Testimonials",
        titleAr: "آراء العملاء",
        source: "all",
        limit: 12,
        layoutMode: "grid",
        columns: 3,
        cardVariant: "default",
        showViewAllLink: false,
      }),
    ] as PageBlocks,
  },
  visa: {
    name: "Visa services page",
    description: "Hero, FAQ, and visa inquiry form",
    blocks: [
      createBlock("hero", {
        titleEn: "Visa Services",
        titleAr: "خدمات التأشيرة",
        subtitleEn: "Expert guidance for Umrah and Islamic travel visas",
        subtitleAr: "إرشاد متخصص لتأشيرات العمرة والسفر الإسلامي",
      }),
      createBlock("faq", {
        titleEn: "Frequently Asked Questions",
        titleAr: "الأسئلة الشائعة",
        faqSetSlug: "visa",
        limit: 0,
      }),
      createBlock("inquiryForm", {
        titleEn: "Visa Inquiry",
        titleAr: "استفسار التأشيرة",
        type: "VISA",
      }),
    ] as PageBlocks,
  },
  packages: {
    name: "Packages listing page",
    description: "Hero and full packages catalog grid",
    blocks: [
      createBlock("hero", {
        titleEn: "Our Packages",
        titleAr: "باقاتنا",
        subtitleEn: "Choose the journey that fits your family",
        subtitleAr: "اختر الرحلة التي تناسب عائلتك",
      }),
      createBlock("contentList", {
        contentTypeSlug: "catalog-items",
        titleEn: "",
        titleAr: "",
        subtitleEn: "",
        subtitleAr: "",
        limit: 100,
        displaySettings: {
          limit: 100,
          showViewAllLink: false,
          columns: 3,
          layoutMode: "grid",
        },
      }),
    ] as PageBlocks,
  },
  hotels: {
    name: "Hotels & transport page",
    description: "Hero with services catalog",
    blocks: [
      createBlock("hero", {
        titleEn: "Hotels & Transportation",
        titleAr: "الفنادق والنقل",
        subtitleEn: "Premium stays and seamless travel",
        subtitleAr: "إقامة فاخرة ونقل سلس بين المدن المقدسة",
      }),
      createBlock("catalog", {
        source: "hotels",
        titleEn: "Partner Hotels",
        titleAr: "فنادق الشركاء",
        limit: 6,
      }),
      createBlock("catalog", {
        source: "services",
        titleEn: "Transportation Services",
        titleAr: "خدمات النقل",
        limit: 6,
      }),
    ] as PageBlocks,
  },
};
