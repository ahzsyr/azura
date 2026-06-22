import type { ResolvedProductCtaConfig } from "../../lib/product-cta";
import { ProductCtaButton } from "./product-cta-button";

type Props = {
  config: ResolvedProductCtaConfig;
  localePrefix: string;
};

export function ProductFloatingCta({ config, localePrefix }: Props) {
  if (!config.enabled || !config.placements.floating) return null;
  return <ProductCtaButton config={config} localePrefix={localePrefix} placement="floating" />;
}
