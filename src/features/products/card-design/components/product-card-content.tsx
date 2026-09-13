"use client";

import { Link as LocaleLink } from "@/i18n/navigation";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import type { ProductCardContentSlot } from "../product-card-design.types";
import { ProductCardBadges } from "./product-card-badges";
import { ProductCardPricing } from "./product-card-pricing";
import type { ProductCardRenderContext } from "./product-card-context";
import { MEDIA_FLIP_SKIP_SLOTS } from "./product-card-media-flip";

type Props = {
  ctx: ProductCardRenderContext;
  /** When true, brand/title/category/description/features are omitted (rendered in flip scene). */
  suppressFlipSlots?: boolean;
};

const TITLE_LINK_SLOTS: ProductCardContentSlot[] = ["brand", "category", "title", "stock"];
const META_SLOTS: ProductCardContentSlot[] = ["price"];
const MEDIA_FLIP_SKIP = new Set<string>(MEDIA_FLIP_SKIP_SLOTS);

function renderSlot(ctx: ProductCardRenderContext, slot: ProductCardContentSlot) {
  const { product, cardDisplay } = ctx;
  const titleShared = sharedElementAttrs("product", product.slug, "title");

  switch (slot) {
    case "brand":
      return cardDisplay.showBrand ? (
        <small key={slot} className="pl-card__brand">
          {product.brand || "\u00a0"}
        </small>
      ) : null;
    case "category":
      return ctx.design.showCategory && product.category ? (
        <small key={slot} className="pl-card__category">
          {product.category}
        </small>
      ) : null;
    case "title":
      return (
        <h3
          key={slot}
          className="pl-card__title ui-text-product-card"
          data-shared-element={titleShared["data-shared-element"]}
          data-shared-element-type={titleShared["data-shared-element-type"]}
          data-shared-element-id={titleShared["data-shared-element-id"]}
          style={titleShared.style}
        >
          {product.name}
        </h3>
      );
    case "badges":
      return (
        <div key={slot} className="pl-card__badges-inline pl-card__slot--badges">
          <ProductCardBadges ctx={ctx} placement="inline" />
        </div>
      );
    case "description":
      return cardDisplay.showShortDescription && product.short_description ? (
        <p key={slot} className="pl-card__desc">
          {product.short_description}
        </p>
      ) : null;
    case "features":
      if (!cardDisplay.showLinkedTags) return null;
      return (
        <div key={slot} className="pl-card__features-slot pl-card__slot--features">
          {product.tags.length > 0 ? (
            <ul className="pl-card__features" aria-label="Product highlights">
              {product.tags.slice(0, 3).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    case "price":
      if (!cardDisplay.showPrice) return null;
      return (
        <div key={slot} className="pl-card__price-slot">
          <ProductCardPricing ctx={ctx} />
        </div>
      );
    case "rating":
      return null;
    case "stock":
      return cardDisplay.showStock && !product.in_stock ? (
        <span key={slot} className="pl-card__stock-badge">
          Out of stock
        </span>
      ) : null;
    case "actions":
      return null;
    default:
      return null;
  }
}

export function ProductCardContent({ ctx, suppressFlipSlots = false }: Props) {
  const { navHref, design, linkPrefetch } = ctx;
  const order = design.contentOrder.filter(
    (s) => !(suppressFlipSlots && MEDIA_FLIP_SKIP.has(s)),
  );

  const titleLinkSlots = order.filter((s) => TITLE_LINK_SLOTS.includes(s));
  const flowSlots = order.filter(
    (s) => !TITLE_LINK_SLOTS.includes(s) && !META_SLOTS.includes(s) && s !== "actions",
  );
  const metaInOrder = order.filter((s) => META_SLOTS.includes(s));
  const metaNodes = metaInOrder
    .map((slot) => renderSlot(ctx, slot))
    .filter((node) => node != null);

  const titleNodes = titleLinkSlots.map((slot) => renderSlot(ctx, slot)).filter((n) => n != null);
  const flowNodes = flowSlots.map((slot) => renderSlot(ctx, slot)).filter((n) => n != null);
  const showInlineCta = ctx.ctaLayout === "inline_meta" && ctx.showProductCta && ctx.productCtaNode;
  const hasMeta = metaNodes.length > 0 || showInlineCta;

  if (titleNodes.length === 0 && flowNodes.length === 0 && !hasMeta) {
    return null;
  }

  return (
    <section className="pl-card__content">
      {titleNodes.length > 0 ? (
        <LocaleLink href={navHref} prefetch={linkPrefetch} className="pl-card__title-link">
          {titleLinkSlots.map((slot) => renderSlot(ctx, slot))}
        </LocaleLink>
      ) : null}
      {flowSlots.map((slot) => renderSlot(ctx, slot))}
      {hasMeta ? (
        <footer className="pl-card__meta">
          {metaNodes}
          {showInlineCta ? ctx.productCtaNode : null}
        </footer>
      ) : null}
    </section>
  );
}
