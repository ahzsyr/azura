"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CollectionHierarchyChrome,
  type CollectionHierarchyChromeLabels,
} from "@/features/collections/components/collection-hierarchy-chrome";
import type { CategoryExplorerNode } from "@/features/discovery-blocks/lib/category-sources";
import { CategoryExplorerGrid } from "@/features/discovery-blocks/components/category-explorer-grid";
import { CategoryExplorerPagination } from "@/features/discovery-blocks/components/category-explorer-pagination";
import {
  paginateCategoryExplorerFlat,
  paginateCategoryExplorerHierarchy,
} from "@/features/discovery-blocks/lib/category-explorer-pagination";
import { parseCategoryExplorerProps } from "@/features/discovery-blocks/lib/parse-block-props";
import { getDirection } from "@/i18n/routing";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { CategoryExplorerGridOverflow } from "@/features/discovery-blocks/components/category-explorer-grid-overflow";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";

type Props = {
  locale: string;
  nodes: CategoryExplorerNode[];
  blockProps: Record<string, unknown>;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const DEFAULT_LABELS: CollectionHierarchyChromeLabels = {
  allCollections: "All",
  ariaLabel: "Browse categories",
  levelRoot: "Categories",
  levelUnder: "Under",
};

function defaultParamKey(source: string): string {
  switch (source) {
    case "postCategories":
      return "category";
    case "contentCollections":
      return "contentCollection";
    case "productCategories":
      return "category";
    case "collections":
      return "collection";
    default:
      return "category";
  }
}

export function CategoryExplorerIsland({ locale, nodes, blockProps: raw, block, overflow }: Props) {
  const p = parseCategoryExplorerProps(raw);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dir = getDirection(locale);
  const [page, setPage] = useState(1);

  const paramKey = p.urlParamKey.trim() || defaultParamKey(p.source);
  const activeSlug = searchParams.get(paramKey);

  useEffect(() => {
    setPage(1);
  }, [p.pageSize, p.enablePagination, p.variant, p.source, nodes.length]);

  const gridPagination = useMemo(
    () =>
      paginateCategoryExplorerFlat(nodes, page, p.pageSize, p.enablePagination),
    [nodes, page, p.pageSize, p.enablePagination]
  );

  const hierarchyPagination = useMemo(
    () =>
      paginateCategoryExplorerHierarchy(
        nodes,
        page,
        p.pageSize,
        p.enablePagination,
        activeSlug
      ),
    [nodes, page, p.pageSize, p.enablePagination, activeSlug]
  );

  const hierarchyItems = useMemo(
    () =>
      hierarchyPagination.visibleNodes.map((n) => ({
        slug: n.slug,
        name: n.name,
        parentSlug: n.parentSlug,
        visible: true,
      })),
    [hierarchyPagination.visibleNodes]
  );

  const onSelect = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(paramKey);
      if (slug) params.set(paramKey, slug);
      const qs = params.toString();
      safeAppRouterNavigate(router, `${pathname}${qs ? `?${qs}` : ""}`);
    },
    [paramKey, pathname, router, searchParams]
  );

  const onPageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  if (p.variant === "grid") {
    return (
      <CatalogContentLayout
        dir={dir}
        className="catalog-content-layout catalog-content-layout--category-explorer"
        mainClassName="catalog-content-layout__main"
        contentClassName="catalog-content-layout__content"
      >
        {block && overflow ? (
          <CategoryExplorerGridOverflow
            nodes={gridPagination.items}
            showImages={p.showImages}
            showCounts={p.showCounts}
            block={block}
            overflow={overflow}
          />
        ) : (
          <CategoryExplorerGrid
            nodes={gridPagination.items}
            showImages={p.showImages}
            showCounts={p.showCounts}
          />
        )}
        {gridPagination.enabled ? (
          <CategoryExplorerPagination
            page={gridPagination.page}
            totalPages={gridPagination.totalPages}
            total={gridPagination.total}
            pageSize={gridPagination.pageSize}
            onPageChange={onPageChange}
            dir={dir}
          />
        ) : null}
      </CatalogContentLayout>
    );
  }

  const chromeVariant =
    p.variant === "sidebar" ? "sidebar" : p.variant === "tree" ? "chrome" : "tabs";

  return (
    <CatalogContentLayout
      dir={dir}
      className="catalog-content-layout catalog-content-layout--category-explorer"
      mainClassName="catalog-content-layout__main"
      contentClassName="catalog-content-layout__content"
      sidebar={
        chromeVariant === "sidebar" ? (
          <CollectionHierarchyChrome
            collections={hierarchyItems}
            value={activeSlug}
            onChange={onSelect}
            labels={DEFAULT_LABELS}
            dir={dir}
            variant={chromeVariant}
          />
        ) : null
      }
    >
      {chromeVariant !== "sidebar" ? (
        <CollectionHierarchyChrome
          collections={hierarchyItems}
          value={activeSlug}
          onChange={onSelect}
          labels={DEFAULT_LABELS}
          dir={dir}
          variant={chromeVariant}
        />
      ) : null}
      {hierarchyPagination.enabled ? (
        <CategoryExplorerPagination
          page={hierarchyPagination.page}
          totalPages={hierarchyPagination.totalPages}
          total={hierarchyPagination.total}
          pageSize={hierarchyPagination.pageSize}
          onPageChange={onPageChange}
          dir={dir}
        />
      ) : null}
    </CatalogContentLayout>
  );
}
