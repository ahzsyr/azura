export type ProductCurrency = "USD" | "EUR" | "AED" | "GBP" | "JPY";

export type ProductAvailability = "InStock" | "OutOfStock" | "PreOrder" | "RequestQuote";

export type ProductStockStatus = "in_stock" | "out_of_stock" | "preorder";

export type ProductCategory = "Electronics" | "Smart Home" | "Accessories" | "Fashion" | "";

export type ProductConditionOption = "new" | "used" | "refurbished";

export type ProductPlugOption = "EU" | "UK" | "US";

export type ProductMediaImageType = "main" | "gallery" | "thumbnail";

export type ProductMediaVideoType = "youtube" | "vimeo" | "upload";

export interface ProductPrice {
  value: number;
  currency: ProductCurrency;
  discount?: number | null;
}

export interface ProductFeatureHotspot {
  dotX?: number;
  dotY?: number;
  tooltipX?: number;
  tooltipY?: number;
  lineRenderType?: string;
  scale?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface ProductFeatureCard {
  title?: string;
  body?: string;
  image?: string;
  color?: string;
  attributes?: Record<string, string>;
  hotspot?: ProductFeatureHotspot;
}

export interface ProductSectionMedia {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
  color?: string;
  attributes?: Record<string, string>;
}

export interface ProductSectionVideo {
  url?: string;
  type?: string;
  poster?: string;
  color?: string;
  attributes?: Record<string, string>;
}

export interface ProductModel3dCamera {
  fov?: number;
  phi?: number;
  theta?: number;
  radius?: number;
  brightness?: number;
}

export interface ProductModel3dAr {
  enabled?: boolean;
  placement?: string;
  roll?: number;
  pitch?: number;
  yaw?: number;
}

export interface ProductModel3dVariant {
  color?: string;
  sku?: string;
  thumbnail?: string;
  attributes?: Record<string, string>;
  camera?: ProductModel3dCamera;
  ar?: ProductModel3dAr;
}

export interface ProductModel3dObject {
  enabled: boolean;
  url?: string;
  variants?: ProductModel3dVariant[];
}

/** Legacy boolean flag or full UniFi GLB payload. */
export type ProductModel3d = boolean | ProductModel3dObject;

export interface ProductDetailedSection {
  heading: string;
  text: string;
  tab?: string;
  tab_label?: string;
  media?: ProductSectionMedia[];
  videos?: ProductSectionVideo[];
  features?: ProductFeatureCard[];
  model_3d?: ProductModel3dObject;
}

export interface ProductSpecEntry {
  name?: string;
  value?: string;
  is_group?: boolean;
  parent?: string;
}

export interface ProductSpecificationGroup {
  technology?: string;
  features?: ProductSpecEntry[];
  items?: ProductSpecEntry[];
}

export interface ProductVariation {
  type?: string;
  options?: string[];
  default?: string;
}

export interface ProductMediaImage {
  url?: string;
  alt?: string;
  type?: ProductMediaImageType;
  color?: string;
  attributes?: Record<string, string>;
}

export interface ProductMediaVideo {
  url?: string;
  type?: ProductMediaVideoType;
  poster?: string;
  color?: string;
  attributes?: Record<string, string>;
}

export type ProductMediaFile = Record<string, unknown>;

export interface ProductMedia {
  images: ProductMediaImage[];
  thumbnails?: ProductMediaFile[];
  videos?: ProductMediaVideo[];
  files?: ProductMediaFile[];
  "3d_model"?: ProductModel3d;
}

export interface ProductDocument {
  title?: string;
  url?: string;
  type?: string;
  description?: string;
  file_size?: number;
  icon?: string;
  download?: boolean;
  open_in_new?: boolean;
}

export interface ProductReviews {
  rating: number;
  count: number;
  source?: string;
  distribution?: Record<string, number>;
  breakdown?: Record<string, number>;
  comments?: ProductReviewComment[];
}

export interface ProductReviewComment {
  name?: string;
  date?: string;
  text?: string;
  photos?: string[];
}

export type ProductTranslationStatus = "complete" | "pending" | "draft";

export interface ProductCertification {
  name?: string;
  image?: string;
  link?: string;
}

export interface ProductLocalizationMeta {
  canonical_slug: string;
  source_locale?: string;
  translation_status?: ProductTranslationStatus;
  uses_source_fallback?: boolean;
}

// For strict compatibility, keep these override blocks permissive.
export type ProductCtaPartial = Record<string, unknown>;
export type ProductPageDisplayPartial = Record<string, unknown>;
export type ProductAddToCartPartial = Record<string, unknown>;
export type ProductPromoPartial = Record<string, unknown>;
export type ProductTrustPartial = Record<string, unknown>;
export type ProductVariationCombination = Record<string, unknown>;

export interface ProductBoughtTogetherItem {
  name?: string;
  title?: string;
  url?: string;
  slug?: string;
  price?: number;
  currency?: string;
  mpn?: string;
  availability?: string;
  image?: string;
}

export interface Product {
  id: string;
  productTitle: string;
  /** Getic catalog UID from converter JSON */
  getic_uid?: string;
  name?: string;
  title?: string;
  title_extended?: string | null;
  short_description?: string;
  description?: string;
  detailed_description?: ProductDetailedSection[];
  price: ProductPrice;
  old_price?: number | null;
  availability?: ProductAvailability;
  stock_status?: ProductStockStatus;
  mpn?: string;
  manufacturer_part_number?: string;
  ean?: string;
  brand?: string;
  /**
   * Coarse converter main category (Indoor, Outdoor, Networking, …).
   * Used by Matching Rules field `mainCategory`.
   */
  mainCategory?: string;
  /** Full brand-tree paths from converter (e.g. "Ubiquiti > 60 GHz Wireless > airFiber 60 GHz"). */
  brandPaths?: string[];
  /** Full store-category paths from converter. */
  categoryPaths?: string[];
  /** Individual brand-tree levels (ancestors + leaf), separate from store categories. */
  brandCategories?: string[];
  /** Individual store-category levels (ancestors + leaf), separate from brand tree. */
  storeCategories?: string[];
  warranty?: string;
  category?: ProductCategory | null;
  categories?: string[];
  /** Unified Category ids (PRODUCT scope) — SoT for taxonomy membership. */
  categoryIds?: string[];
  tags?: string[];
  /**
   * Source matching tokens from catalog import (JSON / CSV / DB).
   * Used by category Matching Rules field `matchingRules`.
   * Snake_case `matching_rules` is accepted on import and normalized here.
   */
  matchingRules?: string | string[];
  condition_options?: ProductConditionOption[];
  plug_options?: ProductPlugOption[];
  specifications?: ProductSpecificationGroup[];
  variations?: ProductVariation[];
  media: ProductMedia;
  documents?: ProductDocument[];
  reviews: ProductReviews;
  shipping?: {
    options?: Record<string, unknown>[];
  };
  delivery_options?: Record<string, unknown>[];
  bought_together?: ProductBoughtTogetherItem[];
  certifications?: Array<ProductCertification | string>;
  product_cta?: ProductCtaPartial;
  page_display?: ProductPageDisplayPartial;
  /** PDP layout template override (null/omit = inherit from category → brand → site) */
  page_layout_template?: string | null;
  /** Optional slug segment override for Buy Now shop URL */
  buy_now_slug?: string;
  /**
   * When true, this product is omitted from `/feeds/google-shopping.xml`.
   * Published products are included by default when this flag is absent/false.
   */
  excludeFromGoogleShopping?: boolean;
  promo?: ProductPromoPartial;
  trust?: ProductTrustPartial;
  variation_combinations?: ProductVariationCombination[];
  localization?: ProductLocalizationMeta;
  /** Optional product FAQ entries for CMS productFaq blocks */
  faq?: Array<{
    id?: string;
    questionEn?: string;
    questionAr?: string;
    answerEn?: string;
    answerAr?: string;
    question?: string;
    answer?: string;
  }>;
}

export interface ProductSummary {
  slug: string;
  id: string;
  name: string;
  brand?: string;
  category?: string | null;
  /** Derived category labels (all assigned). */
  categories?: string[];
  /** Unified Category ids (PRODUCT scope). */
  categoryIds?: string[];
  price: ProductPrice;
  old_price?: number | null;
  short_description?: string;
  availability?: ProductAvailability;
  stock_status?: ProductStockStatus;
  mpn?: string;
  rating?: number;
  reviews_count?: number;
  primary_image?: string;
  secondary_image?: string;
  in_stock?: boolean;
  product_cta?: ProductCtaPartial;
}

