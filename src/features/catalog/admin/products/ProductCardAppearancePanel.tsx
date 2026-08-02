"use client";

import type { ProductPageElementsRules } from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ProductCardAppearanceStudio } from "@/features/products/card-appearance/use-product-card-appearance-studio";
import { ProductCardAppearanceNav } from "./card-appearance/product-card-appearance-nav";
import { ProductCardAppearanceSections } from "./card-appearance/product-card-appearance-sections";
import { ProductCardLivePreview } from "./ProductCardLivePreview";
import { ProductCardActionsVisibilityPanel } from "./ProductActionVisibilityPanel";
import type { ProductActionVisibilityContext } from "./ProductActionVisibilityPanel";

export function ProductCardAppearancePanel({
  studio,
  elementsRules,
  buyNow,
  productCta,
  visibilityContext,
  onDirty,
}: {
  studio: ProductCardAppearanceStudio;
  elementsRules: ProductPageElementsRules;
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  visibilityContext: ProductActionVisibilityContext;
  onDirty?: () => void;
}) {
  const handleSectionChange = (id: Parameters<typeof studio.setActiveSection>[0]) => {
    studio.setActiveSection(id);
  };

  return (
    <section className="apm-dashboard-card apm-products-settings pca-root" aria-labelledby="apm-card-app-h">
      <header className="apm-dashboard-card__head">
        <h2 id="apm-card-app-h" className="apm-dashboard-card__title">
          Product Cards
        </h2>
        <p className="apm-dashboard-card__lede">
          Global design for storefront product cards. Content visibility (price, stock, rating, compare,
          brand) is managed in the <a href="#product-page">Product Page</a> tab. Action buttons use
          settings from <a href="#buy-now">Buy Now</a> and <a href="#cta">CTA Button</a>.
        </p>
      </header>
      <div className="apm-split pca-split">
        <div className="pca-split__settings">
          <ProductCardAppearanceNav
            activeSection={studio.activeSection}
            onSectionChange={handleSectionChange}
          />
          <div className="pca-split__content" onChange={() => onDirty?.()}>
            <ProductCardAppearanceSections studio={studio} />
          </div>
        </div>
        <aside className="apm-split__aside">
          <ProductCardActionsVisibilityPanel
            context={{
              ...visibilityContext,
              buyNow,
              productCta,
              cardDesign: studio.config.design,
            }}
            className="pm-action-visibility--aside"
          />
          <div className="apm-preview-cap">Live card preview</div>
          <ProductCardLivePreview
            config={studio.config}
            compareConfig={studio.comparePresetId ? studio.compareSnapshot ?? undefined : undefined}
            elementsRules={elementsRules}
            buyNow={buyNow}
            productCta={productCta}
            compareMode={Boolean(studio.comparePresetId && studio.compareSnapshot)}
          />
        </aside>
      </div>
    </section>
  );
}
