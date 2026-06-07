import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { seoService } from "@/features/seo/seo.service";
import { localeService } from "@/features/i18n/locale.service";
import { productsDataService } from "@/features/products/products-data.service";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";
import { ProductDetailView } from "@/features/products/components/pdp/product-detail-view";
import { resolveProductPageContext } from "@/features/products/lib/product-page-display";
import { resolveProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import { resolveProductPageCompactDisplay } from "@/features/products/lib/product-page-compact-display";
import { ProductJsonLd } from "@/features/products/components/pdp/product-json-ld";
import { detailedDescriptionPlainText } from "@/features/products/lib/product-detailed-description";
import type { BreadcrumbItem } from "@/features/products/lib/product-json-ld";
import { buildCollectionTrail } from "@/features/collections/collection-navigation";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { getDeepestMatchingCollectionSlug } from "@/features/products/product-collections";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import { mergeProductCta, normalizeProductCtaGlobal } from "@/features/products/lib/product-cta";

type Props = { params: Promise<{ locale: string; slug: string }> };

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
  const primaryImage =
    p.media?.images?.find((img) => img.type === "main")?.url || p.media?.images?.[0]?.url;

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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

function buildBreadcrumbs(
  siteUrl: string,
  locale: string,
  slug: string,
  productTitle: string,
  collectionTrail: Array<{ name: string; href: string }>,
): BreadcrumbItem[] {
  const origin = siteUrl.replace(/\/$/, "");
  const items: BreadcrumbItem[] = [
    { name: "Home", href: `${origin}/${locale}` },
  ];

  if (collectionTrail.length > 0) {
    items.push({ name: "Collections", href: `${origin}/${locale}/collections` });
    for (const t of collectionTrail) {
      items.push({ name: t.name, href: `${origin}${t.href}` });
    }
  } else {
    items.push({ name: "Products", href: `${origin}/${locale}/products` });
  }

  items.push({
    name: productTitle,
    href: `${origin}/${locale}/products/${slug}`,
  });

  return items;
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
  const bySlug = collectionMapFromList(allCols);
  const engine = catalogProductToCollectionProduct(slug, p);
  const deepestColSlug = getDeepestMatchingCollectionSlug(engine, allCols);
  const collectionTrail = deepestColSlug
    ? buildCollectionTrail(locale, deepestColSlug, bySlug)
    : [];

  const breadcrumbs = buildBreadcrumbs(siteUrl, locale, slug, title, collectionTrail);

  const catalogLocale = urlPrefixToCatalogLocale(locale);
  const site = await readSiteSettings(catalogLocale);
  const pageLayout = resolveProductPageLayout(
    site.productPageLayout as Parameters<typeof resolveProductPageLayout>[0],
  );
  const pageCtx = resolveProductPageContext(
    site,
    p as Parameters<typeof resolveProductPageContext>[1],
  );
  const compactDisplay = resolveProductPageCompactDisplay(
    site.productPageCompactDisplay as Parameters<typeof resolveProductPageCompactDisplay>[0],
  );

  return (
    <>
      <ProductJsonLd
        product={p}
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
        siteOrigin={siteUrl.replace(/\/$/, "")}
      />
      <ProductDetailView
        locale={locale}
        slug={slug}
        product={p}
        pageLayout={pageLayout}
        pageCtx={pageCtx}
        siteProductCta={(() => {
          const migrated = migrateProductCtaFromLegacyAddToCart(
            site.productCta,
            site.productPageAddToCart,
          );
          if (!migrated) return site.productCta;
          return mergeProductCta(normalizeProductCtaGlobal(site.productCta), migrated);
        })()}
        compactDisplay={compactDisplay}
      />
    </>
  );
}