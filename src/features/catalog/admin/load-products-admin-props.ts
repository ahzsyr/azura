import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { normalizeTaxonomyList } from "@/features/catalog/admin/catalog-taxonomy";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { normalizeProductCtaGlobal, type ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import {
  resolveProductPageDisplay,
  resolveProductAddToCart,
  resolveProductPromo,
  resolveProductTrust,
  resolveProductPageElementOrder,
  type ResolvedProductPageDisplay,
  type ResolvedProductAddToCart,
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
  resolveProductPageCompactDisplay,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

export type ProductsAdminInitialProps = {
  initialProductCta: ResolvedProductCtaConfig;
  initialProductPageLayout: ResolvedProductPageLayout;
  initialProductCardLayout: ResolvedProductCardLayout;
  initialProductPageDisplay: ResolvedProductPageDisplay;
  initialProductPageAddToCart: ResolvedProductAddToCart;
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

  return {
    initialProductCta: normalizeProductCtaGlobal(site.productCta),
    initialProductPageLayout: resolveProductPageLayout(
      site.productPageLayout as Parameters<typeof resolveProductPageLayout>[0],
    ),
    initialProductCardLayout: resolveProductCardLayout(
      site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
    ),
    initialProductPageDisplay: resolveProductPageDisplay(
      site.productPageDisplay as Parameters<typeof resolveProductPageDisplay>[0],
    ),
    initialProductPageAddToCart: resolveProductAddToCart(
      site.productPageAddToCart as Parameters<typeof resolveProductAddToCart>[0],
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
