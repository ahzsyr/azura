import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { buildCollectionTrail, collectionMapFromList } from "@/features/collections/collection-navigation";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import {
  buildProductTagLinks,
  getDeepestMatchingCollectionSlug,
} from "@/features/products/product-collections";
import type { Product } from "../../types";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import {
  productPageLayoutCssVars,
  productPageLayoutDataAttrs,
} from "@/features/products/lib/product-storefront-layout";
import {
  enabledProductTabs,
  resolveProductPageContext,
  type ProductPageMainOrderKey,
  type ProductTabKey,
} from "@/features/products/lib/product-page-display";
import { buildDisplayPrices, resolveShopperCurrencyContext } from "@/features/products/lib/currency";
import {
  buildProductPriceMatrix,
  buildVariationDimensions,
} from "@/features/products/lib/product-variation-pricing";
import { normalizeProductDeliveryOptions } from "@/features/products/lib/product-delivery";
import { normalizeProductCtaGlobal, resolveProductCta } from "@/features/products/lib/product-cta";
import { getLocaleByPrefix, defaultLocaleConfig } from "@/features/products/lib/i18n/config";
import { loadPdpLabels } from "../../pdp/load-pdp-labels";
import { ProductGallery } from "./product-gallery";
import { ProductInfo } from "./product-info";
import { ProductSideOrderedStack } from "./product-side-ordered-stack";
import { ProductTabsSection, type ProductTabDef } from "./product-tabs-section";
import { ProductDescriptionPanel } from "./product-description-panel";
import { ProductSpecsTable } from "./product-specs-table";
import { ProductDocumentsList } from "./product-documents-list";
import { ProductShippingPanel } from "./product-shipping-panel";
import { ProductReviewsSection } from "./product-reviews-section";
import { ProductPromoBanner } from "./product-promo-banner";
import { ProductTrustWidget } from "./product-trust-widget";
import { ProductFrequentlyBought } from "./product-frequently-bought";
import { ProductCrossLinks } from "./product-cross-links";
import { ProductServicesBar } from "./product-services-bar";
import { ProductFloatingCta } from "./product-floating-cta";
import { ProductStickyLayoutInit } from "./product-sticky-layout-init";
import {
  productPageCompactDisplayDataAttrs,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

type Props = {
  locale: string;
  slug: string;
  product: Product;
  pageLayout: ResolvedProductPageLayout;
  pageCtx: ResolvedProductPageContext;
  siteProductCta?: unknown;
  compactDisplay: ResolvedProductPageCompactDisplay;
};

function resolveLocalizedHref(href: string, localePrefix: string): string {
  const h = href.trim();
  if (!h || /^https?:\/\//i.test(h)) return h;
  const path = h.startsWith("/") ? h : `/${h}`;
  const prefix = `/${localePrefix}`;
  if (path.startsWith(prefix)) return path;
  return `${prefix}${path}`;
}

function buildTabDefs(
  display: ResolvedProductPageContext["display"],
  labels: Awaited<ReturnType<typeof loadPdpLabels>>,
): ProductTabDef[] {
  const keys = enabledProductTabs(display);
  const labelMap: Record<ProductTabKey, string> = {
    description: labels.description,
    specs: labels.specifications,
    documents: labels.documents,
    shipping: labels.shipping,
    reviews: labels.reviews,
  };
  return keys.map((key) => ({ key, label: labelMap[key] }));
}

export async function ProductDetailView({
  locale,
  slug,
  product,
  pageLayout,
  pageCtx,
  siteProductCta,
  compactDisplay,
}: Props) {
  const labels = await loadPdpLabels(locale);
  const localeConfig = getLocaleByPrefix(locale) ?? defaultLocaleConfig;

  const hdrs = await headers();
  const ck = await cookies();
  const request = new Request("http://localhost", {
    headers: { cookie: hdrs.get("cookie") ?? "" },
  });
  const currencyCtx = resolveShopperCurrencyContext(request, ck, localeConfig);
  const displayPrices = buildDisplayPrices(currencyCtx, product.price, product.old_price);
  const priceMatrix = buildProductPriceMatrix(
    currencyCtx,
    product as Parameters<typeof buildProductPriceMatrix>[1],
  );
  const variationDims = buildVariationDimensions(product);
  const conditionInVariations = variationDims.some((d) => d.type.toLowerCase() === "condition");
  const deliveryOptions = normalizeProductDeliveryOptions(product);

  const globalCta = normalizeProductCtaGlobal(siteProductCta);
  const productCtaEffective = resolveProductCta(globalCta, product.product_cta);

  const addToCartResolved = {
    ...pageCtx.addToCart,
    href: pageCtx.addToCart.href
      ? resolveLocalizedHref(pageCtx.addToCart.href, locale)
      : "",
  };

  const promoResolved = {
    ...pageCtx.promo,
    ctaHref: pageCtx.promo.ctaHref
      ? resolveLocalizedHref(pageCtx.promo.ctaHref, locale)
      : `/${locale}/about`,
  };

  const trustResolved = {
    ...pageCtx.trust,
    href: pageCtx.trust.href ? resolveLocalizedHref(pageCtx.trust.href, locale) : "",
  };

  const allCols = await collectionsDataService.loadAll({ localePrefix: locale });
  const bySlug = collectionMapFromList(allCols);
  const engine = catalogProductToCollectionProduct(slug, product);
  const deepestColSlug = getDeepestMatchingCollectionSlug(engine, allCols);
  const collectionTrail = deepestColSlug
    ? buildCollectionTrail(locale, deepestColSlug, bySlug)
    : [];

  const tagLinks = buildProductTagLinks({
    catalogProduct: product,
    productSlug: slug,
    localePrefix: locale,
    allCollections: allCols,
  });

  const title = product.productTitle || product.name || product.title || slug;
  const tabDefs = buildTabDefs(pageCtx.display, labels);
  const firstTabKey = tabDefs[0]?.key ?? "description";
  const productId = product.id || product.mpn || product.productTitle || slug;

  const tagHalf = Math.ceil(tagLinks.length / 2);
  const crossLinkGroups = [
    {
      title: labels.crossMainCategories,
      links: [
        ...collectionTrail.map((item) => ({ label: item.name, href: item.href })),
        ...(product.categories ?? []).map((cat) => {
          const match = tagLinks.find((tag) => tag.label === cat);
          return {
            label: cat,
            href: match?.href ?? `/${locale}/collections`,
          };
        }),
      ].filter((link, idx, arr) => arr.findIndex((l) => l.label === link.label) === idx),
    },
    {
      title: labels.crossEquipment,
      links: tagLinks
        .slice(0, tagHalf)
        .filter((l): l is { label: string; href: string } => Boolean(l.href))
        .map((l) => ({ label: l.label, href: l.href })),
    },
    {
      title: labels.crossDevices,
      links: tagLinks
        .slice(tagHalf)
        .filter((l): l is { label: string; href: string } => Boolean(l.href))
        .map((l) => ({ label: l.label, href: l.href })),
    },
  ];

  const panels: Partial<Record<ProductTabKey, ReactNode>> = {
    description: (
      <ProductDescriptionPanel
        sections={product.detailed_description ?? []}
        description={product.description}
        shortDescription={product.short_description}
        emptyLabel={labels.noDescription}
      />
    ),
    specs: <ProductSpecsTable product={product} emptyLabel={labels.noSpecs} />,
    documents: (
      <ProductDocumentsList documents={product.documents ?? []} />
    ),
    shipping: (
      <ProductShippingPanel product={product} emptyLabel={labels.noShipping} />
    ),
    reviews: (
      <div data-product-reviews>
        <ProductReviewsSection
          product={product}
          dateLocale={locale.startsWith("ar") ? "ar" : "en"}
        />
      </div>
    ),
  };

  const layoutAttrs = {
    ...productPageLayoutDataAttrs(pageLayout),
    ...productPageCompactDisplayDataAttrs(compactDisplay),
  };
  const layoutStyle = productPageLayoutCssVars(pageLayout) as CSSProperties;

  const purchasePrices = {
    sale: displayPrices.sale,
    compare: displayPrices.compare,
    displayCode: displayPrices.displayCode,
    numberLocale: displayPrices.numberLocale,
  };

  const mainBlocks: Record<ProductPageMainOrderKey, ReactNode> = {
    gallery: pageCtx.display.gallery.enabled ? (
      <section key="gallery" className="prd-page__hero">
        <ProductGallery product={product} certHeading={labels.certHeading} />
      </section>
    ) : null,
    tabs:
      pageCtx.display.tabs.enabled && tabDefs.length > 0 ? (
        <ProductTabsSection
          key="tabs"
          tabs={tabDefs}
          panels={panels}
          layoutMode={pageLayout.tabsMode}
          initialTab={firstTabKey}
        />
      ) : null,
    frequentlyBought: pageCtx.display.frequentlyBought.enabled ? (
      <ProductFrequentlyBought
        key="fbt"
        locale={locale}
        slug={slug}
        product={product}
        title={labels.frequentlyBought}
      />
    ) : null,
    crossLinks: pageCtx.display.crossLinks.enabled ? (
      <ProductCrossLinks key="crossLinks" groups={crossLinkGroups} />
    ) : null,
    promo:
      pageCtx.display.promo.enabled && promoResolved.enabled ? (
        <ProductPromoBanner key="promo" promo={promoResolved} locale={locale} />
      ) : null,
    servicesBar: pageCtx.display.servicesBar.enabled ? (
      <ProductServicesBar
        key="servicesBar"
        cards={[
          {
            icon: "🚚",
            title: labels.servicesDelivery,
            description: labels.servicesDeliveryDesc,
          },
          {
            icon: "💳",
            title: labels.servicesPayment,
            description: labels.servicesPaymentDesc,
          },
          {
            icon: "🛡️",
            title: labels.servicesWarranty,
            description: labels.servicesWarrantyDesc,
          },
        ]}
      />
    ) : null,
    trust:
      pageCtx.display.trust.enabled && trustResolved.enabled ? (
        <ProductTrustWidget
          key="trust"
          trust={trustResolved}
          numberLocale={locale.startsWith("ar") ? "ar-AE" : "en-US"}
        />
      ) : null,
  };

  return (
    <div className="prd-page" {...layoutAttrs} style={layoutStyle}>
      <ProductStickyLayoutInit />
      {pageCtx.display.breadcrumb.enabled ? (
        <div className="prd-page__chrome-rail">
          <nav className="prd-page__chrome prd-breadcrumb" aria-label="Breadcrumb">
            <Link href={`/${locale}`}>{labels.home}</Link>
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            {collectionTrail.length > 0 ? (
              <>
                <Link href={`/${locale}/collections`}>{labels.collections}</Link>
                {collectionTrail.map((item) => (
                  <span key={item.href} className="prd-breadcrumb__trail">
                    <span className="prd-breadcrumb__sep">&gt;&gt;</span>
                    <Link href={item.href}>{item.name}</Link>
                  </span>
                ))}
              </>
            ) : (
              <>
                <Link href={`/${locale}/products`}>{labels.products}</Link>
              </>
            )}
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            <span className="prd-breadcrumb__current">{title}</span>
          </nav>
        </div>
      ) : null}

      <div className="prd-page__main">
        <div className="prd-page__scroll">
          {pageCtx.elementOrder.main.map((key) => mainBlocks[key]).filter(Boolean)}
        </div>

        {pageCtx.display.sideBuyBox.enabled ? (
          <div className="prd-page__side-rail">
            <div className="prd-page__side">
              <div className="prd-page__side-stack">
                <ProductSideOrderedStack
                  order={pageCtx.elementOrder.side}
                  infoProps={{
                    product,
                    localePrefix: locale,
                    labels,
                    display: pageCtx.display,
                    productCta: productCtaEffective,
                    linkedTags: tagLinks,
                  }}
                  variationsProps={{ product, priceMatrix }}
                  purchaseProps={{
                    product,
                    productId,
                    deliveryOptions,
                    labels,
                    prices: purchasePrices,
                    initialSku: product.mpn || product.manufacturer_part_number,
                    display: pageCtx.display,
                    addToCart: addToCartResolved,
                    currencyCtx,
                    conditionInVariations,
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {pageCtx.display.floatingCta.enabled &&
      productCtaEffective.enabled &&
      productCtaEffective.placements.floating ? (
        <ProductFloatingCta config={productCtaEffective} localePrefix={locale} />
      ) : null}

      <script
        type="application/json"
        id="prd-price-matrix"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(priceMatrix) }}
      />
    </div>
  );
}
