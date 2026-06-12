import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { normalizeTaxonomyList } from "@/features/catalog/admin/catalog-taxonomy";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  type ResolvedProductCtaConfig,
} from "@/features/products/lib/product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import {
  resolveProductBuyNow,
  type ResolvedProductBuyNow,
} from "@/features/products/lib/product-buy-now";
import {
  resolveProductPageDisplay,
  resolveProductPromo,
  resolveProductTrust,
  resolveProductPageElementOrder,
  type ResolvedProductPageDisplay,
  type ResolvedProductPromo,
  type ResolvedProductTrust,
  type ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import {
  resolveProductPageLayout,
  resolveProductCardLayout,
  type ResolvedProductPageLayout,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import {
  buildProductCardDesignFromSite,
  type ResolvedProductCardDesign,
} from "@/features/products/card-design";
import {
  resolveProductPageCompactDisplay,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

export type ProductsAdminInitialProps = {
  initialProductCta: ResolvedProductCtaConfig;
  initialProductPageLayout: ResolvedProductPageLayout;
  initialProductCardLayout: ResolvedProductCardLayout;
  initialProductCardDesign: ResolvedProductCardDesign;
  initialProductPageDisplay: ResolvedProductPageDisplay;
  initialProductBuyNow: ResolvedProductBuyNow;
  initialProductPagePromo: ResolvedProductPromo;
  initialProductPageTrust: ResolvedProductTrust;
  initialProductPageElementOrder: ResolvedProductPageElementOrder;
  initialProductPageCompactDisplay: ResolvedProductPageCompactDisplay;
  initialAdminLocaleCode: string;
  initialLocales: Array<{ code: string; label: string; urlPrefix: string }>;
  initialCatalogBrands: string[];
  initialCatalogTags: string[];
};

export async function loadProductsAdminInitialProps(): Promise<ProductsAdminInitialProps> {
  const site = await readSiteSettings(adminLocale.code);

  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const initialProductCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);

  return {
    initialProductCta,
    initialProductPageLayout: resolveProductPageLayout(
      site.productPageLayout as Parameters<typeof resolveProductPageLayout>[0],
    ),
    initialProductCardLayout: resolveProductCardLayout(
      site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
    ),
    initialProductCardDesign: buildProductCardDesignFromSite(
      site as Record<string, unknown>,
      resolveProductCardLayout(
        site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
      ),
    ).design,
    initialProductPageDisplay: resolveProductPageDisplay(
      site.productPageDisplay as Parameters<typeof resolveProductPageDisplay>[0],
    ),
    initialProductBuyNow: resolveProductBuyNow(
      site.productBuyNow as Parameters<typeof resolveProductBuyNow>[0],
      site.productPageAddToCart as Parameters<typeof resolveProductBuyNow>[1],
    ),
    initialProductPagePromo: resolveProductPromo(
      site.productPagePromo as Parameters<typeof resolveProductPromo>[0],
    ),
    initialProductPageTrust: resolveProductTrust(
      site.productPageTrust as Parameters<typeof resolveProductTrust>[0],
    ),
    initialProductPageElementOrder: resolveProductPageElementOrder(
      site.productPageElementOrder as Parameters<typeof resolveProductPageElementOrder>[0],
    ),
    initialProductPageCompactDisplay: resolveProductPageCompactDisplay(
      site.productPageCompactDisplay as Parameters<typeof resolveProductPageCompactDisplay>[0],
    ),
    initialAdminLocaleCode: adminLocale.code,
    initialLocales: [
      { code: "en-us", label: "English", urlPrefix: "en" },
      { code: "ar-ae", label: "Arabic", urlPrefix: "ar" },
    ],
    initialCatalogBrands: normalizeTaxonomyList(site.catalogBrands),
    initialCatalogTags: normalizeTaxonomyList(site.catalogTags),
  };
}
