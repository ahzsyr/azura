"use client";

import { useMemo, useState } from "react";
import "@/styles/admin-product-card-preview.css";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import { ProductCardThemeProvider } from "@/features/products/components/listing/product-card-theme-context";
import { buildProductCardPreviewTheme } from "@/features/products/lib/product-card-theme";
import { resolveProductCta } from "@/features/products/lib/product-cta";
import type { ProductCardAppearanceConfig } from "@/features/products/card-appearance/product-card-appearance.types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ProductPageElementsRules } from "@/features/products/lib/product-page-responsive";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import {
  MOCK_LISTING_RECORD_LUXURY,
  MOCK_LISTING_RECORD_OOS,
  MOCK_LISTING_RECORD_SALE,
} from "@/features/products/listing/__fixtures__/mock-listing-record";
import { AdminStorefrontIntlProvider } from "@/features/preview/admin-storefront-intl-provider";

type PreviewProduct = "sale" | "oos" | "luxury";
type PreviewDevice = "desktop" | "tablet" | "mobile";

export function ProductCardLivePreview({
  config,
  compareConfig,
  elementsRules,
  buyNow,
  productCta,
  compareMode = false,
}: {
  config: ProductCardAppearanceConfig;
  compareConfig?: ProductCardAppearanceConfig;
  elementsRules: ProductPageElementsRules;
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  compareMode?: boolean;
}) {
  const [productKey, setProductKey] = useState<PreviewProduct>("sale");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [showCompareView, setShowCompareView] = useState(false);

  const product =
    productKey === "oos"
      ? MOCK_LISTING_RECORD_OOS
      : productKey === "luxury"
        ? MOCK_LISTING_RECORD_LUXURY
        : MOCK_LISTING_RECORD_SALE;

  const resolvedProductCta = useMemo(
    () => resolveProductCta(productCta, undefined),
    [productCta],
  );

  const theme = useMemo(
    () =>
      buildProductCardPreviewTheme({
        design: config.design,
        cardLayout: config.layout,
        elementsRules,
        buyNow,
        productCta: resolvedProductCta,
        responsivePartial: config.responsive,
      }),
    [config, elementsRules, buyNow, resolvedProductCta],
  );

  const compareTheme = useMemo(() => {
    if (!compareConfig) return null;
    return buildProductCardPreviewTheme({
      design: compareConfig.design,
      cardLayout: compareConfig.layout,
      elementsRules,
      buyNow,
      productCta: resolvedProductCta,
      responsivePartial: compareConfig.responsive,
    });
  }, [compareConfig, elementsRules, buyNow, resolvedProductCta]);

  const viewportOverride: ProductPageViewport = device;

  const activeTheme =
    compareMode && showCompareView && compareTheme ? compareTheme : theme;

  return (
    <div className="apm-card-live-preview">
      <div className="apm-card-live-preview__toolbar">
        <select
          value={productKey}
          onChange={(e) => setProductKey(e.target.value as PreviewProduct)}
          aria-label="Sample product"
        >
          <option value="sale">On sale</option>
          <option value="oos">Out of stock</option>
          <option value="luxury">Luxury</option>
        </select>
        <div className="apm-card-live-preview__devices" role="group" aria-label="Preview width">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={device === d ? "is-active" : ""}
              onClick={() => setDevice(d)}
            >
              {d === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
        {compareMode ? (
          <button
            type="button"
            className={`pca-compare-toggle${showCompareView ? " is-active" : ""}`}
            onClick={() => setShowCompareView((v) => !v)}
          >
            {showCompareView ? "Current design" : "Compare view"}
          </button>
        ) : null}
      </div>
      <div
        className={`apm-card-live-preview__frame apm-card-live-preview__frame--${device === "mobile" ? "mobile" : "desktop"}`}
      >
        <div className="apm-card-live-preview__storefront">
          <AdminStorefrontIntlProvider locale="en">
            <ProductCardThemeProvider theme={activeTheme} viewportOverride={viewportOverride}>
              <ProductListingCard
                product={product}
                href={`/products/${product.slug}`}
                localePrefix="en"
                priority
              />
            </ProductCardThemeProvider>
          </AdminStorefrontIntlProvider>
        </div>
      </div>
      {compareMode ? (
        <p className="pca-section__hint">
          {showCompareView
            ? "Showing selected preset. Toggle to return to your current design."
            : "Showing your current design. Toggle to preview the selected preset."}
        </p>
      ) : null}
    </div>
  );
}
