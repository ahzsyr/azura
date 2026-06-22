"use client";

import { useMemo, useState } from "react";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import { ProductCardThemeProvider } from "@/features/products/components/listing/product-card-theme-context";
import {
  productCardThemeFromLegacyProps,
  productCardThemeWithDesign,
} from "@/features/products/lib/product-card-theme";
import { resolveProductCardDisplay } from "@/features/products/lib/product-card-display";
import { resolveProductBuyNow } from "@/features/products/lib/product-buy-now";
import {
  DEFAULT_RESOLVED_PRODUCT_CTA,
  resolveProductCta,
} from "@/features/products/lib/product-cta";
import { resolveProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { ResolvedProductCardDesign } from "@/features/products/card-design";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import {
  MOCK_LISTING_RECORD_LUXURY,
  MOCK_LISTING_RECORD_OOS,
  MOCK_LISTING_RECORD_SALE,
} from "@/features/products/listing/__fixtures__/mock-listing-record";
import { AdminStorefrontIntlProvider } from "@/features/preview/admin-storefront-intl-provider";

type PreviewProduct = "sale" | "oos" | "luxury";
type PreviewDevice = "desktop" | "mobile";

export function ProductCardLivePreview({
  design,
  cardLayout,
}: {
  design: ResolvedProductCardDesign;
  cardLayout: ResolvedProductCardLayout;
}) {
  const [productKey, setProductKey] = useState<PreviewProduct>("sale");
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const product =
    productKey === "oos"
      ? MOCK_LISTING_RECORD_OOS
      : productKey === "luxury"
        ? MOCK_LISTING_RECORD_LUXURY
        : MOCK_LISTING_RECORD_SALE;

  const theme = useMemo(() => {
    const pageDisplay = resolveProductPageDisplay();
    const buyNow = resolveProductBuyNow();
    const quoteCta = resolveProductCta(DEFAULT_RESOLVED_PRODUCT_CTA, undefined);
    const cardDisplay = resolveProductCardDisplay(pageDisplay, cardLayout, buyNow, quoteCta);
    const legacy = productCardThemeFromLegacyProps({ cardLayout, pageDisplay, buyNow, quoteCta });
    return productCardThemeWithDesign({ ...legacy, cardDisplay }, design);
  }, [design, cardLayout]);

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
          <button
            type="button"
            className={device === "desktop" ? "is-active" : ""}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={device === "mobile" ? "is-active" : ""}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>
      <div
        className={`apm-card-live-preview__frame apm-card-live-preview__frame--${device}`}
      >
        <AdminStorefrontIntlProvider locale="en">
          <ProductCardThemeProvider theme={theme}>
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
  );
}
