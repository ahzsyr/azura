import { NextResponse } from "next/server";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { buildProductCardThemeFromSite } from "@/features/products/lib/product-card-theme";
import { resolveCardDisplayByViewport } from "@/features/products/lib/product-card-display";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  resolveProductCta,
} from "@/features/products/lib/product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import { resolveProductCardFields } from "@/resolvers/product/product-card-fields";
import { queryListingRecordsByIdentifiers } from "@/features/products/listing/query-listing";
import { productsDataService } from "@/features/products/products-data.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";

  try {
    const records = await queryListingRecordsByIdentifiers(locale, [{ slug }]);
    const record = records[0];
    if (!record) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const catalogLocale = await prefixToCatalogLocaleCode(locale);
    const site = await readSiteSettings(catalogLocale);
    const siteRecord = site as Record<string, unknown>;
    const theme = buildProductCardThemeFromSite(siteRecord);
    const cardDisplayByViewport = resolveCardDisplayByViewport(siteRecord);

    const loaded = await productsDataService.getProduct(locale, slug);
    const productDoc = loaded?.product;
    const buyNowSlugOverride =
      productDoc?.buy_now_slug?.trim() || record.buy_now_slug?.trim() || undefined;

    const migratedCta = migrateProductCtaFromLegacyAddToCart(
      siteRecord.productCta,
      siteRecord.productPageAddToCart,
    );
    const globalCta = migratedCta
      ? mergeProductCta(normalizeProductCtaGlobal(siteRecord.productCta), migratedCta)
      : normalizeProductCtaGlobal(siteRecord.productCta);
    const productCtaEffective = resolveProductCta(globalCta, productDoc?.product_cta);

    const buyNowHref = buildBuyNowHref(theme.buyNow, slug, buyNowSlugOverride);

    const commerceByViewport = {
      desktop: resolveProductCardFields({
        entityId: record.id || slug,
        product: { ...record, buy_now_slug: buyNowSlugOverride },
        href: `/products/${slug}`,
        numberLocale: "en-US",
        localePrefix: locale,
        priority: false,
        cardLayout: theme.cardLayout,
        cardDisplay: cardDisplayByViewport.desktop,
        design: theme.design,
        buyNow: theme.buyNow,
        productCta: productCtaEffective,
        cardVariant: "default",
        layoutTokens: theme.designTokens,
        designDataAttrs: theme.designDataAttrs,
      }),
      tablet: resolveProductCardFields({
        entityId: record.id || slug,
        product: { ...record, buy_now_slug: buyNowSlugOverride },
        href: `/products/${slug}`,
        numberLocale: "en-US",
        localePrefix: locale,
        priority: false,
        cardLayout: theme.cardLayout,
        cardDisplay: cardDisplayByViewport.tablet,
        design: theme.design,
        buyNow: theme.buyNow,
        productCta: productCtaEffective,
        cardVariant: "default",
        layoutTokens: theme.designTokens,
        designDataAttrs: theme.designDataAttrs,
      }),
      mobile: resolveProductCardFields({
        entityId: record.id || slug,
        product: { ...record, buy_now_slug: buyNowSlugOverride },
        href: `/products/${slug}`,
        numberLocale: "en-US",
        localePrefix: locale,
        priority: false,
        cardLayout: theme.cardLayout,
        cardDisplay: cardDisplayByViewport.mobile,
        design: theme.design,
        buyNow: theme.buyNow,
        productCta: productCtaEffective,
        cardVariant: "default",
        layoutTokens: theme.designTokens,
        designDataAttrs: theme.designDataAttrs,
      }),
    };

    return NextResponse.json(
      {
        slug: record.slug,
        name: record.name,
        brand: record.brand,
        short_description: record.short_description,
        price: record.price,
        old_price: record.old_price,
        primary_image: record.primary_image,
        gallery_images: record.gallery_images,
        in_stock: record.in_stock,
        rating: record.rating,
        reviews_count: record.reviews_count,
        cardDisplayByViewport,
        buyNow: theme.buyNow,
        productCta: productCtaEffective,
        buyNowHref,
        commerceByViewport: {
          desktop: {
            showBuyNow: commerceByViewport.desktop.showBuyNow,
            showProductCta: commerceByViewport.desktop.showProductCta,
            buyNowHref: commerceByViewport.desktop.buyNowHref,
          },
          tablet: {
            showBuyNow: commerceByViewport.tablet.showBuyNow,
            showProductCta: commerceByViewport.tablet.showProductCta,
            buyNowHref: commerceByViewport.tablet.buyNowHref,
          },
          mobile: {
            showBuyNow: commerceByViewport.mobile.showBuyNow,
            showProductCta: commerceByViewport.mobile.showProductCta,
            buyNowHref: commerceByViewport.mobile.buyNowHref,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load preview" },
      { status: 500 },
    );
  }
}
