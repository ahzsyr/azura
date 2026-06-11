import type { HeaderBuilderCatalog, MenuItem } from "./types";
import { flattenMenuTree } from "./menu-tree-service";

export type MenuHealthIssue = {
  key: string;
  severity: "warning" | "error";
  itemId?: string;
  message: string;
};

function targetValue(item: MenuItem): string {
  if (item.type === "link") return (item.url ?? "").trim();
  if (item.type === "image") return (item.linkUrl ?? "").trim();
  if (item.type === "page") return (item.pageId ?? "").trim();
  if (item.type === "collection" || item.type === "packageCategory") return (item.collectionId ?? item.packageCategoryId ?? "").trim();
  if (item.type === "product" || item.type === "package") return (item.productId ?? item.packageId ?? "").trim();
  if (item.type === "post") return (item.postId ?? "").trim();
  return "";
}

export function validateMenu(items: MenuItem[], catalog: HeaderBuilderCatalog): MenuHealthIssue[] {
  const issues: MenuHealthIssue[] = [];
  const flat = flattenMenuTree(items);

  const pages = new Set(catalog.pages.map((p) => p.slug));
  const collections = new Set(catalog.collections.map((c) => c.slug));
  const products = new Set(catalog.products.map((p) => p.slug));
  const posts = new Set(catalog.posts.map((p) => p.slug));

  const seenIds = new Set<string>();
  const seenUrls = new Map<string, string>();

  for (const node of flat) {
    const item = node.item;
    if (!item.label.trim()) {
      issues.push({
        key: `empty-label-${item.id}`,
        severity: "error",
        itemId: item.id,
        message: "Item has an empty label.",
      });
    }

    if (seenIds.has(item.id)) {
      issues.push({
        key: `dup-id-${item.id}`,
        severity: "error",
        itemId: item.id,
        message: `Duplicate item id "${item.id}".`,
      });
    } else {
      seenIds.add(item.id);
    }

    const target = targetValue(item);
    if (item.type === "link" && !target) {
      issues.push({
        key: `missing-url-${item.id}`,
        severity: "warning",
        itemId: item.id,
        message: "Custom link has no URL.",
      });
    }

    if (target && (item.type === "link" || item.type === "image")) {
      const existing = seenUrls.get(target);
      if (existing && existing !== item.id) {
        issues.push({
          key: `dup-url-${item.id}-${existing}`,
          severity: "warning",
          itemId: item.id,
          message: `Duplicate URL "${target}".`,
        });
      } else {
        seenUrls.set(target, item.id);
      }
    }

    if (item.type === "page" && target && !pages.has(target)) {
      issues.push({ key: `missing-page-${item.id}`, severity: "warning", itemId: item.id, message: `Missing page target "${target}".` });
    }
    if ((item.type === "collection" || item.type === "packageCategory") && target && !collections.has(target)) {
      issues.push({ key: `missing-collection-${item.id}`, severity: "warning", itemId: item.id, message: `Missing collection target "${target}".` });
    }
    if ((item.type === "product" || item.type === "package") && target && !products.has(target)) {
      issues.push({ key: `missing-product-${item.id}`, severity: "warning", itemId: item.id, message: `Missing product target "${target}".` });
    }
    if (item.type === "post" && target && !posts.has(target)) {
      issues.push({ key: `missing-post-${item.id}`, severity: "warning", itemId: item.id, message: `Missing post target "${target}".` });
    }
  }

  return issues;
}

export const MenuValidationService = {
  validateMenu,
};
