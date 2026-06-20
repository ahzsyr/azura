import type { BlockType } from "@/types/builder";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import { PRODUCT_SHOWCASE_TAB_PRESETS } from "@/features/commerce-showcase/schemas/showcase-blocks";

export type ShowcaseBlockPreset = {
  id: string;
  label: string;
  description: string;
  type: BlockType;
  propsPatch: Record<string, unknown>;
};

export const SHOWCASE_BLOCK_PRESETS: ShowcaseBlockPreset[] = [
  {
    id: "category-grid",
    label: "Category Showcase Grid",
    description: "Grid of category cards from collections or product categories.",
    type: "categoryShowcase",
    propsPatch: { layout: "grid", title: "Shop by category" },
  },
  {
    id: "brand-carousel",
    label: "Brand Logo Carousel",
    description: "Scrolling brand logos from catalog profiles or manual entries.",
    type: "brandShowcase",
    propsPatch: { layout: "logoCarousel", title: "Our brands", logoCarouselMode: "marquee" },
  },
  {
    id: "featured-slider",
    label: "Featured Products Slider",
    description: "Product carousel sourced from featured catalog items.",
    type: "productShowcase",
    propsPatch: { layout: "carousel", source: "featured", title: "Featured products" },
  },
  {
    id: "category-tabs",
    label: "Category Tabs Products",
    description: "Tabbed product panels filtered by product category.",
    type: "taxonomyProductTabs",
    propsPatch: { taxonomy: "category", navStyle: "pills", title: "Shop by category" },
  },
  {
    id: "brand-tabs",
    label: "Brand Tabs Products",
    description: "Tabbed product panels filtered by brand with AJAX loading.",
    type: "taxonomyProductTabs",
    propsPatch: { taxonomy: "brand", navStyle: "icons", title: "Shop by brand" },
  },
  {
    id: "best-sellers",
    label: "Best Sellers Collection",
    description: "Product grid ranked by sales velocity.",
    type: "productShowcase",
    propsPatch: { source: "best_sellers", title: "Best sellers", layout: "grid" },
  },
  {
    id: "new-arrivals",
    label: "New Arrivals Collection",
    description: "Recently added products in a responsive grid.",
    type: "productShowcase",
    propsPatch: { source: "new_arrivals", title: "New arrivals", layout: "grid", sortBy: "newest" },
  },
  {
    id: "trending",
    label: "Trending Products",
    description: "Popular products in a carousel layout.",
    type: "productShowcase",
    propsPatch: { source: "trending", title: "Trending now", layout: "carousel" },
  },
  {
    id: "recently-viewed",
    label: "Recently Viewed Products",
    description: "Personalized grid from the visitor browsing history.",
    type: "productShowcase",
    propsPatch: { source: "recently_viewed", title: "Recently viewed", layout: "grid" },
  },
  {
    id: "recommended",
    label: "Recommended Products",
    description: "Suggested products based on catalog signals.",
    type: "productShowcase",
    propsPatch: { source: "recommended", title: "Recommended for you", layout: "grid" },
  },
  {
    id: "mega-collection",
    label: "Mega Collection Showcase",
    description: "Three-column mega menu with nav, products, and promo.",
    type: "megaCollectionShowcase",
    propsPatch: { title: "Explore our catalog" },
  },
  {
    id: "product-discovery",
    label: "AJAX Product Discovery",
    description: "Filterable product discovery with live AJAX updates.",
    type: "productDiscovery",
    propsPatch: { title: "Discover products", ajaxEnabled: true },
  },
  {
    id: "collection-tabs",
    label: "Collection Tabs (Best Sellers / New / Trending)",
    description: "Multi-tab product showcase with preset collection sources.",
    type: "productShowcase",
    propsPatch: {
      mode: "tabs",
      layout: "grid",
      title: "Collections",
      tabs: PRODUCT_SHOWCASE_TAB_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.label,
        source: preset.source,
        collectionSlug: "",
        productSlugs: [],
        tags: [],
        brand: "",
        category: "",
        limit: 8,
        sortBy: preset.sortBy ?? "name-asc",
      })),
    },
  },
];

export function mergeShowcasePresetProps(
  type: BlockType,
  propsPatch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...structuredClone(BLOCK_DEFAULTS[type] ?? {}),
    ...propsPatch,
  };
}
