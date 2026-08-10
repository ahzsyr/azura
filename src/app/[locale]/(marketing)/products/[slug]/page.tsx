import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { Locale } from "@/i18n/routing";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { seoService } from "@/features/seo/seo.service";
import { localeService } from "@/features/i18n/locale.service";
import { productsDataService } from "@/features/products/products-data.service";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { ProductDetailView } from "@/features/products/components/pdp/product-detail-view";
import { buildProductPageSettingsFromSite } from "@/features/products/lib/product-page-responsive";
import { buildProductCardThemeFromSite } from "@/features/products/lib/product-card-theme";
import { resolveProductCta } from "@/features/products/lib/product-cta";
import { detailedDescriptionPlainText } from "@/features/products/lib/product-detailed-description";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import { mergeProductCta, normalizeProductCtaGlobal } from "@/features/products/lib/product-cta";
import { isBuildWithoutDb } from "@/lib/build-db";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";
import { CatalogTopNavigation } from "@/features/catalog/components/CatalogTopNavigation";

/** ISR: product detail pages revalidate every minute */
export const revalidate = 60;
const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  /** Avoid baking PDPs with default display flags when JsonStore is unavailable at build. */
  if (isBuildWithoutDb()) return [];

  let locales: string[] = [];
  try {
    locales = await getEnabledUrlPrefixes();
  } catch {
    locales = [...FALLBACK_PREFIXES];
  }
  if (locales.length === 0) locales = [...FALLBACK_PREFIXES];

  const localizedSlugs = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      slugs: await productsDataService.getProductSlugs(locale),
    })),
  );

  return localizedSlugs.flatMap(({ locale, slugs }) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const [loaded, enabledLocales] = await Promise.all([
    productsDataService.getProduct(locale, slug),
    localeService.listEnabled(),
  ]);
  if (!loaded) {
    return { title: "Product not found" };
  }

  const p = loaded.product;
  const detailPlain = detailedDescriptionPlainText(p.detailed_description ?? []);
  const title = p.title_extended || p.productTitle || p.name || slug;
  const description = p.description || p.short_description || detailPlain || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const primaryImage = resolveSeoOgImageUrl(resolveProductPrimaryImageUrl(p), siteUrl);

  const slugByLocale = await productsDataService.getProductSlugAlternates(slug, enabledLocales);
  const activeLocale = enabledLocales.find((l) => l.urlPrefix === locale);

  const meta = await seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/products/${slug}`,
    pageKey: `product:${slug}`,
    fallback: { title, description },
    ogImage: primaryImage,
    slugByLocale,
  });

  const canonSlug = activeLocale ? slugByLocale[activeLocale.code] : undefined;
  const canonical = buildCanonicalUrl(siteUrl, locale, `/products/${slug}`, canonSlug);

  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      canonical,
    },
    openGraph: {
      ...meta.openGraph,
      type: "website",
      images: primaryImage
        ? [{ url: primaryImage, width: 1200, height: 630, alt: title }]
        : meta.openGraph?.images,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const loaded = await productsDataService.getProduct(locale, slug);
  if (!loaded) notFound();

  const p = loaded.product;
  const title = p.productTitle || p.name || p.title || slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonicalUrl = buildCanonicalUrl(siteUrl, locale, `/products/${slug}`);

  const allCols = await collectionsDataService.loadAll({ localePrefix: locale });

  const catalogLocale = await prefixToCatalogLocaleCode(locale);
  const site = await readSiteSettings(catalogLocale);
  const { layoutRules, elementsRules, overflow } = buildProductPageSettingsFromSite(
    site as Record<string, unknown>,
  );
  const cardTheme = buildProductCardThemeFromSite(site as Record<string, unknown>);
  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const globalCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);
  const productCta = resolveProductCta(globalCta, undefined);

  const activeCategorySlug =
    (typeof p.category === "string" && p.category.trim()
      ? allCols.find(
          (c) =>
            c.slug === p.category ||
            c.name?.toLowerCase() === String(p.category).toLowerCase(),
        )?.slug
      : null) ||
    (Array.isArray(p.categories) && p.categories[0]
      ? allCols.find(
          (c) =>
            c.slug === p.categories![0] ||
            c.name?.toLowerCase() === String(p.categories![0]).toLowerCase(),
        )?.slug
      : null) ||
    null;

  return (
    <>
      <CatalogTopNavigation
        locale={locale}
        surface="productDetail"
        activeCategorySlug={activeCategorySlug}
      />
      <ProductDetailView
        locale={locale}
        slug={slug}
        product={p}
        layoutRules={layoutRules}
        elementsRules={elementsRules}
        overflow={overflow}
        allCollections={allCols}
        siteProductCta={globalCta}
        site={site as Record<string, unknown>}
        cardTheme={cardTheme}
        productCta={productCta}
      />
    </>
  );
}