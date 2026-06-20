"use client";

import type { CSSProperties, ReactNode } from "react";
import { Fragment, Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";
import type { Collection } from "@/features/collections/types";
import type { Product } from "../../types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import {
  productPageLayoutRulesCssVars,
  productPageLayoutRulesDataAttrs,
} from "@/features/products/lib/product-storefront-layout";
import {
  enabledProductTabs,
  resolveProductPageContext,
  type ProductPageMainOrderKey,
  type ProductTabKey,
} from "@/features/products/lib/product-page-display";
import {
  buildDisplayPrices,
  resolveShopperCurrencyContext,
} from "@/features/products/lib/currency";
import {
  buildProductPriceMatrix,
  type ProductPriceMatrixPayload,
} from "@/features/products/lib/product-variation-pricing";
import {
  normalizeProductDeliveryOptions,
  type NormalizedDeliveryOption,
} from "@/features/products/lib/product-delivery";
import { ProductGallery } from "./product-gallery";
import { ProductSideOrderedStack } from "./product-side-ordered-stack";
import { ProductTabsSection, type ProductTabDef } from "./product-tabs-section";
import { ProductDescriptionPanel } from "./product-description-panel";
import { ProductSpecsTable } from "./product-specs-table";
import { ProductDocumentsList } from "./product-documents-list";
import { ProductShippingPanel } from "./product-shipping-panel";
import { ProductFloatingCta } from "./product-floating-cta";
import { ProductStickyLayoutInit } from "./product-sticky-layout-init";
import { DeferredSectionShell } from "@/components/motion/deferred-section-shell";
import { productPageCompactDisplayDataAttrs } from "@/features/products/lib/product-page-compact-display";
import type { DeferredMainKey } from "./product-deferred-sections";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import { ProductPageStack } from "./product-page-stack";
import {
  ProductPageResponsiveProvider,
  useProductPageResponsive,
} from "./product-page-responsive-provider";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import { isProductPageDeferredBlock } from "@/features/products/lib/product-page-block-registry";

const ProductReviewsSection = dynamic(
  () => import("./product-reviews-section").then((m) => ({ default: m.ProductReviewsSection })),
);

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

function isMainOrderKey(key: string): key is ProductPageMainOrderKey {
  return key === "gallery" ||
    key === "tabs" ||
    key === "frequentlyBought" ||
    key === "crossLinks" ||
    key === "promo" ||
    key === "servicesBar" ||
    key === "trust";
}

export type ProductDetailViewBodyProps = {
  locale: string;
  slug: string;
  product: Product;
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  pageCtx: ResolvedProductPageContext;
  labels: Awaited<ReturnType<typeof import("../../pdp/load-pdp-labels").loadPdpLabels>>;
  productCtaEffective: ResolvedProductCtaConfig;
  buyNowHref: string | null;
  promoResolved: Omit<ResolvedProductPageContext["promo"], "enabled">;
  trustResolved: Omit<ResolvedProductPageContext["trust"], "enabled">;
  collectionTrail: Array<{ name: string; href: string }>;
  tagLinks: Array<{ label: string; href?: string }>;
  brandHref?: string | null;
  title: string;
  productId: string;
  crossLinkGroups: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  purchasePrices: {
    sale: ReturnType<typeof buildDisplayPrices>["sale"];
    compare: ReturnType<typeof buildDisplayPrices>["compare"];
    displayCode: ReturnType<typeof buildDisplayPrices>["displayCode"];
    numberLocale: ReturnType<typeof buildDisplayPrices>["numberLocale"];
  };
  priceMatrix: ProductPriceMatrixPayload;
  deliveryOptions: NormalizedDeliveryOption[];
  conditionInVariations: boolean;
  currencyCtx: ReturnType<typeof resolveShopperCurrencyContext>;
  allCollections: Collection[];
  cardTheme?: ProductCardTheme;
  quoteCta?: ResolvedProductCtaConfig;
  /** Server-rendered deferred blocks (frequently bought, cross-links, etc.). */
  deferredSectionBlocks?: Partial<Record<DeferredMainKey, ReactNode>>;
  overflow: ResolvedProductPageOverflow;
};

