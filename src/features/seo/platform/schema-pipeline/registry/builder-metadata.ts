import type { SchemaBuilderGoogleMeta } from "../types";

export const BUILDER_GOOGLE_METADATA: Record<string, SchemaBuilderGoogleMeta> = {
  organization: {
    feature: "Organization",
    status: "supported",
    description: "Entity / logo / business understanding",
    why: "Describes the company or business entity. Google recommends the most specific Organization subtype that accurately describes your business.",
  },
  brand: {
    feature: "Brand",
    status: "supporting",
    description: "Brand identity signal",
    why: "Canonical brand entity referenced by products and organization.",
  },
  website: {
    feature: "Site names / site understanding",
    status: "supported",
    description: "Site name and publisher context",
    why: "Helps Google understand site identity. Does not configure sitelinks search box (deprecated).",
  },
  webpage: {
    feature: "General semantic context",
    status: "supporting",
    description: "Page understanding",
    why: "Describes the current page and its relationship to the site and organization.",
  },
  breadcrumb: {
    feature: "Breadcrumb",
    status: "supported",
    description: "Breadcrumb appearance",
    why: "Reflects the page hierarchy in search results when eligible.",
  },
  product: {
    feature: "Product",
    status: "supported",
    description: "Product rich results / Shopping-related understanding",
    why: "Describes an individual product. Offer data is emitted only for genuine purchasable prices.",
  },
  article: {
    feature: "Article",
    status: "supported",
    description: "Article appearance",
    why: "Describes blog posts and articles.",
  },
  video: {
    feature: "Video",
    status: "supported",
    description: "Video discovery",
    why: "Describes video content on product or content pages.",
  },
  image: {
    feature: "Image metadata / context",
    status: "supporting",
    description: "Logo / image signals",
    why: "Emits meaningful images such as the organization logo.",
  },
  faq: {
    feature: "FAQPage",
    status: "deprecated",
    description: "Schema.org semantic markup",
    why: "Valid Schema.org FAQ markup. Google FAQ rich-result feature deprecated May 2026.",
  },
  review: {
    feature: "Review snippet",
    status: "conditional",
    description: "Review eligibility depends on source",
    why: "Self-serving organization reviews are not eligible for Google review rich results.",
  },
};

export function googleMetaForBuilder(builderId: string): SchemaBuilderGoogleMeta | undefined {
  return BUILDER_GOOGLE_METADATA[builderId];
}
