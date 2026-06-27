import { useCallback, useEffect } from "react";

export const ADMIN_PRODUCT_TABS = [
  { id: "table", label: "Products Table", icon: "▦", short: "Table" },
  { id: "cta", label: "General Product Settings — Storefront CTA", icon: "◆", short: "CTA" },
  { id: "page-builder", label: "Product Page Builder", icon: "▦", short: "Builder" },
  { id: "page-appearance", label: "Advanced — Product Page Appearance", icon: "◇", short: "Page" },
  { id: "card-appearance", label: "Advanced — Product Card Appearance", icon: "▣", short: "Cards" },
] as const;

export type AdminProductTabId = (typeof ADMIN_PRODUCT_TABS)[number]["id"];

function hashToTab(): AdminProductTabId {
  if (typeof window === "undefined") return "table";
  const h = window.location.hash.replace(/^#\/?/, "");
  return ADMIN_PRODUCT_TABS.some((t) => t.id === h) ? (h as AdminProductTabId) : "table";
}

export function AdminProductsTabNav({
  active,
  onChange,
}: {
  active: AdminProductTabId;
  onChange: (t: AdminProductTabId) => void;
}) {
  const syncFromHash = useCallback(() => {
    const next = hashToTab();
    if (next !== active) onChange(next);
  }, [active, onChange]);

  useEffect(() => {
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  return (
    <nav className="apm-tabs" aria-label="Products admin sections">
      <div className="apm-tabs__track" role="tablist">
        {ADMIN_PRODUCT_TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`apm-panel-${t.id}`}
              id={`apm-tab-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`apm-tabs__btn${isActive ? " apm-tabs__btn--active" : ""}`}
              onClick={() => {
                onChange(t.id);
                const nextHash = `#${t.id}`;
                if (window.location.hash !== nextHash) {
                  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = ADMIN_PRODUCT_TABS.findIndex((x) => x.id === t.id);
                const dir = e.key === "ArrowRight" ? 1 : -1;
                const next = ADMIN_PRODUCT_TABS[(i + dir + ADMIN_PRODUCT_TABS.length) % ADMIN_PRODUCT_TABS.length];
                onChange(next.id);
                window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next.id}`);
                window.setTimeout(() => document.getElementById(`apm-tab-${next.id}`)?.focus(), 0);
              }}
            >
              <span className="apm-tabs__ico" aria-hidden>
                {t.icon}
              </span>
              <span className="apm-tabs__label">
                <span className="apm-tabs__label-full">{t.label}</span>
                <span className="apm-tabs__label-short">{t.short}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Call once on mount to restore #hash tab without flashing wrong panel. */
export function readInitialAdminProductTab(): AdminProductTabId {
  return hashToTab();
}
