import type { CSSProperties, ReactNode } from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { DeferredSectionShell } from "@/components/motion/deferred-section-shell";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { buildCollectionTrail, collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  buildProductTagLinks,
  getDeepestMatchingCollectionSlug,
} from "@/features/products/product-collections";
import type { Product } from "../../types";
import type {
  ResolvedProductCardLayout,
  ResolvedProductPageLayout,
} from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
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
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import { getLocaleByPrefix, defaultLocaleConfig } from "@/features/products/lib/i18n/config";
import { loadPdpLabels } from "../../pdp/load-pdp-labels";
import { ProductGallery } from "./product-gallery";
import { ProductSideOrderedStack } from "./product-side-ordered-stack";
import { ProductTabsSection, type ProductTabDef } from "./product-tabs-section";
import { ProductDescriptionPanel } from "./product-description-panel";
import { ProductSpecsTable } from "./product-specs-table";
import { ProductDocumentsList } from "./product-documents-list";
import { ProductShippingPanel } from "./product-shipping-panel";
import { ProductFloatingCta } from "./product-floating-cta";
import { ProductDeferredSections } from "./product-deferred-sections";
import { ProductStickyLayoutInit } from "./product-sticky-layout-init";
import {
  productPageCompactDisplayDataAttrs,
  type ResolvedProductPageCompactDisplay,
} from "@/features/products/lib/product-page-compact-display";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

const ProductReviewsSection = dynamic(
  () => import("./product-reviews-section").then((m) => ({ default: m.ProductReviewsSection })),
);

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

const DEFERRED_MAIN_KEYS = new Set<ProductPageMainOrderKey>([
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
]);

type DeferredMainKey = "frequentlyBought" | "crossLinks" | "promo" | "servicesBar" | "trust";

type Props = {
  locale: string;
  slug: string;
  product: Product;
  pageLayout: ResolvedProductPageLayout;
  pageCtx: ResolvedProductPageContext;
  siteProductCta?: unknown;
  compactDisplay: ResolvedProductPageCompactDisplay;
  allCollections: Collection[];
  cardLayout?: ResolvedProductCardLayout;
  cardLayoutCssVars?: Record<string, string>;
  quoteCta?: ResolvedProductCtaConfig;
};

