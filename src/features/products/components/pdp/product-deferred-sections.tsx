import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Product } from "../../types";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";
import { resolveProductPageContext } from "../../lib/product-page-display";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { ProductFrequentlyBought } from "./product-frequently-bought";
import { ProductCrossLinks } from "./product-cross-links";
import { ProductPromoBanner } from "./product-promo-banner";
import { ProductServicesBar } from "./product-services-bar";
import { ProductTrustWidget } from "./product-trust-widget";
import { isProductPageDeferredBlock } from "@/features/products/lib/product-page-block-registry";

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

type DeferredMainKey = "frequentlyBought" | "crossLinks" | "promo" | "servicesBar" | "trust";

export type { DeferredMainKey };

type CrossLinkGroup = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export type DeferredSectionBlocksProps = {
  locale: string;
  slug: string;
  product: Product;
  crossLinkGroups: CrossLinkGroup[];
  promoResolved: ResolvedProductPageContext["promo"] & { ctaHref: string };
  trustResolved: ResolvedProductPageContext["trust"] & { href: string };
  labels: {
    frequentlyBought: string;
    servicesDelivery: string;
    servicesDeliveryDesc: string;
    servicesPayment: string;
    servicesPaymentDesc: string;
    servicesWarranty: string;
    servicesWarrantyDesc: string;
  };
  cardTheme?: ProductCardTheme;
};

/** Server-safe block map (React nodes only — safe to pass into client components). */
export function buildDeferredSectionBlocks({
  locale,
  slug,
  product,
  crossLinkGroups,
  promoResolved,
  trustResolved,
  labels,
  cardTheme,
}: DeferredSectionBlocksProps): Record<DeferredMainKey, ReactNode> {
  return {
    frequentlyBought: (
      <Suspense fallback={<RouteSuspenseFallback variant="detail" />}>
        <ProductFrequentlyBought
          key="fbt"
          locale={locale}
          slug={slug}
          product={product}
          title={labels.frequentlyBought}
          cardTheme={cardTheme}
        />
      </Suspense>
    ),
    crossLinks: <ProductCrossLinks key="crossLinks" groups={crossLinkGroups} />,
    promo: <ProductPromoBanner key="promo" promo={promoResolved} locale={locale} />,
    servicesBar: (
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
    ),
    trust: (
      <ProductTrustWidget
        key="trust"
        trust={trustResolved}
        numberLocale={getNumberLocale(locale)}
      />
    ),
  };
}

type Props = DeferredSectionBlocksProps & {
  pageCtx: ResolvedProductPageContext;
  mainOrderKeys: DeferredMainKey[];
  quoteCta?: ResolvedProductCtaConfig;
};

export async function ProductDeferredSections({
  pageCtx,
  mainOrderKeys,
  quoteCta: _quoteCta,
  ...blockProps
}: Props) {
  const blocks = buildDeferredSectionBlocks(blockProps);
  const visibleBlocks: Record<string, ReactNode> = {
    frequentlyBought: pageCtx.display.frequentlyBought.enabled
      ? blocks.frequentlyBought
      : null,
    crossLinks: pageCtx.display.crossLinks.enabled ? blocks.crossLinks : null,
    promo:
      pageCtx.display.promo.enabled && blockProps.promoResolved.enabled
        ? blocks.promo
        : null,
    servicesBar: pageCtx.display.servicesBar.enabled ? blocks.servicesBar : null,
    trust:
      pageCtx.display.trust.enabled && blockProps.trustResolved.enabled
        ? blocks.trust
        : null,
  };

  return (
    <>
      {mainOrderKeys
        .filter(isProductPageDeferredBlock)
        .map((key) => visibleBlocks[key])
        .filter(Boolean)}
    </>
  );
}
