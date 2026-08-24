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
import { ProductDetailLayoutRouter } from "@/features/products/layout-templates/product-detail-layout-router";
import type {
  LayoutAssignmentSource,
  ProductPageLayoutTemplateId,
} from "@/features/products/layout-templates/types";

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
  productCta?: ResolvedProductCtaConfig;
  site: Record<string, unknown>;
  layoutTemplateId: ProductPageLayoutTemplateId;
  layoutAssignmentSource: LayoutAssignmentSource;
  layoutAssignmentDetail?: string;
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
  productCta,
  site,
  layoutTemplateId,
  layoutAssignmentSource,
  layoutAssignmentDetail,
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
      productCta,
      site,
      layoutTemplateId,
      layoutAssignmentSource,
      layoutAssignmentDetail,
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
    <ProductDetailLayoutRouter
      templateId={viewModel.layoutTemplateId}
      viewModel={viewModel}
      deferredSectionBlocks={deferredSectionBlocks}
    />
  );
}
