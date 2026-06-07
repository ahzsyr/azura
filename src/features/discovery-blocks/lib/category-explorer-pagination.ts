import type { CategoryExplorerNode } from "@/features/discovery-blocks/lib/category-sources";
import { paginateListing } from "@/features/products/listing/filter";

export type CategoryExplorerPaginationState = {
  items: CategoryExplorerNode[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  enabled: boolean;
};

export function findCategoryRootSlug(
  nodes: CategoryExplorerNode[],
  slug: string
): string | null {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  let current = bySlug.get(slug);
  if (!current) return null;
  const seen = new Set<string>();
  while (current.parentSlug && bySlug.has(current.parentSlug)) {
    if (seen.has(current.slug)) break;
    seen.add(current.slug);
    current = bySlug.get(current.parentSlug)!;
  }
  return current.slug;
}

export function getCategoryExplorerRoots(nodes: CategoryExplorerNode[]): CategoryExplorerNode[] {
  const slugs = new Set(nodes.map((n) => n.slug));
  return nodes.filter((n) => !n.parentSlug || !slugs.has(n.parentSlug));
}

export function resolveCategoryExplorerPageSize(pageSize: number): number {
  return Math.min(Math.max(1, Math.floor(pageSize)), 48);
}

/** Flat pagination for grid and truncated lists. */
export function paginateCategoryExplorerFlat(
  nodes: CategoryExplorerNode[],
  page: number,
  pageSize: number,
  enablePagination: boolean
): CategoryExplorerPaginationState {
  const per = resolveCategoryExplorerPageSize(pageSize);

  if (!enablePagination) {
    return {
      items: nodes.slice(0, per),
      page: 1,
      totalPages: 1,
      total: nodes.length,
      pageSize: per,
      enabled: false,
    };
  }

  if (nodes.length <= per) {
    return {
      items: nodes,
      page: 1,
      totalPages: 1,
      total: nodes.length,
      pageSize: per,
      enabled: false,
    };
  }

  const pagination = paginateListing(nodes, page, per);
  return {
    items: pagination.items,
    page,
    totalPages: pagination.totalPages,
    total: pagination.total,
    pageSize: per,
    enabled: true,
  };
}

/** Paginate root categories while keeping hierarchy paths intact. */
export function paginateCategoryExplorerHierarchy(
  nodes: CategoryExplorerNode[],
  page: number,
  pageSize: number,
  enablePagination: boolean,
  activeSlug?: string | null
): CategoryExplorerPaginationState & { visibleNodes: CategoryExplorerNode[] } {
  const roots = getCategoryExplorerRoots(nodes);
  const per = resolveCategoryExplorerPageSize(pageSize);

  if (!enablePagination) {
    const allowedRoots = new Set(roots.slice(0, per).map((r) => r.slug));
    const visibleNodes = nodes.filter((n) => {
      const root = findCategoryRootSlug(nodes, n.slug);
      return root != null && allowedRoots.has(root);
    });
    return {
      visibleNodes,
      items: visibleNodes,
      page: 1,
      totalPages: 1,
      total: roots.length,
      pageSize: per,
      enabled: false,
    };
  }

  if (roots.length <= per) {
    return {
      visibleNodes: nodes,
      items: nodes,
      page: 1,
      totalPages: 1,
      total: roots.length,
      pageSize: per,
      enabled: false,
    };
  }

  let currentPage = Math.max(1, page);
  if (activeSlug) {
    const activeRoot = findCategoryRootSlug(nodes, activeSlug);
    if (activeRoot) {
      const rootIndex = roots.findIndex((r) => r.slug === activeRoot);
      if (rootIndex >= 0) {
        const pageForActive = Math.floor(rootIndex / per) + 1;
        const start = (currentPage - 1) * per;
        const end = start + per;
        const onPage = rootIndex >= start && rootIndex < end;
        if (!onPage) currentPage = pageForActive;
      }
    }
  }

  const pagination = paginateListing(roots, currentPage, per);
  const allowedRoots = new Set(pagination.items.map((r) => r.slug));
  const visibleNodes = nodes.filter((n) => {
    const root = findCategoryRootSlug(nodes, n.slug);
    return root != null && allowedRoots.has(root);
  });

  return {
    visibleNodes,
    items: visibleNodes,
    page: currentPage,
    totalPages: pagination.totalPages,
    total: pagination.total,
    pageSize: per,
    enabled: true,
  };
}
