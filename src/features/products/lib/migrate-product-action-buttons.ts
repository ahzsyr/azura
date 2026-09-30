/**
 * Pure migration helpers for legacy Add to Cart → Buy Now + Product CTA.
 * Used by scripts/catalog/migrate-product-action-buttons.ts and tests.
 */
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  serializeProductCtaForSite,
} from "./product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "./product-cta-migrate";
import {
  resolveProductBuyNow,
  serializeProductBuyNowForSite,
} from "./product-buy-now";
import type { ProductAddToCartPartial } from "./product-page-display";

export type MigrationReport = {
  changed: boolean;
  notes: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function migrateDisplayPartial(display: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(display)) return { value: display, changed: false };
  const next = { ...display };
  let changed = false;
  if ("addToCart" in next && !("buyNow" in next)) {
    next.buyNow = next.addToCart;
    changed = true;
  }
  if ("addToCart" in next) {
    delete next.addToCart;
    changed = true;
  }
  return { value: next, changed };
}

function migrateCompactDisplay(compact: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(compact)) return { value: compact, changed: false };
  const next = { ...compact };
  let changed = false;
  if (isRecord(next.elements) && "addToCart" in next.elements) {
    const elements = { ...next.elements };
    if (!("buyNow" in elements)) {
      elements.buyNow = elements.addToCart;
    }
    delete elements.addToCart;
    next.elements = elements;
    changed = true;
  }
  return { value: next, changed };
}

function migrateElementOrder(order: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(order)) return { value: order, changed: false };
  let changed = false;
  const mapSide = (arr: unknown): unknown => {
    if (!Array.isArray(arr)) return arr;
    return arr.map((k) => {
      if (k === "addToCart") {
        changed = true;
        return "buyNow";
      }
      return k;
    });
  };
  return {
    value: {
      ...order,
      main: mapSide(order.main),
      side: mapSide(order.side),
    },
    changed,
  };
}

function migrateCardDesignActions(design: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(design)) return { value: design, changed: false };
  const actions = design.actions;
  if (!isRecord(actions)) return { value: design, changed: false };
  let changed = false;
  const nextActions = { ...actions };
  if (Array.isArray(nextActions.enabledTypes)) {
    const types = nextActions.enabledTypes.map((t) => {
      if (t === "quote") {
        changed = true;
        return "cta";
      }
      return t;
    });
    nextActions.enabledTypes = [...new Set(types)];
  }
  if (nextActions.primaryAction === "quote") {
    nextActions.primaryAction = "cta";
    changed = true;
  }
  if (!changed) return { value: design, changed: false };
  return { value: { ...design, actions: nextActions }, changed: true };
}

/** Migrate site.json payload keys for product action buttons. */
export function migrateSiteSettingsForProductActions(
  site: Record<string, unknown>,
): MigrationReport & { settings: Record<string, unknown> } {
  const notes: string[] = [];
  const next = { ...site };
  let changed = false;

  const legacyAddToCart = next.productPageAddToCart as ProductAddToCartPartial | undefined;

  if (legacyAddToCart && !next.productBuyNow) {
    const buyNow = resolveProductBuyNow(undefined, legacyAddToCart);
    next.productBuyNow = serializeProductBuyNowForSite(buyNow);
    notes.push("Migrated productPageAddToCart → productBuyNow");
    changed = true;
  }

  const migratedCta = migrateProductCtaFromLegacyAddToCart(next.productCta, legacyAddToCart);
  if (migratedCta) {
    const globalCta = mergeProductCta(normalizeProductCtaGlobal(next.productCta), migratedCta);
    next.productCta = serializeProductCtaForSite(globalCta);
    notes.push("Seeded productCta from legacy add-to-cart");
    changed = true;
  }

  if ("productPageAddToCart" in next) {
    delete next.productPageAddToCart;
    notes.push("Removed productPageAddToCart");
    changed = true;
  }

  const displayM = migrateDisplayPartial(next.productPageDisplay);
  if (displayM.changed) {
    next.productPageDisplay = displayM.value;
    notes.push("Rewrote productPageDisplay addToCart → buyNow");
    changed = true;
  }

  if (isRecord(next.productPageDisplay) && !("quickView" in next.productPageDisplay)) {
    const display = next.productPageDisplay as Record<string, unknown>;
    const buyNow = display.buyNow as { enabled?: boolean } | undefined;
    next.productPageDisplay = {
      ...display,
      quickView: { enabled: buyNow?.enabled !== false },
    };
    notes.push("Seeded productPageDisplay.quickView from buyNow");
    changed = true;
  }

  const compactM = migrateCompactDisplay(next.productPageCompactDisplay);
  if (compactM.changed) {
    next.productPageCompactDisplay = compactM.value;
    notes.push("Rewrote productPageCompactDisplay elements");
    changed = true;
  }

  const orderM = migrateElementOrder(next.productPageElementOrder);
  if (orderM.changed) {
    next.productPageElementOrder = orderM.value;
    notes.push("Rewrote productPageElementOrder side keys");
    changed = true;
  }

  const designM = migrateCardDesignActions(next.productCardDesign);
  if (designM.changed) {
    next.productCardDesign = designM.value;
    notes.push("Migrated productCardDesign actions quote → cta");
    changed = true;
  }

  return { settings: next, changed, notes };
}

/** Migrate per-product document fields. */
export function migrateProductDocumentForProductActions(
  product: Record<string, unknown>,
): MigrationReport & { product: Record<string, unknown> } {
  const notes: string[] = [];
  const next = { ...product };
  let changed = false;

  const displayM = migrateDisplayPartial(next.page_display);
  if (displayM.changed) {
    next.page_display = displayM.value;
    notes.push("page_display: addToCart → buyNow");
    changed = true;
  }

  if ("add_to_cart" in next) {
    delete next.add_to_cart;
    notes.push("Removed add_to_cart");
    changed = true;
  }

  return { product: next, changed, notes };
}
