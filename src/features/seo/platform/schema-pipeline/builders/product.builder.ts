import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { entityUrl } from "../identity/canonical-url.service";
import { resolveProductOfferFacts } from "@/features/products/lib/product-offer-facts";

function productImages(product: NonNullable<SchemaContext["page"]["product"]>, ctx: SchemaContext): Array<{ "@id": string }> {
  const images = (product.media?.images ?? [])
    .map((img) => img.url)
    .filter(Boolean) as string[];
  if (!images.length) return [];
  return images.slice(0, 1).map((url) => entityRef(`image-product-0-${url}`, ctx));
}

export const ProductBuilder = {
  id: "product",
  version: 3,
  supports(ctx: SchemaContext): boolean {
    return ctx.page.pageType === "product" && Boolean(ctx.page.product);
  },
  provenance(_ctx: SchemaContext, node: SchemaNode) {
    const map: Record<string, string> = {};
    if (node.name) map.name = "product.title";
    if (node.description) map.description = "product.description";
    if (node.sku) map.sku = "product.mpn";
    if (node.gtin) map.gtin = "product.ean";
    if (node.brand) map.brand = "product.brand";
    if (node.image) map.image = "product.media";
    if (node.offers) map.offers = "product.price";
    return map;
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const product = ctx.page.product;
    if (!product) return [];

    const facts = resolveProductOfferFacts(product);
    const images = productImages(product, ctx);
    const description = (product.description || product.short_description || "").trim();
    const name = (product.productTitle || product.name || product.title || "").trim();

    const imageNodes: SchemaNode[] = (product.media?.images ?? [])
      .filter((img) => img.url)
      .slice(0, 1)
      .map((img) => ({
        "@type": "ImageObject",
        "@id": entityUrl(`image-product-0-${img.url}`, ctx),
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

    const productReviews = product.reviews.comments
      ?.slice(0, 5)
      .filter((comment) => Boolean(comment.name?.trim()) && Boolean(comment.text?.trim()))
      .map((comment, index) => ({
        "@type": "Review" as const,
        "@id": `${entityUrl(`product-${product.id}`, ctx)}#review-${index + 1}`,
        author: { "@type": "Person" as const, name: comment.name!.trim() },
        ...(comment.date ? { datePublished: comment.date } : {}),
        reviewBody: comment.text!.trim(),
        itemReviewed: entityRef(`product-${product.id}`, ctx),
      }));

    const firstVideo = product.media?.videos?.find((v) => v.url)?.url;
    const offerId = facts.emitOffer ? entityUrl("offer", ctx) : undefined;

    const offerNode: SchemaNode | undefined =
      facts.emitOffer && offerId
        ? {
            "@type": "Offer",
            "@id": offerId,
            url: ctx.runtime.canonicalUrl,
            ...(facts.price != null ? { price: facts.price } : {}),
            ...(facts.priceCurrency ? { priceCurrency: facts.priceCurrency } : {}),
            ...(facts.schemaAvailability ? { availability: facts.schemaAvailability } : {}),
            seller: entityRef("organization", ctx),
            itemCondition: "https://schema.org/NewCondition",
          }
        : undefined;

    const productNode: SchemaNode = {
      "@type": "Product",
      "@id": entityUrl(`product-${product.id}`, ctx),
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(facts.sku ? { sku: facts.sku } : {}),
      ...(facts.mpn ? { mpn: facts.mpn } : {}),
      ...(facts.gtin ? { gtin: facts.gtin } : {}),
      brand: entityRef("brand", ctx),
      ...(images.length ? { image: images } : {}),
      ...(offerId ? { offers: { "@id": offerId } } : {}),
      ...(aggregateRating ? { aggregateRating } : {}),
      ...(productReviews?.length ? { review: productReviews } : {}),
      ...(product.category ? { category: product.category } : {}),
      ...(firstVideo ? { video: entityRef(`video-${firstVideo}`, ctx) } : {}),
      mainEntityOfPage: entityRef("webpage", ctx),
    };

    return [productNode, ...(offerNode ? [offerNode] : []), ...imageNodes];
  },
};
