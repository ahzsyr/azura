import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { localeService } from "@/features/i18n/locale.service";
import {
  buildProductPageSettingsFromSite,
  type ProductPageElementsRules,
  type ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import type { ResolvedProductPageElementOrder } from "@/features/products/lib/product-page-display";
import type { ResolvedProductPageCompactDisplay } from "@/features/products/lib/product-page-compact-display";

export type ProductPageDesignInitialProps = {
  initialProductPageLayout: ResolvedProductPageLayout;
  initialProductPageLayoutRules: ProductPageLayoutRules;
  initialProductPageElementsRules: ProductPageElementsRules;
  initialProductPageDisplay: ResolvedProductPageDisplay;
  initialProductPageElementOrder: ResolvedProductPageElementOrder;
  initialProductPageCompactDisplay: ResolvedProductPageCompactDisplay;
  initialProductPageOverflow: ResolvedProductPageOverflow;
  initialProductPageLayoutTemplate: string | null;
  initialAdminLocaleCode: string;
  initialLocales: Array<{ code: string; label: string; urlPrefix: string }>;
  previewProductSlug: string | null;
};

export async function loadProductPageDesignInitialProps(): Promise<ProductPageDesignInitialProps> {
  const enabledLocales = await localeService.listForAdmin();
  const activeLocale =
    enabledLocales.find((locale) => locale.isDefault) ?? enabledLocales[0] ?? adminLocale;
  const site = await readSiteSettings(activeLocale.code);
  const { layoutRules, elementsRules, overflow } = buildProductPageSettingsFromSite(
    site as Record<string, unknown>,
  );

  let previewProductSlug: string | null = null;
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.product.findFirst({
      where: { status: "published" },
      orderBy: { updatedAt: "desc" },
      select: { canonicalSlug: true },
    });
    previewProductSlug = row?.canonicalSlug ?? null;
  } catch {
    previewProductSlug = null;
  }

  return {
    initialProductPageLayout: layoutRules.desktop,
    initialProductPageLayoutRules: layoutRules,
    initialProductPageElementsRules: elementsRules,
    initialProductPageDisplay: elementsRules.desktop.display,
    initialProductPageElementOrder: elementsRules.desktop.elementOrder,
    initialProductPageCompactDisplay: elementsRules.desktop.compactDisplay,
    initialProductPageOverflow: overflow,
    initialProductPageLayoutTemplate:
      typeof site.productPageLayoutTemplate === "string" ? site.productPageLayoutTemplate : null,
    initialAdminLocaleCode: activeLocale.code,
    initialLocales: enabledLocales.map((locale) => ({
      code: locale.code,
      label: locale.label,
      urlPrefix: locale.urlPrefix,
    })),
    previewProductSlug,
  };
}
