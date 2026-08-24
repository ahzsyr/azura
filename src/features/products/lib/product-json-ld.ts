import type { Product } from "@/features/products/types";
import {
  detailedDescriptionPlainText,
  normalizeDetailedDescriptionInput,
} from "./product-detailed-description";

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

export function buildProductJsonLd(product: Product, canonicalUrl: string) {
  const images = (product.media?.images ?? []).map((img) => img.url).filter(Boolean) as string[];
  const primary = images.find((_, i) => product.media.images[i]?.type === "main") || images[0];
  const detailSections = normalizeDetailedDescriptionInput(product.detailed_description);
  const detailPlain = detailedDescriptionPlainText(detailSections);

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

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonicalUrl,
    name: product.productTitle || product.name || product.title,
    description: product.description || product.short_description || detailPlain || "",
    sku: product.mpn || product.manufacturer_part_number || product.id,
    mpn: product.mpn,
    ...(product.ean ? { gtin: product.ean } : {}),
    brand: {
      "@type": "Brand",
      name: product.brand || "Unknown",
    },
    image: images.length ? images : primary ? [primary] : [],
    ...(firstVideo ? { video: firstVideo } : {}),
    offers: [
      {
        "@type": "Offer",
        price: product.price.value,
        priceCurrency: product.price.currency,
        availability: schemaAvailability(product),
        url: canonicalUrl,
        seller: { "@type": "Organization", name: product.brand || "Store" },
      },
    ],
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(productReviews?.length ? { review: productReviews } : {}),
    ...(product.category ? { category: product.category } : {}),
  };
}

export type BreadcrumbItem = { name: string; href: string };

export function buildProductBreadcrumbJsonLd(
  siteOrigin: string,
  items: BreadcrumbItem[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${siteOrigin}${item.href}`,
    })),
  };
}