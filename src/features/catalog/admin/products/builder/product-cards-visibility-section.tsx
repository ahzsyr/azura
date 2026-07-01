"use client";

import { BuilderCollapsible } from "./controls/builder-controls";
import type { ProductPageBuilderStudio } from "./use-product-page-builder-studio";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";

const CARD_VISIBILITY_KEYS: Array<{
  key: keyof ResolvedProductPageDisplay;
  label: string;
}> = [
  { key: "price", label: "Price on cards" },
  { key: "stock", label: "Stock on cards" },
  { key: "trust", label: "Rating / trust on cards" },
  { key: "compare", label: "Compare on cards" },
  { key: "cardBrand", label: "Brand line on cards" },
  { key: "cardDiscountBadge", label: "Discount badge on cards" },
  { key: "shortDescription", label: "Short description on cards" },
  { key: "saveToList", label: "Wishlist on cards" },
];

export function ProductCardsVisibilitySection({ studio }: { studio: ProductPageBuilderStudio }) {
  const display = studio.activeElementsLayer.display;

  return (
    <BuilderCollapsible title="Product cards (listing)" defaultOpen>
      <p className="ppb-hint">
        Controls what information appears on product cards across catalog, blocks, and related
        product rows.
      </p>
      {CARD_VISIBILITY_KEYS.map(({ key, label }) => (
        <label key={key} className="ppb-check">
          <input
            type="checkbox"
            checked={display[key]?.enabled !== false}
            onChange={(e) => studio.toggleBlockVisibility(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </BuilderCollapsible>
  );
}
