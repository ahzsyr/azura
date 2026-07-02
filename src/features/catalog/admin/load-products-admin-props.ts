import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { normalizeTaxonomyList } from "@/features/catalog/admin/catalog-taxonomy";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { localeService } from "@/features/i18n/locale.service";
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
  resolveProductPromo,
  resolveProductTrust,
  type ResolvedProductPageDisplay,
  type ResolvedProductPromo,
  type ResolvedProductTrust,
  type ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import {
  buildProductPageSettingsFromSite,
  type ProductPageElementsRules,
  type ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import {
  resolveProductCardLayout,
  type ResolvedProductPageLayout,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import {
  buildProductCardDesignFromSite,
  type ResolvedProductCardDesign,
} from "@/features/products/card-design";
import { appearanceConfigFromSite } from "@/features/products/card-appearance";
import type { ProductCardAppearanceConfig } from "@/features/products/card-appearance/product-card-appearance.types";
import type { ProductCardResponsivePartial } from "@/features/products/card-design/product-card-design.types";
import { normalizeProductCardResponsivePartial } from "@/features/products/card-design/resolve-product-card-responsive";
import { catalogProductsSource, type CatalogProductsSource } from "@/features/products/products-source";
import {
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

export type ProductsAdminInitialProps = {
  initialProductCta: ResolvedProductCtaConfig;
  initialProductPageLayout: ResolvedProductPageLayout;
  initialProductPageLayoutRules: ProductPageLayoutRules;
  initialProductPageElementsRules: ProductPageElementsRules;
  initialProductCardLayout: ResolvedProductCardLayout;
  initialProductCardDesign: ResolvedProductCardDesign;
  initialProductCardDesignResponsive?: ProductCardResponsivePartial;
  initialProductCardAppearance: ProductCardAppearanceConfig;
  initialProductPageDisplay: ResolvedProductPageDisplay;
  initialProductBuyNow: ResolvedProductBuyNow;
  initialProductPagePromo: ResolvedProductPromo;
  initialProductPageTrust: ResolvedProductTrust;
  initialProductPageElementOrder: ResolvedProductPageElementOrder;
  initialProductPageCompactDisplay: ResolvedProductPageCompactDisplay;
  initialProductPageOverflow: ResolvedProductPageOverflow;
  initialAdminLocaleCode: string;
  initialLocales: Array<{ code: string; label: string; urlPrefix: string }>;
  initialCatalogBrands: string[];
  initialCatalogTags: string[];
  catalogStorageMode: CatalogProductsSource;
};

export async function loadProductsAdminInitialProps(): Promise<ProductsAdminInitialProps> {
  const enabledLocales = await localeService.listForAdmin();
  const activeLocale =
    enabledLocales.find((locale) => locale.isDefault) ?? enabledLocales[0] ?? adminLocale;
  const site = await readSiteSettings(activeLocale.code);

  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const initialProductCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);

  const { layoutRules, elementsRules, overflow } = buildProductPageSettingsFromSite(
    site as Record<string, unknown>,
  );

  return {
    initialProductCta,
    initialProductPageLayout: layoutRules.desktop,
    initialProductPageLayoutRules: layoutRules,
    initialProductPageElementsRules: elementsRules,
    initialProductCardLayout: resolveProductCardLayout(
      site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
    ),
    initialProductCardDesign: buildProductCardDesignFromSite(
      site as Record<string, unknown>,
      resolveProductCardLayout(
        site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
      ),
    ).design,
    initialProductCardDesignResponsive: normalizeProductCardResponsivePartial(
      site.productCardDesignResponsive,
    ),
    initialProductCardAppearance: appearanceConfigFromSite(site as Record<string, unknown>),
    initialProductPageDisplay: elementsRules.desktop.display,
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
    initialProductPageElementOrder: elementsRules.desktop.elementOrder,
    initialProductPageCompactDisplay: elementsRules.desktop.compactDisplay,
    initialProductPageOverflow: overflow,
    initialAdminLocaleCode: activeLocale.code,
    initialLocales: enabledLocales.map((locale) => ({
      code: locale.code,
      label: locale.label,
      urlPrefix: locale.urlPrefix,
    })),
    initialCatalogBrands: normalizeTaxonomyList(site.catalogBrands),
    initialCatalogTags: normalizeTaxonomyList(site.catalogTags),
    catalogStorageMode: catalogProductsSource(),
  };
}