function resolveLocalizedHref(href: string, localePrefix: string): string {
  const h = href.trim();
  if (!h || /^https?:\/\//i.test(h)) return h;
  const path = h.startsWith("/") ? h : `/${h}`;
  const prefix = `/${localePrefix}`;
  if (path.startsWith(prefix)) return stripAnyLocalePrefix(path);
  return path;
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
  allCollections,
  cardLayout,
  cardLayoutCssVars,
  quoteCta,
}: Props) {
  agentLog({
    location: "product-detail-view.tsx:ProductDetailView",
    message: "start",
    hypothesisId: "H3",
    data: { locale, slug },
  });
  try {
  const labels = await loadPdpLabels(locale);
  const localeConfig = getLocaleByPrefix(locale) ?? defaultLocaleConfig;

  // Keep PDP eligible for static/ISR rendering: resolve server prices from configured defaults.
  const currencyCtx = resolveShopperCurrencyContext(
    new Request("http://localhost"),
    null,
    localeConfig,
  );
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

  const buyNowHref = buildBuyNowHref(pageCtx.buyNow, slug, pageCtx.buyNowSlugOverride);

  const promoResolved = {
    ...pageCtx.promo,
    ctaHref: pageCtx.promo.ctaHref
      ? resolveLocalizedHref(pageCtx.promo.ctaHref, locale)
      : "/about",
  };

  const trustResolved = {
    ...pageCtx.trust,
    href: pageCtx.trust.href ? resolveLocalizedHref(pageCtx.trust.href, locale) : "",
  };

  const bySlug = collectionMapFromList(allCollections);
  const engine = catalogProductToCollectionProduct(slug, product);
  const deepestColSlug = getDeepestMatchingCollectionSlug(engine, allCollections);
  const collectionTrail = deepestColSlug
    ? buildCollectionTrail(locale, deepestColSlug, bySlug)
    : [];

  const tagLinks = buildProductTagLinks({
    catalogProduct: product,
    productSlug: slug,
    localePrefix: locale,
    allCollections,
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
        ...collectionTrail.map((item) => ({
          label: item.name,
          href: stripAnyLocalePrefix(item.href),
        })),
        ...(product.categories ?? []).map((cat) => {
          const match = tagLinks.find((tag) => tag.label === cat);
          return {
            label: cat,
            href: match?.href ? stripAnyLocalePrefix(match.href) : "/collections",
          };
        }),
      ].filter((link, idx, arr) => arr.findIndex((l) => l.label === link.label) === idx),
    },
    {
      title: labels.crossEquipment,
      links: tagLinks
        .slice(0, tagHalf)
        .filter((l): l is { label: string; href: string } => Boolean(l.href))
        .map((l) => ({ label: l.label, href: stripAnyLocalePrefix(l.href) })),
    },
    {
      title: labels.crossDevices,
      links: tagLinks
        .slice(tagHalf)
        .filter((l): l is { label: string; href: string } => Boolean(l.href))
        .map((l) => ({ label: l.label, href: stripAnyLocalePrefix(l.href) })),
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
    documents: <ProductDocumentsList documents={product.documents ?? []} />,
    shipping: <ProductShippingPanel product={product} emptyLabel={labels.noShipping} />,
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

  const immediateMainBlocks: Record<ProductPageMainOrderKey, ReactNode> = {
    gallery: pageCtx.display.gallery.enabled ? (
      <section key="gallery" className="prd-page__hero">
        <ProductGallery slug={slug} product={product} certHeading={labels.certHeading} />
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
    frequentlyBought: null,
    crossLinks: null,
    promo: null,
    servicesBar: null,
    trust: null,
  };

  const deferredMainKeys = pageCtx.elementOrder.main.filter((key) => DEFERRED_MAIN_KEYS.has(key));
  const hasDeferredSections = deferredMainKeys.some((key) => {
    if (key === "frequentlyBought") return pageCtx.display.frequentlyBought.enabled;
    if (key === "crossLinks") return pageCtx.display.crossLinks.enabled;
    if (key === "promo") return pageCtx.display.promo.enabled && promoResolved.enabled;
    if (key === "servicesBar") return pageCtx.display.servicesBar.enabled;
    if (key === "trust") return pageCtx.display.trust.enabled && trustResolved.enabled;
    return false;
  });

  agentLog({
    location: "product-detail-view.tsx:ProductDetailView",
    message: "render tree ready",
    hypothesisId: "H5",
    data: {
      slug,
      variationDims: variationDims.length,
      hasDeferredSections,
      deferredMainKeys,
      priceMatrixEntries: priceMatrix.entries.length,
    },
  });

  return (
    <div className="prd-page" {...layoutAttrs} style={layoutStyle}>
      <ProductStickyLayoutInit />
      {pageCtx.display.breadcrumb.enabled ? (
        <div className="prd-page__chrome-rail">
          <nav className="prd-page__chrome prd-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">{labels.home}</Link>
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            {collectionTrail.length > 0 ? (
              <>
                <Link href="/collections">{labels.collections}</Link>
                {collectionTrail.map((item) => (
                  <span key={item.href} className="prd-breadcrumb__trail">
                    <span className="prd-breadcrumb__sep">&gt;&gt;</span>
                    <Link href={stripAnyLocalePrefix(item.href)}>{item.name}</Link>
                  </span>
                ))}
              </>
            ) : (
              <Link href="/products">{labels.products}</Link>
            )}
            <span className="prd-breadcrumb__sep">&gt;&gt;</span>
            <span className="prd-breadcrumb__current">{title}</span>
          </nav>
        </div>
      ) : null}

      <div className="prd-page__main">
        <div className="prd-page__scroll">
          {pageCtx.elementOrder.main
            .filter((key) => !DEFERRED_MAIN_KEYS.has(key))
            .map((key) => immediateMainBlocks[key])
            .filter(Boolean)}
          {hasDeferredSections ? (
            <Suspense fallback={<RouteSuspenseFallback variant="detail" />}>
              <DeferredSectionShell minHeight={320}>
                <ProductDeferredSections
                  locale={locale}
                  slug={slug}
                  product={product}
                  pageCtx={pageCtx}
                  crossLinkGroups={crossLinkGroups}
                  promoResolved={promoResolved}
                  trustResolved={trustResolved}
                  labels={{
                    frequentlyBought: labels.frequentlyBought,
                    servicesDelivery: labels.servicesDelivery,
                    servicesDeliveryDesc: labels.servicesDeliveryDesc,
                    servicesPayment: labels.servicesPayment,
                    servicesPaymentDesc: labels.servicesPaymentDesc,
                    servicesWarranty: labels.servicesWarranty,
                    servicesWarrantyDesc: labels.servicesWarrantyDesc,
                  }}
                  mainOrderKeys={deferredMainKeys.filter((key): key is DeferredMainKey =>
                    DEFERRED_MAIN_KEYS.has(key),
                  )}
                  cardLayout={cardLayout}
                  cardLayoutCssVars={cardLayoutCssVars}
                  quoteCta={quoteCta}
                />
              </DeferredSectionShell>
            </Suspense>
          ) : null}
        </div>

        {pageCtx.display.sideBuyBox.enabled ? (
          <div className="prd-page__side-rail">
            <div className="prd-page__side">
              <div className="prd-page__side-stack">
                <ProductSideOrderedStack
                  order={pageCtx.elementOrder.side}
                  infoProps={{
                    product,
                    slug,
                    localePrefix: locale,
                    labels,
                    display: pageCtx.display,
                    productCta: productCtaEffective,
                    linkedTags: tagLinks,
                  }}
                  variationsProps={{ product, priceMatrix }}
                  purchaseProps={{
                    locale,
                    product,
                    productId,
                    deliveryOptions,
                    labels,
                    prices: purchasePrices,
                    initialSku: product.mpn || product.manufacturer_part_number,
                    display: pageCtx.display,
                    buyNow: pageCtx.buyNow,
                    buyNowHref,
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
  } catch (error) {
    agentLogError("product-detail-view.tsx:ProductDetailView", error, "H3", { locale, slug });
    throw error;
  }
}
