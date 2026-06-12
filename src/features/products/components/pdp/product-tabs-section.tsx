"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductPageTabsMode } from "@/features/products/lib/product-storefront-layout";
import {
  navigateToProductReviews,
} from "./product-reviews-link";

export type ProductTabKey = "description" | "specs" | "documents" | "shipping" | "reviews";

export type ProductTabDef = { key: ProductTabKey; label: string };

type Props = {
  tabs: ProductTabDef[];
  panels: Partial<Record<ProductTabKey, ReactNode>>;
  layoutMode?: ProductPageTabsMode;
  initialTab?: ProductTabKey;
};

function parseTabParam(raw: string | null, tabs: ProductTabDef[]): ProductTabKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase() as ProductTabKey;
  return tabs.some((t) => t.key === key) ? key : null;
}

export function ProductTabsSection({
  tabs,
  panels,
  layoutMode = "tabs",
  initialTab,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = parseTabParam(searchParams.get("tab"), tabs);
  const [active, setActive] = useState<ProductTabKey>(
    tabFromUrl ?? initialTab ?? tabs[0]?.key ?? "description",
  );

  const syncUrlForTab = useCallback(
    (key: ProductTabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === tabs[0]?.key) params.delete("tab");
      else params.set("tab", key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, tabs],
  );

  const activateTab = useCallback(
    (key: ProductTabKey, opts?: { syncUrl?: boolean; scrollReviews?: boolean }) => {
      if (!tabs.some((t) => t.key === key)) return;
      setActive(key);
      if (opts?.syncUrl !== false) syncUrlForTab(key);
      if (key === "reviews" && opts?.scrollReviews) {
        void navigateToProductReviews({ switchTab: false });
      }
    },
    [syncUrlForTab, tabs],
  );

  const setActiveTab = useCallback(
    (key: ProductTabKey, opts?: { syncUrl?: boolean; scrollReviews?: boolean }) => {
      activateTab(key, opts);
      window.dispatchEvent(
        new CustomEvent("product:tab-change", { detail: { key, from: "tabs" } }),
      );
    },
    [activateTab],
  );

  useEffect(() => {
    const onTab = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: ProductTabKey; from?: string }>).detail;
      if (detail?.from === "tabs") return;
      const key = detail?.key;
      if (key && tabs.some((t) => t.key === key)) {
        activateTab(key, { syncUrl: true, scrollReviews: key === "reviews" });
      }
    };
    window.addEventListener("product:tab-change", onTab);
    return () => window.removeEventListener("product:tab-change", onTab);
  }, [activateTab, tabs]);

  useEffect(() => {
    if (!tabFromUrl) return;
    activateTab(tabFromUrl, { syncUrl: false, scrollReviews: tabFromUrl === "reviews" });
  }, [activateTab, tabFromUrl]);

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
              onClick={() => setActiveTab(tab.key, { scrollReviews: tab.key === "reviews" })}
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
