import type { BlockNode } from "@/types/builder";

let blockCounter = 0;

export function resetBlockCounter() {
  blockCounter = 0;
}

export function blockId(prefix: string): string {
  blockCounter += 1;
  return `${prefix}-${blockCounter}`;
}

export function makeBlock(
  type: BlockNode["type"],
  props: Record<string, unknown>,
  id?: string
): BlockNode {
  return {
    id: id ?? blockId(type),
    type,
    version: "2.0",
    props,
  };
}

export function hero(props: {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  mediaAssetId?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  layout?: "centered" | "splitImageLeft" | "splitImageRight" | "fullBleed";
  minHeight?: "50vh" | "70vh" | "85vh";
}): BlockNode {
  return makeBlock("hero", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    badge: props.badge ?? "",
    imageUrl: props.imageUrl ?? "",
    mediaAssetId: props.mediaAssetId ?? "",
    ctaLabel: props.ctaLabel ?? "",
    ctaHref: props.ctaHref ?? "/contact",
    secondaryCtaLabel: props.secondaryCtaLabel ?? "",
    secondaryCtaHref: props.secondaryCtaHref ?? "",
    layout: props.layout ?? "centered",
    minHeight: props.minHeight ?? "70vh",
    backgroundType: props.imageUrl ? "image" : "gradient",
    overlayOpacity: 60,
  });
}

export function statsCounter(props: {
  title?: string;
  subtitle?: string;
  items: { value: number; suffix?: string; prefix?: string; label: string }[];
}): BlockNode {
  return makeBlock("statsCounter", {
    title: props.title ?? "",
    subtitle: props.subtitle ?? "",
    layout: "grid",
    animateOnView: true,
    items: props.items.map((item, i) => ({
      id: `stat-${i + 1}`,
      value: item.value,
      suffix: item.suffix ?? "",
      prefix: item.prefix ?? "",
      label: item.label,
      description: "",
      icon: "",
      chartType: "none",
      chartData: [],
    })),
  });
}

export function featureGrid(props: {
  title: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  items: {
    title: string;
    description: string;
    icon?: string;
    href?: string;
    imageUrl?: string;
    mediaAssetId?: string;
  }[];
}): BlockNode {
  return makeBlock("featureGrid", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    columns: props.columns ?? 3,
    cardVariant: "iconTop",
    showCategories: false,
    items: props.items.map((item, i) => ({
      id: `feat-${i + 1}`,
      icon: item.icon ?? "fa-star",
      imageUrl: item.imageUrl ?? "",
      mediaAssetId: item.mediaAssetId ?? "",
      title: item.title,
      description: item.description,
      href: item.href ?? "",
      category: "",
      linkLabel: "",
      metric: "",
    })),
  });
}

export function benefitsGrid(props: {
  title: string;
  subtitle?: string;
  layout?: "cards" | "list" | "numbered" | "twoColumn";
  items: {
    title: string;
    description: string;
    icon?: string;
  }[];
}): BlockNode {
  return makeBlock("benefitsGrid", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    layout: props.layout ?? "cards",
    emphasis: "outcome",
    items: props.items.map((item, i) => ({
      id: `benefit-${i + 1}`,
      icon: item.icon ?? "fa-check",
      imageUrl: "",
      mediaAssetId: "",
      title: item.title,
      description: item.description,
      href: "",
      category: "",
      linkLabel: "",
      metric: "",
    })),
  });
}

export function catalog(props: {
  source: "packages" | "hotels" | "services";
  title: string;
  subtitle?: string;
  limit?: number;
  viewAllHref?: string;
  featuredOnly?: boolean;
}): BlockNode {
  return makeBlock("catalog", {
    source: props.source,
    title: props.title,
    subtitle: props.subtitle ?? "",
    categorySlug: "",
    city: "",
    serviceType: "",
    featuredOnly: props.featuredOnly ?? false,
    manualIds: [],
    limit: props.limit ?? 6,
    viewAllHref: props.viewAllHref ?? "",
    emptyMessage: "",
    displaySettings: {
      cardVariant: "default",
      layoutMode: "grid",
      columns: 3,
      limit: props.limit ?? 6,
      showViewAllLink: true,
      showPrice: true,
      showDuration: true,
      showCategory: true,
      showStars: true,
      showCity: true,
      showIcon: true,
      showExcerpt: true,
      autoplay: false,
      autoplayIntervalMs: 5000,
    },
  });
}

export function testimonialsBlock(props: {
  title: string;
  subtitle?: string;
  collectionSlug: string;
  limit?: number;
}): BlockNode {
  return makeBlock("testimonials", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    source: "collection",
    testimonialCollectionSlug: props.collectionSlug,
    testimonialIds: [],
    limit: props.limit ?? 6,
    layoutMode: "grid",
    sliderEnabled: false,
    columns: 3,
    cardVariant: "default",
    showViewAllLink: true,
    autoplay: false,
    autoplayIntervalMs: 5000,
  });
}

