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

export interface ProductDetailedSection {
  heading: string;
  text: string;
}

export interface ProductSpecEntry {
  name?: string;
  value?: string;
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
}

export interface ProductMediaVideo {
  url?: string;
  type?: ProductMediaVideoType;
}

export type ProductMediaFile = Record<string, unknown>;

export interface ProductMedia {
  images: ProductMediaImage[];
  thumbnails?: ProductMediaFile[];
  videos?: ProductMediaVideo[];
  files?: ProductMediaFile[];
  "3d_model"?: boolean;
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

export interface Product {
  id: string;
  productTitle: string;
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
  warranty?: string;
  category?: ProductCategory | null;
  categories?: string[];
  tags?: string[];
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
  bought_together?: Record<string, unknown>[];
  certifications?: Array<ProductCertification | string>;
  product_cta?: ProductCtaPartial;
  page_display?: ProductPageDisplayPartial;
  add_to_cart?: ProductAddToCartPartial;
  promo?: ProductPromoPartial;
  trust?: ProductTrustPartial;
  variation_combinations?: ProductVariationCombination[];
  localization?: ProductLocalizationMeta;
}

export interface ProductSummary {
  slug: string;
  id: string;
  name: string;
  brand?: string;
  category?: string | null;
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

