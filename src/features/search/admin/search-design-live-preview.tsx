"use client";

import { useMemo, useState } from "react";
import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";
import {
  resolveSearchPageLayout,
  searchPageLayoutClassNames,
  searchPageLayoutCssVars,
  searchPageShowDesktopSidebar,
} from "@/features/search/lib/search-page-layout";
import { SearchResultCardRouter } from "@/features/search/components/discovery/search-result-card-router";
import type { SearchResultHit } from "@/features/search/components/discovery/search-result-card-router";
import { cn } from "@/lib/utils";

const MOCK_HITS: SearchResultHit[] = [
  {
    id: "preview-1",
    title: "Ubiquiti WAN Switch RJ45",
    snippet: "Professional-grade network switch for WAN connectivity.",
    urlPath: "/products/ubiquiti-wan-switch",
    entityType: "CATALOG_PRODUCT",
    card: {
      imageUrl: "/images/placeholder.svg",
      price: { min: 255.15, currency: "USD" },
      rating: { value: 4.5, count: 12 },
      brand: "Ubiquiti",
    },
  },
  {
    id: "preview-2",
    title: "UniFi Switch 24 PoE",
    snippet: "Managed PoE switch for enterprise deployments.",
    urlPath: "/products/unifi-switch-24",
    entityType: "CATALOG_PRODUCT",
    card: {
      price: { min: 399, currency: "USD" },
      brand: "Ubiquiti",
    },
  },
];

type Props = {
  appearance: AdminSearchSettings["appearance"];
};

export function SearchDesignLivePreview({ appearance }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const page = useMemo(() => resolveSearchPageLayout(appearance.page), [appearance.page]);
  const layoutClasses = searchPageLayoutClassNames(page);
  const layoutVars = searchPageLayoutCssVars(page);
  const showSidebar = searchPageShowDesktopSidebar(page);

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Live preview</h4>
        <div className="flex gap-1 rounded-md border bg-background p-0.5 text-xs">
          <button
            type="button"
            className={cn("rounded px-2 py-1", device === "desktop" && "bg-muted font-medium")}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={cn("rounded px-2 py-1", device === "mobile" && "bg-muted font-medium")}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto overflow-hidden rounded-lg border bg-background shadow-sm transition-all",
          device === "mobile" ? "max-w-[320px]" : "max-w-full",
          "sm-search-page",
          layoutClasses,
        )}
        style={layoutVars}
      >
        {page.heroStyle !== "none" ? (
          <div className="sm-search-page-hero relative h-16 shrink-0" aria-hidden />
        ) : null}

        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            {page.heroShowIcon ? (
              <div className="h-6 w-6 rounded bg-primary/15" aria-hidden />
            ) : null}
            <div>
              <div className="h-3 w-24 rounded bg-foreground/20" />
              <div className="mt-1 h-2 w-36 rounded bg-muted-foreground/20" />
            </div>
          </div>

          <div className="mb-3 h-8 rounded-full border bg-muted/30" />

          <div
            className={cn(
              "flex gap-2",
              page.layout === "stacked" ? "flex-col" : "flex-row",
            )}
          >
            {showSidebar && device === "desktop" ? (
              <div className="w-24 shrink-0 space-y-1 rounded border bg-muted/20 p-2">
                <div className="h-2 w-full rounded bg-muted-foreground/25" />
                <div className="h-2 w-3/4 rounded bg-muted-foreground/15" />
                <div className="h-2 w-full rounded bg-muted-foreground/15" />
              </div>
            ) : null}

            <div className="min-w-0 flex-1 space-y-2">
              {page.showEntityPills ? (
                <div className="flex gap-1">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px]">Product (2)</span>
                </div>
              ) : null}
              {MOCK_HITS.map((hit) => (
                <SearchResultCardRouter
                  key={hit.id}
                  hit={hit}
                  query="switch"
                  entityLabel="Product"
                  cardStyle={page.resultCardStyle}
                  cardFields={page.resultCardFields}
                  className="pointer-events-none scale-[0.92] origin-top-left"
                />
              ))}
            </div>

            {page.previewPane && device === "desktop" ? (
              <div className="hidden w-[38%] shrink-0 rounded border border-dashed border-border/60 bg-muted/10 p-2 sm:block">
                <p className="text-[9px] text-muted-foreground">Preview pane</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Template: <span className="font-medium capitalize">{page.template}</span>
        {" · "}
        Modal: {appearance.modal.panelStyle}
      </p>
    </div>
  );
}
