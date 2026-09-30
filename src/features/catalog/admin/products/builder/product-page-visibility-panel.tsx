"use client";

import { ProductPageDisplayFields } from "../ProductPageDisplayFields";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";

export function ProductPageVisibilityPanel({ studio }: { studio: ProductPageBuilderStudio }) {
  const display = studio.elementsRules.desktop.display;

  return (
    <div className="ppb-visibility">
      <header className="ppb-visibility__header">
        <h3 className="ppb-visibility__title">Page visibility</h3>
        <p className="ppb-visibility__desc">
          Global defaults for which elements appear on product detail pages. Per-product overrides
          are available in the product editor. Buy Now and CTA commerce settings live under{" "}
          <a href="#buy-now">Buy Now</a> and <a href="#cta">CTA Button</a>.
        </p>
      </header>
      <ProductPageDisplayFields
        value={display}
        onChange={(partial) => studio.patchGlobalPageDisplay(partial)}
        showInherit={false}
      />
    </div>
  );
}
