"use client";

import { useMemo } from "react";
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { LocaleConfig } from "@/features/products/lib/i18n/types";
import type {
  ResolvedProductPageDisplay,
  ResolvedProductPageElementOrder,
} from "@/features/products/lib/product-page-display";
import {
  diagnosticsForAction,
  PRODUCT_ACTION_SURFACE_LABELS,
  resolveProductActionVisibility,
  type ProductActionId,
  type ProductActionSurfaceId,
} from "@/features/products/lib/resolve-product-action-visibility";

export type ProductActionVisibilityContext = {
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  pageDisplay: ResolvedProductPageDisplay;
  cardDesign: ResolvedProductCardDesign;
  elementOrder?: ResolvedProductPageElementOrder;
  locale?: LocaleConfig;
  sampleSlug?: string;
};

const ACTION_TITLES: Record<ProductActionId, string> = {
  buyNow: "Buy Now",
  cta: "CTA Button",
  quickView: "Quick View",
  wishlist: "Wishlist",
  compare: "Compare",
};

/** Surfaces shown per action tab. */
const SURFACES_BY_ACTION: Record<ProductActionId, ProductActionSurfaceId[]> = {
  buyNow: ["pdpBuyBox", "card", "table", "quickView"],
  cta: ["pdpInlineCta", "pdpFloatingCta", "card", "table", "quickView"],
  quickView: ["card"],
  wishlist: ["card"],
  compare: ["card"],
};

const CARD_PREVIEW_ACTIONS: ProductActionId[] = ["buyNow", "cta", "quickView", "wishlist", "compare"];

export function ProductCardActionsVisibilityPanel({
  context,
  className,
}: {
  context: ProductActionVisibilityContext;
  className?: string;
}) {
  return (
    <div className={["pm-action-visibility-stack", className].filter(Boolean).join(" ")}>
      {CARD_PREVIEW_ACTIONS.map((action) => (
        <ProductActionVisibilityPanel
          key={action}
          action={action}
          context={context}
          surfacesOnly={["card"]}
          className="pm-action-visibility--compact"
        />
      ))}
    </div>
  );
}

type Props = {
  action: ProductActionId;
  context: ProductActionVisibilityContext;
  className?: string;
  /** When set, only render these surfaces (e.g. card preview sidebar). */
  surfacesOnly?: ProductActionSurfaceId[];
};

export function ProductActionVisibilityPanel({ action, context, className, surfacesOnly }: Props) {
  const diagnostics = useMemo(
    () => diagnosticsForAction(resolveProductActionVisibility(context), action),
    [context, action],
  );

  const surfaces = surfacesOnly ?? SURFACES_BY_ACTION[action];

  return (
    <div className={["pm-action-visibility", className].filter(Boolean).join(" ")}>
      <h3 className="pm-action-visibility__title">Visibility status</h3>
      <p className="pm-action-visibility__lede">
        Where {ACTION_TITLES[action]} appears on the storefront and which settings must be on.
      </p>
      <ul className="pm-action-visibility__list">
        {surfaces.map((surfaceId) => {
          const entry = diagnostics.find((d) => d.surface === surfaceId);
          if (!entry) return null;
          return (
            <li key={surfaceId} className="pm-action-visibility__surface">
              <div className="pm-action-visibility__surface-head">
                <span
                  className={
                    entry.visible
                      ? "pm-action-visibility__badge pm-action-visibility__badge--on"
                      : "pm-action-visibility__badge pm-action-visibility__badge--off"
                  }
                >
                  {entry.visible ? "Visible" : "Hidden"}
                </span>
                <span className="pm-action-visibility__surface-label">
                  {PRODUCT_ACTION_SURFACE_LABELS[surfaceId]}
                </span>
              </div>
              <ul className="pm-action-visibility__gates">
                {entry.gates.map((g) => (
                  <li
                    key={g.id}
                    className={
                      g.pass
                        ? "pm-action-visibility__gate pm-action-visibility__gate--pass"
                        : "pm-action-visibility__gate pm-action-visibility__gate--fail"
                    }
                  >
                    <span className="pm-action-visibility__gate-icon" aria-hidden>
                      {g.pass ? "✓" : "✗"}
                    </span>
                    <span className="pm-action-visibility__gate-label">{g.label}</span>
                    {!g.pass && g.detail ? (
                      <span className="pm-action-visibility__gate-detail">{g.detail}</span>
                    ) : null}
                    {!g.pass && g.fixHref ? (
                      <a href={g.fixHref} className="pm-action-visibility__gate-fix">
                        Fix
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
