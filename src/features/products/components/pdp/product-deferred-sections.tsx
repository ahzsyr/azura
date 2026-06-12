import type { ReactNode } from "react";
import type { Product } from "../../types";
import { resolveProductPageContext } from "../../lib/product-page-display";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import { ProductFrequentlyBought } from "./product-frequently-bought";
import { ProductCrossLinks } from "./product-cross-links";
import { ProductPromoBanner } from "./product-promo-banner";
import { ProductServicesBar } from "./product-services-bar";
import { ProductTrustWidget } from "./product-trust-widget";

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

type DeferredMainKey = "frequentlyBought" | "crossLinks" | "promo" | "servicesBar" | "trust";

type CrossLinkGroup = {
  title: string;
  links: Array<{ label: string; href: string }>;
};
type Props = {
  locale: string;
  slug: string;
  product: Product;
  pageCtx: ResolvedProductPageContext;
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
  mainOrderKeys: DeferredMainKey[];
  cardTheme?: ProductCardTheme;
  quoteCta?: ResolvedProductCtaConfig;
};

export async function ProductDeferredSections({
  locale,
  slug,
  product,
  pageCtx,
  crossLinkGroups,
  promoResolved,
  trustResolved,
  labels,
  mainOrderKeys,
  cardTheme,
  quoteCta: _quoteCta,
}: Props) {
  const blocks: Record<string, ReactNode> = {
    frequentlyBought: pageCtx.display.frequentlyBought.enabled ? (
      <ProductFrequentlyBought
        key="fbt"
        locale={locale}
        slug={slug}
        product={product}
        title={labels.frequentlyBought}
        cardTheme={cardTheme}
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

  return <>{mainOrderKeys.map((key) => blocks[key]).filter(Boolean)}</>;
}
