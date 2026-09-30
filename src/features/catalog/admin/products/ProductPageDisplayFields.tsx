import type { ReactNode } from "react";
import {
  resolveProductPageDisplay,
  type ProductPageDisplayPartial,
  type ResolvedProductPageDisplay,
} from "@/features/products/lib/product-page-display";
import "./product-page-display-fields.css";

// ── Inline icons ──────────────────────────────────────────────────────────────

function IconLayout() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 5h11M6 5v7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 1.5h2l1.5 7h6l1.5-5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="12.5" r="0.75" fill="currentColor" />
      <circle cx="10" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6.5v3.5M7 4v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTabs() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="4.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 7h3.5V4.5a1 1 0 0 1 1-1H8a1 1 0 0 1 1 1V7h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 5L7 2l5.5 3L7 8 1.5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M1.5 8.5L7 11.5l5.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────

interface GroupConfig {
  key: string;
  title: string;
  icon: ReactNode;
  description: string;
  color: string;
  keys: (keyof ResolvedProductPageDisplay)[];
}

const GROUPS: GroupConfig[] = [
  {
    key: "chrome",
    title: "Chrome & hero",
    icon: <IconLayout />,
    description: "Top navigation and product hero section",
    color: "#6366f1",
    keys: ["breadcrumb", "gallery", "sideBuyBox", "variations", "modelViewer"],
  },
  {
    key: "buybox",
    title: "Buy box",
    icon: <IconCart />,
    description: "Purchase controls shown in the side column",
    color: "#10b981",
    keys: [
      "compare", "saveToList", "price", "stock", "condition",
      "delivery", "quantity", "buyNow", "quickView", "keySpecs", "inlineCta",
    ],
  },
  {
    key: "info",
    title: "Product info",
    icon: <IconInfo />,
    description: "Supplementary content below the hero",
    color: "#f59e0b",
    keys: ["linkedTags", "shortDescription"],
  },
  {
    key: "tabs",
    title: "Tabs",
    icon: <IconTabs />,
    description: "Tab bar and individual tab sections",
    color: "#3b82f6",
    keys: [
      "tabs",
      "tabDescription",
      "tabOverview",
      "tabSpecs",
      "tabDocuments",
      "tabInstallation",
      "tabShipping",
      "tabReviews",
      "tabInBox",
    ],
  },
  {
    key: "lower",
    title: "Lower page",
    icon: <IconLayers />,
    description: "Sections below the main product area",
    color: "#8b5cf6",
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
  quickView: "Quick View (catalog cards)",
  keySpecs: "Key specs table",
  inlineCta: "Inline CTA",
  variations: "Variation chips",
  linkedTags: "Linked tags",
  shortDescription: "Short description",
  tabs: "Tab bar",
  tabDescription: "Description tab",
  tabOverview: "Overview tab",
  tabSpecs: "Specifications tab",
  tabDocuments: "Documents tab",
  tabInstallation: "Installation tab",
  tabShipping: "Shipping tab",
  tabReviews: "Reviews tab",
  tabInBox: "In The Box tab",
  modelViewer: "3D model viewer",
  frequentlyBought: "Frequently bought together",
  crossLinks: "Cross links",
  promo: "Promo banner",
  servicesBar: "Services bar",
  trust: "Trust widget",
  floatingCta: "Floating CTA",
};

const ITEM_HINTS: Partial<Record<keyof ResolvedProductPageDisplay, string>> = {
  breadcrumb: "Navigation trail at top of page",
  gallery: "Product image carousel & viewer",
  sideBuyBox: "Column containing purchase controls",
  variations: "Option selector chips (size, color…)",
  compare: "Side-by-side product comparison",
  saveToList: "Wishlist / save for later button",
  price: "Product price display",
  stock: "In-stock / out-of-stock indicator",
  condition: "New, used, refurbished chips",
  delivery: "Shipping & delivery options",
  quantity: "Quantity input stepper",
  buyNow: "Primary purchase button",
  quickView: "Quick view on catalog listing cards",
  keySpecs: "Key specification highlights",
  inlineCta: "Embedded call-to-action block",
  linkedTags: "Clickable product tag links",
  shortDescription: "Brief product summary text",
  tabs: "Tab navigation bar",
  tabDescription: "Full product description tab",
  tabOverview: "UniFi Overview tab (follows Description unless overridden)",
  tabSpecs: "Technical specifications tab",
  tabDocuments: "Documents & manuals tab",
  tabInstallation: "UniFi Installation Tutorial tab (follows Documents unless overridden)",
  tabShipping: "Shipping information tab",
  tabReviews: "Customer reviews tab",
  tabInBox: "Package contents tab (UniFi layout)",
  modelViewer: "3D / GLB viewer in UniFi gallery",
  frequentlyBought: "Frequently bought together section",
  crossLinks: "Related product cross-links",
  promo: "Promotional banner section",
  servicesBar: "Services highlights bar",
  trust: "Trust badges and social proof",
  floatingCta: "Sticky floating action button",
};

// ── Toggle item ───────────────────────────────────────────────────────────────

function ToggleItem({
  itemKey,
  checked,
  inherited,
  showInherit,
  onChange,
  onReset,
}: {
  itemKey: keyof ResolvedProductPageDisplay;
  checked: boolean;
  inherited: boolean;
  showInherit?: boolean;
  onChange: (checked: boolean) => void;
  onReset: () => void;
}) {
  const label = LABELS[itemKey] ?? itemKey;
  const hint = ITEM_HINTS[itemKey];
  const inputId = `ppd-${itemKey}`;

  return (
    <label
      htmlFor={inputId}
      className={`ppd-item${checked ? " ppd-item--on" : " ppd-item--off"}`}
    >
      <input
        id={inputId}
        type="checkbox"
        className="ppd-item__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ppd-item__text">
        <span className="ppd-item__label">{label}</span>
        {hint && <span className="ppd-item__hint">{hint}</span>}
      </span>
      {showInherit && (
        <span
          className={`ppd-item__tag${inherited ? " ppd-item__tag--global" : " ppd-item__tag--custom"}`}
        >
          {inherited ? "global" : "custom"}
        </span>
      )}
      {showInherit && !inherited && (
        <button
          type="button"
          className="ppd-item__reset"
          title="Reset to global default"
          onClick={(e) => {
            e.preventDefault();
            onReset();
          }}
        >
          ↩
        </button>
      )}
      <span className="ppd-switch" aria-hidden="true" />
    </label>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  isEnabled,
  isInherited,
  onToggle,
  onReset,
  showInherit,
}: {
  group: GroupConfig;
  isEnabled: (key: keyof ResolvedProductPageDisplay) => boolean;
  isInherited: (key: keyof ResolvedProductPageDisplay) => boolean;
  onToggle: (key: keyof ResolvedProductPageDisplay, checked: boolean) => void;
  onReset: (key: keyof ResolvedProductPageDisplay) => void;
  showInherit?: boolean;
}) {
  const enabledCount = group.keys.filter(isEnabled).length;
  const total = group.keys.length;
  const allOn = enabledCount === total;
  const anyOverridden = showInherit && group.keys.some((k) => !isInherited(k));

  const toggleAll = () => {
    for (const key of group.keys) {
      onToggle(key, !allOn);
    }
  };

  const resetAll = () => {
    for (const key of group.keys) {
      onReset(key);
    }
  };

  return (
    <div className="ppd-group">
      <div className="ppd-group__head">
        <span
          className="ppd-group__icon"
          style={{ color: group.color, background: `${group.color}1a` }}
        >
          {group.icon}
        </span>
        <div className="ppd-group__meta">
          <span className="ppd-group__title">{group.title}</span>
          <span className="ppd-group__desc">{group.description}</span>
        </div>
        <div className="ppd-group__actions">
          <span
            className="ppd-group__count"
            style={{ color: enabledCount > 0 ? group.color : undefined }}
          >
            {enabledCount}/{total}
          </span>
          {showInherit && anyOverridden && (
            <button
              type="button"
              className="ppd-group__btn"
              onClick={resetAll}
              title="Reset group to global defaults"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className={`ppd-group__btn${allOn ? " ppd-group__btn--active" : ""}`}
            onClick={toggleAll}
          >
            {allOn ? "Hide all" : "Show all"}
          </button>
        </div>
      </div>
      <div className="ppd-items">
        {group.keys.map((key) => (
          <ToggleItem
            key={key}
            itemKey={key}
            checked={isEnabled(key)}
            inherited={isInherited(key)}
            showInherit={showInherit}
            onChange={(checked) => onToggle(key, checked)}
            onReset={() => onReset(key)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductPageDisplayFields({
  value,
  onChange,
  showInherit,
  globalDisplay,
}: {
  value: ResolvedProductPageDisplay | ProductPageDisplayPartial;
  onChange: (next: ProductPageDisplayPartial) => void;
  showInherit?: boolean;
  globalDisplay?: ResolvedProductPageDisplay;
}) {
  const effectiveDisplay =
    showInherit && globalDisplay
      ? resolveProductPageDisplay(
          globalDisplay as unknown as ProductPageDisplayPartial,
          value as ProductPageDisplayPartial,
        )
      : (value as ResolvedProductPageDisplay);

  const isEnabled = (key: keyof ResolvedProductPageDisplay): boolean => {
    const v = effectiveDisplay[key];
    if (v && typeof v === "object" && "enabled" in v) return (v as { enabled: boolean }).enabled !== false;
    return true;
  };

  const isInherited = (key: keyof ResolvedProductPageDisplay): boolean => {
    if (!showInherit) return false;
    const v = (value as ProductPageDisplayPartial)[key];
    if (!v) return true;
    if (typeof v === "object" && (v as { inherit?: boolean }).inherit === true) return true;
    if (typeof v === "object" && !("enabled" in v)) return true;
    return false;
  };

  const handleToggle = (key: keyof ResolvedProductPageDisplay, checked: boolean) => {
    onChange({
      ...(value as ProductPageDisplayPartial),
      [key]: showInherit ? { enabled: checked, inherit: false } : { enabled: checked },
    });
  };

  const handleReset = (key: keyof ResolvedProductPageDisplay) => {
    const next = { ...(value as ProductPageDisplayPartial) };
    delete next[key];
    onChange(next);
  };

  const hasAnyOverride =
    showInherit && GROUPS.some((g) => g.keys.some((k) => !isInherited(k)));

  const resetAll = () => onChange({});

  return (
    <div className="ppd-root">
      {showInherit && (
        <div className="ppd-header">
          <div className="ppd-header__info">
            <span className="ppd-header__title">Per-product visibility overrides</span>
            <span className="ppd-header__desc">
              Toggle elements on or off for this product only.{" "}
              <a href="/admin/pages?tab=product" className="ppd-header__link">
                Global defaults
              </a>{" "}
              are managed in Pages → Product Page.
            </span>
          </div>
          {hasAnyOverride && (
            <button type="button" className="ppd-header__reset-all" onClick={resetAll}>
              Reset all to global
            </button>
          )}
        </div>
      )}
      <div className="ppd-groups">
        {GROUPS.map((group) => (
          <GroupCard
            key={group.key}
            group={group}
            isEnabled={isEnabled}
            isInherited={isInherited}
            onToggle={handleToggle}
            onReset={handleReset}
            showInherit={showInherit}
          />
        ))}
      </div>
    </div>
  );
}
