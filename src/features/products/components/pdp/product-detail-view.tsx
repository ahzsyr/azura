import type { Collection } from "@/features/collections/types";
import type { Product } from "../../types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import { resolveProductDetailViewModel } from "@/resolvers/product/resolve-product-detail-view-model";
import { buildDeferredSectionBlocks } from "./product-deferred-sections";
import { loadPdpLabels } from "../../pdp/load-pdp-labels";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import { ProductDetailTemplate } from "@/templates/product/product-detail-template";

type Props = {
  locale: string;
  slug: string;
  product: Product;
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  overflow: ResolvedProductPageOverflow;
  siteProductCta?: unknown;
  allCollections: Collection[];
  cardTheme?: ProductCardTheme;
  quoteCta?: ResolvedProductCtaConfig;
  site: Record<string, unknown>;
};

export async function ProductDetailView({
  locale,
  slug,
  product,
  layoutRules,
  elementsRules,
  overflow,
  siteProductCta,
  allCollections,
  cardTheme,
  quoteCta,
  site,
}: Props) {
  const viewModel = await resolveProductDetailViewModel(
    slug,
    {
      locale,
      localePrefix: locale,
      site,
    },
    {
      slug,
      product,
      layoutRules,
      elementsRules,
      overflow,
      siteProductCta,
      allCollections,
      cardTheme,
      quoteCta,
      site,
    },
  );

  const labels = await loadPdpLabels(locale);
  const deferredSectionBlocks = buildDeferredSectionBlocks({
    locale,
    slug,
    product,
    crossLinkGroups: viewModel.crossLinkGroups,
    promoResolved: { ...viewModel.pageCtx.promo, ...viewModel.promoResolved },
    trustResolved: { ...viewModel.pageCtx.trust, ...viewModel.trustResolved },
    labels: {
      frequentlyBought: labels.frequentlyBought,
      servicesDelivery: labels.servicesDelivery,
      servicesDeliveryDesc: labels.servicesDeliveryDesc,
      servicesPayment: labels.servicesPayment,
      servicesPaymentDesc: labels.servicesPaymentDesc,
      servicesWarranty: labels.servicesWarranty,
      servicesWarrantyDesc: labels.servicesWarrantyDesc,
    },
    cardTheme,
  });

  return (
    <ProductDetailTemplate
      viewModel={viewModel}
      deferredSectionBlocks={deferredSectionBlocks}
    />
  );
}
