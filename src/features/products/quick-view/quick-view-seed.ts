import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { QuickViewSeed } from "./quick-view-types";

export function quickViewSeedFromProduct(
  product: ProductListingRecord,
  cardDisplay?: ResolvedProductCardDisplay,
): QuickViewSeed {
  return {
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    short_description: product.short_description,
    price: product.price,
    old_price: product.old_price,
    primary_image: product.primary_image,
    gallery_images: product.gallery_images,
    in_stock: product.in_stock,
    rating: product.rating,
    reviews_count: product.reviews_count,
    cardDisplay,
  };
}
