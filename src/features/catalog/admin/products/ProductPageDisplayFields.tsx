import {
  resolveProductPageDisplay,
  type DisplayElementOverride,
  type ProductPageDisplayPartial,
  type ResolvedProductPageDisplay,
} from "@/features/products/lib/product-page-display";

const GROUPS: { title: string; keys: (keyof ResolvedProductPageDisplay)[] }[] = [
  {
    title: "Chrome & hero",
    keys: ["breadcrumb", "gallery", "sideBuyBox", "variations"],
  },
  {
    title: "Buy box",
    keys: [
      "compare",
      "saveToList",
      "price",
      "stock",
      "condition",
      "delivery",
      "quantity",
      "buyNow",
      "keySpecs",
      "inlineCta",
    ],
  },
  {
    title: "Product info",
    keys: ["linkedTags", "shortDescription"],
  },
  {
    title: "Tabs",
    keys: ["tabs", "tabDescription", "tabSpecs", "tabDocuments", "tabShipping", "tabReviews"],
  },
  {
    title: "Lower page",
    keys: ["frequentlyBought", "crossLinks", "promo", "servicesBar", "trust", "floatingCta"],
  },
];

const LABELS: Partial<Record<keyof ResolvedProductPageDisplay, string>> = {
  breadcrumb: "Breadcrumb",
  gallery: "Gallery",
  sideBuyBox: "Buy box column",
  compare: "Compare action",
  saveToList: "Save to list",
  price: "Price",
  stock: "Stock status",
  condition: "Condition pills",
  delivery: "Delivery options",
  quantity: "Quantity",
  buyNow: "Buy Now / Shop Now",
  keySpecs: "Key specs table",
  inlineCta: "Inline CTA",
  variations: "Variation chips",
  linkedTags: "Linked tags",
  shortDescription: "Short description",
  tabs: "Tab bar",
  tabDescription: "Description tab",
  tabSpecs: "Specifications tab",
  tabDocuments: "Documents tab",
  tabShipping: "Shipping tab",
  tabReviews: "Reviews tab",
  frequentlyBought: "Frequently bought together",
  crossLinks: "Cross links",
  promo: "Promo banner",
  servicesBar: "Services bar",
  trust: "Trust widget",
  floatingCta: "Floating CTA",
};

export function ProductPageDisplayFields({
  value,
  onChange,
  showInherit,
  globalDisplay,
}: {
  value: ResolvedProductPageDisplay | ProductPageDisplayPartial;
  onChange: (next: ProductPageDisplayPartial) => void;
  showInherit?: boolean;
  /** Global page display used to reflect inherited toggle state in per-product overrides. */
  globalDisplay?: ResolvedProductPageDisplay;
}) {
  const patch = (key: keyof ResolvedProductPageDisplay, patch: DisplayElementOverride) => {
    onChange({ ...(value as ProductPageDisplayPartial), [key]: patch });
  };

  const effectiveDisplay = showInherit && globalDisplay
    ? resolveProductPageDisplay(globalDisplay, value as ProductPageDisplayPartial)
    : (value as ResolvedProductPageDisplay);

  const isEnabled = (key: keyof ResolvedProductPageDisplay) => {
    const v = effectiveDisplay[key];
    if (v && typeof v === "object" && "enabled" in v) return v.enabled !== false;
    return true;
  };

  return (
    <div className="pm-display-groups">
      {showInherit ? (
        <p className="pm-hint">
          Global defaults for these toggles are managed in the product settings{" "}
          <a href="#page-builder">Page builder</a> tab.
        </p>
      ) : null}
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="apm-fieldset">
          <legend className="apm-fieldset__legend">{group.title}</legend>
          <div className="pm-display-grid">
            {group.keys.map((key) => (
              <label key={key} className="pm-inline-check pm-display-toggle">
                <input
                  type="checkbox"
                  checked={isEnabled(key)}
                  onChange={(e) =>
                    patch(key, showInherit ? { enabled: e.target.checked, inherit: false } : { enabled: e.target.checked })
                  }
                />
                {LABELS[key] ?? key}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
