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
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  badgeEn?: string;
  badgeAr?: string;
  imageUrl?: string;
  mediaAssetId?: string;
  ctaLabelEn?: string;
  ctaLabelAr?: string;
  ctaHref?: string;
  secondaryCtaLabelEn?: string;
  secondaryCtaLabelAr?: string;
  secondaryCtaHref?: string;
  layout?: "centered" | "splitImageLeft" | "splitImageRight" | "fullBleed";
  minHeight?: "50vh" | "70vh" | "85vh";
}): BlockNode {
  return makeBlock("hero", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    badgeEn: props.badgeEn ?? "",
    badgeAr: props.badgeAr ?? "",
    imageUrl: props.imageUrl ?? "",
    mediaAssetId: props.mediaAssetId ?? "",
    ctaLabelEn: props.ctaLabelEn ?? "",
    ctaLabelAr: props.ctaLabelAr ?? "",
    ctaHref: props.ctaHref ?? "/contact",
    secondaryCtaLabelEn: props.secondaryCtaLabelEn ?? "",
    secondaryCtaLabelAr: props.secondaryCtaLabelAr ?? "",
    secondaryCtaHref: props.secondaryCtaHref ?? "",
    layout: props.layout ?? "centered",
    minHeight: props.minHeight ?? "70vh",
    backgroundType: props.imageUrl ? "image" : "gradient",
    overlayOpacity: 60,
  });
}

export function statsCounter(props: {
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  items: { value: number; suffix?: string; prefix?: string; labelEn: string; labelAr: string }[];
}): BlockNode {
  return makeBlock("statsCounter", {
    titleEn: props.titleEn ?? "",
    titleAr: props.titleAr ?? "",
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    layout: "grid",
    animateOnView: true,
    items: props.items.map((item, i) => ({
      id: `stat-${i + 1}`,
      value: item.value,
      suffix: item.suffix ?? "",
      prefix: item.prefix ?? "",
      labelEn: item.labelEn,
      labelAr: item.labelAr,
      descriptionEn: "",
      descriptionAr: "",
      icon: "",
      chartType: "none",
      chartData: [],
    })),
  });
}

export function featureGrid(props: {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  columns?: 2 | 3 | 4;
  items: {
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    icon?: string;
    href?: string;
    imageUrl?: string;
    mediaAssetId?: string;
  }[];
}): BlockNode {
  return makeBlock("featureGrid", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    columns: props.columns ?? 3,
    cardVariant: "iconTop",
    showCategories: false,
    items: props.items.map((item, i) => ({
      id: `feat-${i + 1}`,
      icon: item.icon ?? "fa-star",
      imageUrl: item.imageUrl ?? "",
      mediaAssetId: item.mediaAssetId ?? "",
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      href: item.href ?? "",
      categoryEn: "",
      categoryAr: "",
      linkLabelEn: "",
      linkLabelAr: "",
      metricEn: "",
      metricAr: "",
    })),
  });
}

export function benefitsGrid(props: {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  layout?: "cards" | "list" | "numbered" | "twoColumn";
  items: {
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    icon?: string;
  }[];
}): BlockNode {
  return makeBlock("benefitsGrid", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    layout: props.layout ?? "cards",
    emphasis: "outcome",
    items: props.items.map((item, i) => ({
      id: `benefit-${i + 1}`,
      icon: item.icon ?? "fa-check",
      imageUrl: "",
      mediaAssetId: "",
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      href: "",
      categoryEn: "",
      categoryAr: "",
      linkLabelEn: "",
      linkLabelAr: "",
      metricEn: "",
      metricAr: "",
    })),
  });
}

export function catalog(props: {
  source: "packages" | "hotels" | "services";
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  limit?: number;
  viewAllHref?: string;
  featuredOnly?: boolean;
}): BlockNode {
  return makeBlock("catalog", {
    source: props.source,
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    categorySlug: "",
    city: "",
    serviceType: "",
    featuredOnly: props.featuredOnly ?? false,
    manualIds: [],
    limit: props.limit ?? 6,
    viewAllHref: props.viewAllHref ?? "",
    emptyMessageEn: "",
    emptyMessageAr: "",
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
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  collectionSlug: string;
  limit?: number;
}): BlockNode {
  return makeBlock("testimonials", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
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
  titleEn?: string;
  titleAr?: string;
  items: { nameEn: string; nameAr: string; imageUrl?: string; mediaAssetId?: string }[];
}): BlockNode {
  return makeBlock("logoCloud", {
    titleEn: props.titleEn ?? "",
    titleAr: props.titleAr ?? "",
    subtitleEn: "",
    subtitleAr: "",
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
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      imageUrl: item.imageUrl ?? "",
      mediaAssetId: item.mediaAssetId ?? "",
      href: "",
      categoryEn: "",
      categoryAr: "",
    })),
  });
}

