"use client";

import { useEffect, useState } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import type { CatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import type { Collection } from "@/features/collections/types";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import type {
  CatalogToolbarLabels,
  ProductListingLabels,
} from "@/features/products/listing/listing-labels";
import type { CollectionHierarchyChromeLabels } from "@/features/collections/components/collection-hierarchy-chrome";
import { ProductListingIsland } from "./product-listing-island";

type PageSlug = "products" | "collections";

type ListingShellPayload = {
  theme: CatalogListingTheme;
  collections: Collection[];
  listingCopy: {
    labels: ProductListingLabels;
    catalogToolbarLabels: CatalogToolbarLabels;
    hierarchyLabels: CollectionHierarchyChromeLabels;
  };
  pageDir: "ltr" | "rtl";
  listingMode: "product" | "collection";
};

type Props = {
  locale: string;
  pageSlug: PageSlug;
};

export function CatalogListingIndexPageClient({ locale, pageSlug }: Props) {
  const [shell, setShell] = useState<ListingShellPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setShell(null);
    setError(null);

    fetch(`/api/catalog/listing-shell?locale=${encodeURIComponent(locale)}&page=${pageSlug}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || `Listing shell failed (${res.status})`);
        }
        return res.json() as Promise<ListingShellPayload>;
      })
      .then((payload) => {
        if (!cancelled) setShell(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Listing shell failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, pageSlug]);

  if (error) {
    return (
      <div className="section-padding container-premium">
        <h1 className="font-heading text-2xl font-bold">Catalog unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!shell) {
    return <RouteSuspenseFallback variant="grid" />;
  }

  const { theme, collections, listingCopy, pageDir, listingMode } = shell;
  const emptyFacets = aggregateFacets([], collections);

  return (
    <CatalogListingPageShell
      title=""
      subtitle=""
      eyebrow=""
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
    >
      <ProductListingIsland
        locale={locale}
        records={[]}
        facets={emptyFacets}
        collections={collections}
        layoutVariant="catalog"
        listingMode={listingMode}
        hierarchyLabels={listingCopy.hierarchyLabels}
        hierarchyVariant={theme.listingLayout.chromeVariant}
        searchDebounceMs={theme.searchDebounceMs}
        searchFuzziness={theme.searchFuzziness}
        defaultViewMode={theme.listingLayout.defaultViewMode}
        viewModes={theme.listingLayout.viewModes}
        labels={listingCopy.labels}
        catalogToolbarLabels={listingCopy.catalogToolbarLabels}
        cardTheme={theme}
        catalogToolbarDock={theme.toolbarDock}
        pageDir={pageDir}
        serverPaginated
        total={0}
        totalPages={1}
      />
    </CatalogListingPageShell>
  );
}
