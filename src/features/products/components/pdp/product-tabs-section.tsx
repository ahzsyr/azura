"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ProductPageTabsMode } from "@/features/products/lib/product-storefront-layout";

export type ProductTabKey = "description" | "specs" | "documents" | "shipping" | "reviews";

export type ProductTabDef = { key: ProductTabKey; label: string };

type Props = {
  tabs: ProductTabDef[];
  panels: Partial<Record<ProductTabKey, ReactNode>>;
  layoutMode?: ProductPageTabsMode;
  initialTab?: ProductTabKey;
};

export function ProductTabsSection({
  tabs,
  panels,
  layoutMode = "tabs",
  initialTab,
}: Props) {
  const [active, setActive] = useState<ProductTabKey>(initialTab ?? tabs[0]?.key ?? "description");

  useEffect(() => {
    const onTab = (event: Event) => {
      const key = (event as CustomEvent<{ key?: ProductTabKey }>).detail?.key;
      if (key && tabs.some((t) => t.key === key)) setActive(key);
    };
    window.addEventListener("product:tab-change", onTab);
    return () => window.removeEventListener("product:tab-change", onTab);
  }, [tabs]);

  if (tabs.length === 0) return null;

  return (
    <section className="prd-page__tabs">
      <div
        className={`prd-tabs${layoutMode === "accordion" ? " prd-tabs--accordion" : ""}`}
        role="tablist"
        aria-orientation={layoutMode === "accordion" ? "vertical" : "horizontal"}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`prd-tab-${tab.key}`}
              className={`prd-tabs__btn${isActive ? " is-active" : ""}`}
              onClick={() => {
                setActive(tab.key);
                window.dispatchEvent(new CustomEvent("product:tab-change", { detail: { key: tab.key } }));
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="prd-tab-panels">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            data-tab-panel={tab.key}
            role="tabpanel"
            className={tab.key === active ? "is-active" : undefined}
            hidden={tab.key !== active}
          >
            {panels[tab.key]}
          </div>
        ))}
      </div>
    </section>
  );
}
