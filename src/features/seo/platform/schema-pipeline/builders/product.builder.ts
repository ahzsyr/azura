import type { Product } from "@/features/products/types";
import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";

function schemaAvailability(product: Product): string {
  const a = product.availability;
  if (a === "InStock") return "https://schema.org/InStock";
  if (a === "OutOfStock") return "https://schema.org/OutOfStock";
  if (a === "PreOrder") return "https://schema.org/PreOrder";
  if (a === "RequestQuote") return "https://schema.org/OnlineOnly";
  const s = product.stock_status;
  if (s === "in_stock") return "https://schema.org/InStock";
  if (s === "out_of_stock") return "https://schema.org/OutOfStock";
  if (s === "preorder") return "https://schema.org/PreOrder";
  return "https://schema.org/InStock";
}

function productImages(product: Product, ctx: SchemaContext): Array<{ "@id": string } | string> {
  const images = (product.media?.images ?? [])
    .map((img) => img.url)
    .filter(Boolean) as string[];
  if (!images.length) return [];
  return images.map((url, index) => {
    const key = `image-product-${index}-${url}` as const;
    return entityRef(key, ctx);
  });
}

export const ProductBuilder = {
  id: "product",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return ctx.page.pageType === "product" && Boolean(ctx.page.product);
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const product = ctx.page.product;
    if (!product) return [];

    const images = productImages(product, ctx);
    const imageNodes: SchemaNode[] = (product.media?.images ?? [])
      .filter((img) => img.url)
      .map((img, index) => ({
        "@type": "ImageObject",
        "@id": entityUrl(`image-product-${index}-${img.url}`, ctx),
        url: img.url,
      }));

    const aggregateRating =
      product.reviews.count > 0
        ? {
            "@type": "AggregateRating" as const,
            ratingValue: product.reviews.rating,
            reviewCount: product.reviews.count,
            bestRating: "5",
            worstRating: "1",
          }
        : undefined;

    const productReviews = product.reviews.comments?.slice(0, 5).map((comment) => ({
      "@type": "Review" as const,
      author: { "@type": "Person" as const, name: comment.name || "Anonymous" },
      datePublished: comment.date || new Date().toISOString().split("T")[0],
      reviewBody: comment.text || "",
      reviewRating: {
        "@type": "Rating" as const,
        ratingValue: product.reviews.rating,
        bestRating: "5",
      },
    }));

    const firstVideo = product.media?.videos?.find((v) => v.url)?.url;

    const productNode: SchemaNode = {
      "@type": "Product",
      "@id": entityUrl(`product-${product.id}`, ctx),
      name: product.productTitle || product.name || product.title,
      description: product.description || product.short_description || "",
      sku: product.mpn || product.manufacturer_part_number || product.id,
      ...(product.mpn ? { mpn: product.mpn } : {}),
      ...(product.ean ? { gtin: product.ean } : {}),
      brand: {
        "@type": "Brand",
        "@id": entityUrl("organization", ctx),
        name: product.brand || ctx.site.brand.brandName,
      },
      ...(images.length ? { image: images } : {}),
      offers: {
        "@type": "Offer",
        price: product.price.value,
        priceCurrency: product.price.currency,
        availability: schemaAvailability(product),
        url: ctx.runtime.canonicalUrl,
        seller: entityRef("organization", ctx),
      },
      ...(aggregateRating ? { aggregateRating } : {}),
      ...(productReviews?.length ? { review: productReviews } : {}),
      ...(product.category ? { category: product.category } : {}),
      ...(firstVideo
        ? { video: entityRef(`video-${firstVideo}`, ctx) }
        : {}),
    };

    return [productNode, ...imageNodes];
  },
};