export function logoCloud(props: {
  title?: string;
  items: { name: string; imageUrl?: string; mediaAssetId?: string }[];
}): BlockNode {
  return makeBlock("logoCloud", {
    title: props.title ?? "",
    subtitle: "",
    displayMode: "grid",
    columns: 3,
    grayscale: true,
    grayscaleHover: true,
    autoplay: false,
    autoplayIntervalMs: 4000,
    logoSize: "md",
    groupByCategory: false,
    items: props.items.map((item, i) => ({
      id: `logo-${i + 1}`,
      name: item.name,
      imageUrl: item.imageUrl ?? "",
      mediaAssetId: item.mediaAssetId ?? "",
      href: "",
      category: "",
    })),
  });
}

export function cta(props: {
  title: string;
  subtitle?: string;
  button: string;
  href?: string;
}): BlockNode {
  return makeBlock("cta", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    button: props.button,
    href: props.href ?? "/contact",
    secondaryButton: "",
    secondaryHref: "",
    layout: "centered",
    size: "default",
    backgroundType: "gradient",
  });
}

export function advancedRichText(props: {
  html: string;
}): BlockNode {
  return makeBlock("advancedRichText", {
    content: "",
    html: props.html,
    maxWidth: "reading",
    prose: true,
  });
}

export function richText(props: {
  content: string;
}): BlockNode {
  return makeBlock("richText", {
    html: props.content,
  });
}

export function timeline(props: {
  title: string;
  items: { title: string; description: string }[];
}): BlockNode {
  return makeBlock("timeline", {
    title: props.title,
    layout: "vertical",
    items: props.items.map((item, i) => ({
      id: `step-${i + 1}`,
      title: item.title,
      description: item.description,
      date: String(i + 1),
      icon: "fa-circle",
      imageUrl: "",
      category: "",
    })),
  });
}

export function trustBadges(props: {
  title?: string;
  items: { label: string; icon?: string }[];
}): BlockNode {
  return makeBlock("trustBadges", {
    title: props.title ?? "",
    subtitle: "",
    layout: "grid",
    registrationNo: "",
    items: props.items.map((item, i) => ({
      id: `badge-${i + 1}`,
      icon: item.icon ?? "fa-shield",
      imageUrl: "",
      mediaAssetId: "",
      label: item.label,
      description: "",
      href: "",
    })),
  });
}

export function faqBlock(props: {
  title: string;
  faqSetSlug: string;
  limit?: number;
}): BlockNode {
  return makeBlock("faq", {
    title: props.title,
    faqSetSlug: props.faqSetSlug,
    limit: props.limit ?? 0,
  });
}

export function galleryBlock(props: {
  title: string;
  gallerySlug: string;
  columns?: 2 | 3 | 4;
}): BlockNode {
  return makeBlock("gallery", {
    title: props.title,
    gallerySlug: props.gallerySlug,
    columns: props.columns ?? 3,
    limit: 0,
    showViewAllLink: true,
    variant: "grid",
  });
}

export function masonryGallery(props: {
  title: string;
  subtitle?: string;
  gallerySlug: string;
}): BlockNode {
  return makeBlock("masonryGallery", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    source: "album",
    gallerySlug: props.gallerySlug,
    items: [],
    columns: 3,
    limit: 0,
    enableLightbox: true,
    enableFilter: false,
    lazyLoad: true,
  });
}

export function contactFormBuilder(props: {
  title: string;
  templateId: string;
}): BlockNode {
  return makeBlock("contactFormBuilder", {
    title: props.title,
    templateId: props.templateId,
    layout: "stacked",
    successMessage: "Thank you! We will be in touch shortly.",
    redirectUrl: "",
  });
}

export function inquiryForm(props: {
  title: string;
  type?: "CONTACT" | "VISA" | "PACKAGE";
}): BlockNode {
  return makeBlock("inquiryForm", {
    title: props.title,
    type: props.type ?? "CONTACT",
  });
}

export function productShowcase(props: {
  title: string;
  subtitle?: string;
  source?: string;
  layout?: string;
  mode?: string;
}): BlockNode {
  return makeBlock("productShowcase", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    source: props.source ?? "featured",
    layout: props.layout ?? "carousel",
    mode: props.mode ?? "single",
  });
}

export function categoryShowcase(props: {
  title: string;
  subtitle?: string;
  layout?: string;
  source?: string;
}): BlockNode {
  return makeBlock("categoryShowcase", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    layout: props.layout ?? "grid",
    source: props.source ?? "collections",
  });
}

export function brandShowcase(props: {
  title: string;
  layout?: string;
}): BlockNode {
  return makeBlock("brandShowcase", {
    title: props.title,
    layout: props.layout ?? "logoCarousel",
  });
}

export function taxonomyProductTabs(props: {
  title: string;
  taxonomy?: "category" | "brand";
}): BlockNode {
  return makeBlock("taxonomyProductTabs", {
    title: props.title,
    taxonomy: props.taxonomy ?? "category",
    navStyle: "pills",
  });
}

export function beforeAfter(props: {
  title: string;
  subtitle?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeMediaAssetId?: string;
  afterMediaAssetId?: string;
}): BlockNode {
  return makeBlock("beforeAfter", {
    title: props.title,
    subtitle: props.subtitle ?? "",
    layout: "slider",
    beforeLabel: "Before",
    afterLabel: "After",
    beforeImageUrl: props.beforeImageUrl,
    afterImageUrl: props.afterImageUrl,
    beforeMediaAssetId: props.beforeMediaAssetId ?? "",
    afterMediaAssetId: props.afterMediaAssetId ?? "",
  });
}
