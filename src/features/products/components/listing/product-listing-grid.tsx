"use client";

import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { CSSProperties } from "react";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { CollectionCatalogCard } from "./collection-catalog-card";
import { ProductListingCard } from "./product-listing-card";
import { useProductCardTheme } from "./product-card-theme-context";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";

type ListingViewMode = "grid" | "list" | "table";
type ListingMode = "product" | "collection";

const GRID_PRIORITY_CARD_COUNT = 4;

const priceFormatters = new Map<string, Intl.NumberFormat>();

function formatTablePrice(value: number, currency: string, locale: string): string {
  const key = `${locale}:${currency}`;
  let formatter = priceFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    });
    priceFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

type Props = {
  products: ProductListingRecord[];
  localePrefix: string;
  mode?: ListingMode;
  viewMode?: ListingViewMode;
  numberLocale?: string;
  emptyMessage: string;
  cardLayoutCssVars?: Record<string, string>;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
  cardLayout?: ResolvedProductCardLayout;
  pageDisplay?: ResolvedProductPageDisplay;
  collectionCardVariant?: "default" | "catalog";
  collectionViewLabel?: string;
};

export function ProductListingGrid({
  products,
  localePrefix,
  mode = "product",
  viewMode = "grid",
  numberLocale = "en-US",
  emptyMessage,
  cardLayoutCssVars,
  buyNow,
  quoteCta,
  cardLayout,
  pageDisplay,
  collectionCardVariant = "default",
  collectionViewLabel = "View",
}: Props) {
  const { effectiveCardDisplay } = useProductCardTheme();
  const gridRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("az:images-ready"));
    });
    return () => cancelAnimationFrame(id);
  }, [products, viewMode]);

  if (products.length === 0) {
    return (
      <section className="pl-empty" aria-live="polite">
        <span className="pl-empty-icon" aria-hidden="true">
          ◈
        </span>
        <p className="pl-empty-msg">{emptyMessage}</p>
      </section>
    );
  }

  const gridClass =
    viewMode === "list"
      ? `pl-grid pl-grid--list${mode === "collection" ? " pl-grid--collections" : ""}`
      : `pl-grid${mode === "collection" ? " pl-grid--collections" : ""}`;
  const pathRoot = mode === "collection" ? "/collections" : "/products";

  if (viewMode === "table") {
    const showPriceColumn = mode === "product" && effectiveCardDisplay.showPrice;
    const showStockColumn = mode === "product" && effectiveCardDisplay.showStock;
    const showRatingColumn = mode === "product" && effectiveCardDisplay.showRating;

    return (
      <section className="pl-table-wrap" aria-live="polite">
        <table className="pl-results-table">
          <thead>
            <tr>
              <th>{mode === "collection" ? "Collection" : "Product"}</th>
              {mode === "collection" ? <th>Parent</th> : null}
              {showPriceColumn ? <th>Price</th> : null}
              {mode === "collection" ? <th>Products</th> : null}
              {showStockColumn ? <th>Status</th> : null}
              {mode === "collection" ? <th>Badge</th> : null}
              {showRatingColumn ? <th>Rating</th> : null}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.slug}>
                <td>
                  <Link href={`${pathRoot}/${product.slug}`} className="pl-table-product-link">
                    {product.name}
                  </Link>
                  {mode === "collection" ? (
                    product.short_description ? (
                      <div className="pl-table-product-brand">{product.short_description}</div>
                    ) : null
                  ) : product.brand ? (
                    <div className="pl-table-product-brand">{product.brand}</div>
                  ) : null}
                </td>
                {mode === "collection" ? (
                  <>
                    <td>{product.category ?? "Top-level"}</td>
                    <td>{product.reviews_count ?? 0}</td>
                    <td>{product.brand ?? "—"}</td>
                  </>
                ) : (
                  <>
                    {showPriceColumn ? (
                      <td>
                        {formatTablePrice(
                          product.price.value,
                          product.price.currency,
                          numberLocale,
                        )}
                      </td>
                    ) : null}
                    {showStockColumn ? (
                      <td>{product.in_stock ? "In stock" : "Out of stock"}</td>
                    ) : null}
                    {showRatingColumn ? (
                      <td>
                        {product.rating
                          ? `${product.rating.toFixed(1)} (${product.reviews_count ?? 0})`
                          : "—"}
                      </td>
                    ) : null}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section ref={gridRef} className={gridClass} aria-live="polite">
      {products.map((product, index) => {
        const cardPriority =
          mode === "product" && viewMode === "grid" && index < GRID_PRIORITY_CARD_COUNT;
        const href = `${pathRoot}/${product.slug}`;

        if (mode === "product") {
          return (
            <ProductListingCard
              key={product.slug}
              product={product}
              href={href}
              localePrefix={localePrefix}
              numberLocale={numberLocale}
              cardStyle={cardLayoutCssVars as CSSProperties | undefined}
              buyNow={buyNow}
              quoteCta={quoteCta}
              cardLayout={cardLayout}
              pageDisplay={pageDisplay}
              priority={cardPriority}
            />
          );
        }

        if (collectionCardVariant === "catalog") {
          return (
            <CollectionCatalogCard
              key={product.slug}
              collection={product}
              href={href}
              viewLabel={collectionViewLabel}
            />
          );
        }

        return (
          <article key={product.slug} className="pl-card">
            <Link
              href={href}
              className="pl-card__media-link"
              aria-label={`View collection ${product.name}`}
            >
              {product.primary_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pl-card__media-img"
                  src={product.primary_image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="pl-card__placeholder">No image</span>
              )}
            </Link>
            <section className="pl-card__content">
              <Link href={href} className="pl-card__title-link">
                {product.brand ? <small className="pl-card__brand">{product.brand}</small> : null}
                <h3 className="pl-card__title ui-text-product-card">{product.name}</h3>
              </Link>
              {product.short_description ? (
                <p className="pl-card__desc">{product.short_description}</p>
              ) : null}
              <footer className="pl-card__meta">
                <span className="pl-card__prices">
                  <span className="pl-card__price">
                    {product.reviews_count ?? 0} item
                    {(product.reviews_count ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
                {product.category ? (
                  <span className="pl-table-product-brand">{product.category}</span>
                ) : null}
              </footer>
            </section>
          </article>
        );
      })}
    </section>
  );
}
