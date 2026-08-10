"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import type { CatalogListingPagePayload } from "@/features/catalog/load-catalog-listing-page";
import type { ProductListingCatalogPayload } from "@/features/products/listing/types";
import { ProductListingIsland } from "./product-listing-island";

type PageSlug = "products" | "collections" | "categories";

type Props = {
  locale: string;
  pageSlug: PageSlug;
  initialPayload?: CatalogListingPagePayload;
  navigation?: ReactNode;
};

function ListingFromPayload({
  locale,
  pageSlug,
  payload,
  navigation,
}: {
  locale: string;
  pageSlug: PageSlug;
  payload: CatalogListingPagePayload;
  navigation?: ReactNode;
}) {
  const { theme, collections, facetTaxonomy, listingCopy, pageDir, listingMode, listing } = payload;
  const { records, facets, total = records.length, totalPages = 1 } = listing;

  return (
    <CatalogListingPageShell
      title={listingCopy.pageTitle}
      subtitle=""
      eyebrow=""
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      dir={pageDir}
      navigation={navigation}
    >
      <ProductListingIsland
        locale={locale}
        records={records}
        facets={facets}
        collections={collections}
        facetTaxonomy={facetTaxonomy}
        layoutVariant="catalog"
        listingMode={listingMode}
        hierarchyLabels={listingCopy.hierarchyLabels}
        hierarchyVariant={theme.listingLayout.chromeVariant}
        searchDebounceMs={theme.searchDebounceMs}
        searchFuzziness={theme.searchFuzziness}
        defaultViewMode={theme.listingLayout.defaultViewMode}
        viewModes={theme.listingLayout.viewModes}
        listColumnsDesktop={theme.listingLayout.listColumnsDesktop}
        listColumnsTablet={theme.listingLayout.listColumnsTablet}
        labels={listingCopy.labels}
        catalogToolbarLabels={listingCopy.catalogToolbarLabels}
        cardTheme={theme}
        catalogToolbarDock={theme.toolbarDock}
        pageDir={pageDir}
        listingFilters={theme.listingFilters}
        serverPaginated
        hasInitialPayload
        total={total}
        totalPages={totalPages}
      />
    </CatalogListingPageShell>
  );
}

async function fetchListingPayload(
  url: string,
): Promise<ProductListingCatalogPayload & { error?: string }> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Listing failed (${res.status})`);
  return res.json() as Promise<ProductListingCatalogPayload & { error?: string }>;
}

async function fetchListingWithRetry(
  url: string,
  attempts = 2,
): Promise<ProductListingCatalogPayload> {
  for (let i = 0; i < attempts; i += 1) {
    const payload = await fetchListingPayload(url);
    if (payload.records.length > 0 || i === attempts - 1) return payload;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return fetchListingPayload(url);
}

/** Client bootstrap when SSR payload is unavailable (degraded path). */
function ListingClientBootstrap({
  locale,
  pageSlug,
  navigation,
}: {
  locale: string;
  pageSlug: PageSlug;
  navigation?: ReactNode;
}) {
  const [payload, setPayload] = useState<CatalogListingPagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setError(null);

    const shellUrl = `/api/catalog/listing-shell?locale=${encodeURIComponent(locale)}&page=${pageSlug}`;
    const listingParams = new URLSearchParams(window.location.search);
    listingParams.set("locale", locale);
    if (pageSlug === "collections" || pageSlug === "categories") listingParams.set("mode", "collection");
    const listingUrl = `/api/catalog/listing?${listingParams.toString()}`;

    Promise.all([
      fetch(shellUrl, { credentials: "same-origin" }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || `Listing shell failed (${res.status})`);
        }
        return res.json();
      }),
      fetch(listingUrl, { credentials: "same-origin" }).then(async (res) => {
        if (!res.ok) throw new Error(`Listing failed (${res.status})`);
        return res.json();
      }),
    ])
      .then(async ([shell, listing]) => {
        if (cancelled) return;
        let resolvedListing = listing as ProductListingCatalogPayload;
        if (resolvedListing.records.length === 0) {
          resolvedListing = await fetchListingWithRetry(listingUrl);
        }
        if (cancelled) return;
        setPayload({ ...shell, listing: resolvedListing });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Catalog unavailable");
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

  if (!payload) {
    return <RouteSuspenseFallback variant="grid" />;
  }

  return (
    <ListingFromPayload
      locale={locale}
      pageSlug={pageSlug}
      payload={payload}
      navigation={navigation}
    />
  );
}

export function CatalogListingIndexPageClient({
  locale,
  pageSlug,
  initialPayload,
  navigation,
}: Props) {
  if (initialPayload) {
    return (
      <ListingFromPayload
        locale={locale}
        pageSlug={pageSlug}
        payload={initialPayload}
        navigation={navigation}
      />
    );
  }
  return (
    <ListingClientBootstrap locale={locale} pageSlug={pageSlug} navigation={navigation} />
  );
}
