import type { Collection } from "@/features/collections/types";
import type { Product } from "@/features/products/types";
import type { ProductCardTheme } from "@/features/products/lib/product-card-theme";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { resolveProductPageContext } from "@/features/products/lib/product-page-display";
import type {
  buildDisplayPrices,
  resolveShopperCurrencyContext,
} from "@/features/products/lib/currency";
import type { ProductPriceMatrixPayload } from "@/features/products/lib/product-variation-pricing";
import type { NormalizedDeliveryOption } from "@/features/products/lib/product-delivery";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { loadPdpLabels } from "@/features/products/pdp/load-pdp-labels";

type ResolvedProductPageContext = ReturnType<typeof resolveProductPageContext>;

/** Serializable PDP presentation bundle for product-detail template. */
export type ProductDetailViewModel = {
  templateId: "product-detail";
  entityId: string;
  slug: string;
  locale: string;
  product: Product;
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  pageCtx: ResolvedProductPageContext;
  labels: Awaited<ReturnType<typeof loadPdpLabels>>;
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
  productCta?: ResolvedProductCtaConfig;
  overflow: ResolvedProductPageOverflow;
};