export function cta(props: {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  buttonEn: string;
  buttonAr: string;
  href?: string;
}): BlockNode {
  return makeBlock("cta", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    buttonEn: props.buttonEn,
    buttonAr: props.buttonAr,
    href: props.href ?? "/contact",
    secondaryButtonEn: "",
    secondaryButtonAr: "",
    secondaryHref: "",
    layout: "centered",
    size: "default",
    backgroundType: "gradient",
  });
}

export function advancedRichText(props: {
  htmlEn: string;
  htmlAr: string;
}): BlockNode {
  return makeBlock("advancedRichText", {
    contentEn: "",
    contentAr: "",
    htmlEn: props.htmlEn,
    htmlAr: props.htmlAr,
    maxWidth: "reading",
    prose: true,
  });
}

export function richText(props: {
  contentEn: string;
  contentAr: string;
}): BlockNode {
  return makeBlock("richText", {
    htmlEn: props.contentEn,
    htmlAr: props.contentAr,
  });
}

export function timeline(props: {
  titleEn: string;
  titleAr: string;
  items: { titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string }[];
}): BlockNode {
  return makeBlock("timeline", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    layout: "vertical",
    items: props.items.map((item, i) => ({
      id: `step-${i + 1}`,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      date: String(i + 1),
      icon: "fa-circle",
      imageUrl: "",
      categoryEn: "",
      categoryAr: "",
    })),
  });
}

export function trustBadges(props: {
  titleEn?: string;
  titleAr?: string;
  items: { labelEn: string; labelAr: string; icon?: string }[];
}): BlockNode {
  return makeBlock("trustBadges", {
    titleEn: props.titleEn ?? "",
    titleAr: props.titleAr ?? "",
    subtitleEn: "",
    subtitleAr: "",
    layout: "grid",
    registrationNo: "",
    items: props.items.map((item, i) => ({
      id: `badge-${i + 1}`,
      icon: item.icon ?? "fa-shield",
      imageUrl: "",
      mediaAssetId: "",
      labelEn: item.labelEn,
      labelAr: item.labelAr,
      descriptionEn: "",
      descriptionAr: "",
      href: "",
    })),
  });
}

export function faqBlock(props: {
  titleEn: string;
  titleAr: string;
  faqSetSlug: string;
  limit?: number;
}): BlockNode {
  return makeBlock("faq", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    faqSetSlug: props.faqSetSlug,
    limit: props.limit ?? 0,
  });
}

export function galleryBlock(props: {
  titleEn: string;
  titleAr: string;
  gallerySlug: string;
  columns?: 2 | 3 | 4;
}): BlockNode {
  return makeBlock("gallery", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    gallerySlug: props.gallerySlug,
    columns: props.columns ?? 3,
    limit: 0,
    showViewAllLink: true,
    variant: "grid",
  });
}

export function masonryGallery(props: {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  gallerySlug: string;
}): BlockNode {
  return makeBlock("masonryGallery", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
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
  titleEn: string;
  titleAr: string;
  templateId: string;
}): BlockNode {
  return makeBlock("contactFormBuilder", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    templateId: props.templateId,
    layout: "stacked",
    successMessageEn: "Thank you! We will be in touch shortly.",
    successMessageAr: "شكراً لك! سنتواصل معك قريباً.",
    redirectUrl: "",
  });
}

export function inquiryForm(props: {
  titleEn: string;
  titleAr: string;
  type?: "CONTACT" | "VISA" | "PACKAGE";
}): BlockNode {
  return makeBlock("inquiryForm", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    type: props.type ?? "CONTACT",
  });
}

export function beforeAfter(props: {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeMediaAssetId?: string;
  afterMediaAssetId?: string;
}): BlockNode {
  return makeBlock("beforeAfter", {
    titleEn: props.titleEn,
    titleAr: props.titleAr,
    subtitleEn: props.subtitleEn ?? "",
    subtitleAr: props.subtitleAr ?? "",
    layout: "slider",
    beforeLabelEn: "Before",
    beforeLabelAr: "قبل",
    afterLabelEn: "After",
    afterLabelAr: "بعد",
    beforeImageUrl: props.beforeImageUrl,
    afterImageUrl: props.afterImageUrl,
    beforeMediaAssetId: props.beforeMediaAssetId ?? "",
    afterMediaAssetId: props.afterMediaAssetId ?? "",
  });
}