function ProductDetailViewInner({
  locale,
  slug,
  product,
  pageCtx,
  labels,
  productCtaEffective,
  buyNowHref,
  promoResolved,
  trustResolved,
  collectionTrail,
  title,
  productId,
  purchasePrices,
  priceMatrix,
  deliveryOptions,
  conditionInVariations,
  currencyCtx,
  tagLinks,
  brandHref,
  deferredSectionBlocks,
}: Omit<
  ProductDetailViewBodyProps,
  "layoutRules" | "elementsRules"
>) {
  const { display, elementOrder, layout, viewport, resolvedLayout } = useProductPageResponsive();
  const pageCtxEffective = useMemo(
    () => ({ ...pageCtx, display, elementOrder }),
    [pageCtx, display, elementOrder],
  );
  const promoResolvedEffective = useMemo(
    () => ({ ...promoResolved, enabled: display.promo.enabled }),
    [promoResolved, display.promo.enabled],
  );
  const trustResolvedEffective = useMemo(
    () => ({ ...trustResolved, enabled: display.trust.enabled }),
    [trustResolved, display.trust.enabled],
  );

  const tabDefs = useMemo(
    () => buildTabDefs(display, labels),
    [display, labels],
  );
  const firstTabKey = tabDefs[0]?.key ?? "description";

  const panels: Partial<Record<ProductTabKey, ReactNode>> = {
    description: (
      <ProductDescriptionPanel
        sections={product.detailed_description ?? []}
        description={product.description}
        shortDescription={product.short_description}
        emptyLabel={labels.noDescription}
        collapseLabel={labels.description}
      />
    ),
    specs: <ProductSpecsTable product={product} emptyLabel={labels.noSpecs} />,
    documents: <ProductDocumentsList documents={product.documents ?? []} />,
    shipping: <ProductShippingPanel product={product} emptyLabel={labels.noShipping} />,
    reviews: (
      <div data-product-reviews>
        <ProductReviewsSection
          product={product}
          dateLocale={getShortLanguageLocale(locale)}
        />
      </div>
    ),
  };

  const immediateMainBlocks: Record<ProductPageMainOrderKey, ReactNode> = {
    gallery: display.gallery.enabled ? (
      <section key="gallery" className="prd-page__hero">
        <ProductGallery
          slug={slug}
          product={product}
          certHeading={labels.certHeading}
          layoutMode={layout.galleryMobileLayout}
          thumbPlacement={layout.galleryThumbPlacement}
        />
      </section>
    ) : null,
    tabs:
      display.tabs.enabled && tabDefs.length > 0 ? (
        <Suspense key="tabs" fallback={<RouteSuspenseFallback />}>
          <ProductTabsSection
            tabs={tabDefs}
            panels={panels}
            layoutMode={layout.tabsMode}
            initialTab={firstTabKey}
          />
        </Suspense>
      ) : null,
    frequentlyBought: null,
    crossLinks: null,
    promo: null,
    servicesBar: null,
    trust: null,
  };

  const deferredMainKeys = resolvedLayout.deferredBlocks.filter((key): key is ProductPageMainOrderKey =>
    isMainOrderKey(key),
  );
  const hasDeferredSections = deferredMainKeys.some((key) => {
    if (key === "frequentlyBought") return display.frequentlyBought.enabled;
    if (key === "crossLinks") return display.crossLinks.enabled;
    if (key === "promo") return display.promo.enabled && promoResolvedEffective.enabled;
    if (key === "servicesBar") return display.servicesBar.enabled;
    if (key === "trust") return display.trust.enabled && trustResolvedEffective.enabled;
    return false;
  });

  const galleryBlock =
    display.gallery.enabled ? (
      <section className="prd-page__hero">
        <ProductGallery
          slug={slug}
          product={product}
          certHeading={labels.certHeading}
          layoutMode={layout.galleryMobileLayout}
          thumbPlacement={layout.galleryThumbPlacement}
        />
      </section>
    ) : null;

  const tabsBlock =
    display.tabs.enabled && tabDefs.length > 0 ? (
      <Suspense fallback={<RouteSuspenseFallback />}>
        <ProductTabsSection
          tabs={tabDefs}
          panels={panels}
          layoutMode={layout.tabsMode}
          initialTab={firstTabKey}
        />
      </Suspense>
    ) : null;

  const sideBuyBoxBlock =
    display.sideBuyBox.enabled ? (
      <div className="prd-page__side-stack">
        <ProductSideOrderedStack
          order={elementOrder.side}
          infoProps={{
            product,
            slug,
            localePrefix: locale,
            labels,
            display,
            productCta: productCtaEffective,
            linkedTags: tagLinks,
            brandHref,
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
            display,
            buyNow: pageCtxEffective.buyNow,
            buyNowHref,
            currencyCtx,
            conditionInVariations,
          }}
        />
      </div>
    ) : null;

  const renderDeferredBlock = (key: ProductPageMainOrderKey) => {
    if (!deferredSectionBlocks) return null;
    if (key === "frequentlyBought" && !display.frequentlyBought.enabled) return null;
    if (key === "crossLinks" && !display.crossLinks.enabled) return null;
    if (key === "promo" && !(display.promo.enabled && promoResolvedEffective.enabled)) return null;
    if (key === "servicesBar" && !display.servicesBar.enabled) return null;
    if (key === "trust" && !(display.trust.enabled && trustResolvedEffective.enabled)) return null;
    const block = deferredSectionBlocks[key as DeferredMainKey];
    return block ? <Fragment key={key}>{block}</Fragment> : null;
  };

  const deferredBlocksForStack = Object.fromEntries(
    deferredMainKeys
      .map((key) => [key, renderDeferredBlock(key)])
      .filter(([, node]) => node != null),
  ) as Partial<Record<DeferredMainKey, ReactNode>>;

  const useStackLayout = viewport === "mobile" || viewport === "tablet";

  return (
    <>
      <ProductStickyLayoutInit />
      {display.breadcrumb.enabled ? (
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

      <div
        className={`prd-page__main${useStackLayout ? " prd-page__main--stack" : ""}`}
        data-prd-viewport={viewport}
      >
        {useStackLayout ? (
          <ProductPageStack
            blocks={{
              gallery: galleryBlock,
              sideBuyBox: sideBuyBoxBlock,
              tabs: tabsBlock,
              ...deferredBlocksForStack,
            }}
          />
        ) : (
          <>
            <div className="prd-page__scroll">
              {elementOrder.main
                .filter((key) => resolvedLayout.visibleBlocks.includes(key))
                .filter((key) => !isProductPageDeferredBlock(key))
                .map((key) => immediateMainBlocks[key])
                .filter(Boolean)}
              {hasDeferredSections && deferredSectionBlocks ? (
                <DeferredSectionShell minHeight={320} className="prd-page__deferred">
                  {deferredMainKeys.map((key) => renderDeferredBlock(key))}
                </DeferredSectionShell>
              ) : null}
            </div>

            {display.sideBuyBox.enabled ? (
              <div className="prd-page__side-rail">
                <div className="prd-page__side">{sideBuyBoxBlock}</div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {display.floatingCta.enabled &&
      productCtaEffective.enabled &&
      productCtaEffective.placements.floating ? (
        <ProductFloatingCta config={productCtaEffective} localePrefix={locale} />
      ) : null}

      <script
        type="application/json"
        id="prd-price-matrix"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(priceMatrix) }}
      />
    </>
  );
}

function buildTabDefs(
  display: ResolvedProductPageContext["display"],
  labels: ProductDetailViewBodyProps["labels"],
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

export function ProductDetailViewBody(props: ProductDetailViewBodyProps) {
  const viewportLayoutAttrMap: Record<
    ProductPageViewport,
    {
      stickyBuy: string;
      stickyCrumb: string;
      fixedBuy: string;
      mobileGallery: string;
      compactEnabled: string;
      compactOffset: string;
      compactVisible: string;
    }
  > = {
    desktop: {
      stickyBuy: props.layoutRules.desktop.stickyBuyBox ? "true" : "false",
      stickyCrumb: props.layoutRules.desktop.stickyBreadcrumb ? "true" : "false",
      fixedBuy: props.layoutRules.desktop.fixedBuyColumn ? "true" : "false",
      mobileGallery: props.layoutRules.desktop.mobileGalleryFirst ? "first" : "natural",
      compactEnabled: props.elementsRules.desktop.compactDisplay.enabled ? "true" : "false",
      compactOffset: String(props.elementsRules.desktop.compactDisplay.scrollOffsetPx),
      compactVisible: props.elementsRules.desktop.compactDisplay.visibleKeys.join(","),
    },
    tablet: {
      stickyBuy: props.layoutRules.tablet.stickyBuyBox ? "true" : "false",
      stickyCrumb: props.layoutRules.tablet.stickyBreadcrumb ? "true" : "false",
      fixedBuy: props.layoutRules.tablet.fixedBuyColumn ? "true" : "false",
      mobileGallery: props.layoutRules.tablet.mobileGalleryFirst ? "first" : "natural",
      compactEnabled: props.elementsRules.tablet.compactDisplay.enabled ? "true" : "false",
      compactOffset: String(props.elementsRules.tablet.compactDisplay.scrollOffsetPx),
      compactVisible: props.elementsRules.tablet.compactDisplay.visibleKeys.join(","),
    },
    mobile: {
      stickyBuy: props.layoutRules.mobile.stickyBuyBox ? "true" : "false",
      stickyCrumb: props.layoutRules.mobile.stickyBreadcrumb ? "true" : "false",
      fixedBuy: props.layoutRules.mobile.fixedBuyColumn ? "true" : "false",
      mobileGallery: props.layoutRules.mobile.mobileGalleryFirst ? "first" : "natural",
      compactEnabled: props.elementsRules.mobile.compactDisplay.enabled ? "true" : "false",
      compactOffset: String(props.elementsRules.mobile.compactDisplay.scrollOffsetPx),
      compactVisible: props.elementsRules.mobile.compactDisplay.visibleKeys.join(","),
    },
  };

  const desktopCompact = props.elementsRules.desktop.compactDisplay;
  const tabletCompact = props.elementsRules.tablet.compactDisplay;
  const mobileCompact = props.elementsRules.mobile.compactDisplay;
  const layoutAttrs = {
    ...productPageLayoutRulesDataAttrs(props.layoutRules),
    ...productPageCompactDisplayDataAttrs(desktopCompact),
    "data-prd-side-compact-enabled-tablet": tabletCompact.enabled ? "true" : "false",
    "data-prd-side-compact-offset-tablet": String(tabletCompact.scrollOffsetPx),
    "data-prd-side-compact-visible-tablet": tabletCompact.visibleKeys.join(","),
    "data-prd-side-compact-enabled-mobile": mobileCompact.enabled ? "true" : "false",
    "data-prd-side-compact-offset-mobile": String(mobileCompact.scrollOffsetPx),
    "data-prd-side-compact-visible-mobile": mobileCompact.visibleKeys.join(","),
  };
  const layoutStyle = productPageLayoutRulesCssVars(props.layoutRules) as CSSProperties;

  return (
    <div
      className="prd-page"
      {...layoutAttrs}
      style={layoutStyle}
      data-prd-layout-map={JSON.stringify(viewportLayoutAttrMap)}
    >
      <ProductPageResponsiveProvider
        layoutRules={props.layoutRules}
        elementsRules={props.elementsRules}
        productDisplayPartial={props.product.page_display}
        overflow={props.overflow}
      >
        <ProductDetailViewInner {...props} />
      </ProductPageResponsiveProvider>
    </div>
  );
}
