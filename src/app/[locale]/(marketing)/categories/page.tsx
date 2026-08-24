import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { seoService } from "@/features/seo/seo.service";
import { loadCatalogListingPage } from "@/features/catalog/load-catalog-listing-page";
import { CatalogListingIndexPageClient } from "@/features/products/components/catalog-listing-index-page-client";
import { CatalogTopNavigation } from "@/features/catalog/components/CatalogTopNavigation";

export const revalidate = 60;
export const maxDuration = 60;
const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  try {
    const locales = await getEnabledUrlPrefixes();
    if (locales.length > 0) return locales.map((locale) => ({ locale }));
  } catch {
    /* DB unavailable at build */
  }
  return FALLBACK_PREFIXES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    return await seoService.resolveMetadata({
      locale: locale as Locale,
      path: "categories",
      pageKey: "categories",
      fallback: {
        title: "Categories",
        description: "Browse our product categories.",
      },
    });
  } catch {
    return { title: "Categories", description: "Browse our product categories." };
  }
}

export default async function CategoriesIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    const payload = await loadCatalogListingPage(locale, "categories");
    return (
      <Suspense fallback={<RouteSuspenseFallback variant="grid" />}>
        <CatalogListingIndexPageClient
          locale={locale}
          pageSlug="categories"
          initialPayload={payload}
          navigation={<CatalogTopNavigation locale={locale} surface="categories" />}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("[categories-index] SSR load failed, using client fallback:", error);
    return (
      <Suspense fallback={<RouteSuspenseFallback variant="grid" />}>
        <CatalogListingIndexPageClient
          locale={locale}
          pageSlug="categories"
          navigation={<CatalogTopNavigation locale={locale} surface="categories" />}
        />
      </Suspense>
    );
  }
}
