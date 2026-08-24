import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import type { Product } from "../../types";
import { ProductCtaButton } from "./product-cta-button";
import { productLinkContextFromProduct } from "../../lib/product-whatsapp-link";

type Props = {
  config: ResolvedProductCtaConfig;
  localePrefix: string;
  product?: Product;
};

export function ProductFloatingCta({ config, localePrefix, product }: Props) {
  if (!config.enabled || !config.placements.floating) return null;
  const linkContext = product ? productLinkContextFromProduct(product) : undefined;
  return (
    <ProductCtaButton
      config={config}
      localePrefix={localePrefix}
      placement="floating"
      linkContext={linkContext}
    />
  );
}
