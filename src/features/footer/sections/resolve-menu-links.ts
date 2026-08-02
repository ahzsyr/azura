import type { FooterColumn, FooterLink, FooterMenuSource } from "../types";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import {
  filterMenuItemsForSurface,
  resolveMenuForSurface,
} from "@/features/navigation/menu-engine";
import { rootCollections } from "@/features/navigation/source-families";
import { resolveLinks } from "./shared";

function menuItemToLink(item: MenuItem): FooterLink | null {
  const label = item.label?.trim();
  if (!label) return null;
  if (item.type === "link" && item.url?.trim()) {
    return { label, href: item.url.trim(), openInNewTab: item.openInNewTab };
  }
  if (item.type === "page" && item.pageId) {
    const slug = item.pageId === "home" ? "/" : `/${item.pageId}`;
    return { label, href: slug };
  }
  if (item.type === "collection" && item.collectionId) {
    return { label, href: `/collections/${item.collectionId}` };
  }
  if (item.url?.trim()) {
    return { label, href: item.url.trim(), openInNewTab: item.openInNewTab };
  }
  return null;
}

function flattenMenuItems(items: MenuItem[]): FooterLink[] {
  const links: FooterLink[] = [];
  for (const item of items) {
    const link = menuItemToLink(item);
    if (link) links.push(link);
    if (item.children?.length) {
      links.push(...flattenMenuItems(item.children));
    }
  }
  return links;
}

function linksFromHeaderWorkspace(
  headerWorkspace: HeaderWorkspace | null,
  menuSource: Extract<FooterMenuSource, "header" | "footer">,
  menuKey?: string,
): FooterLink[] {
  if (!headerWorkspace) return [];

  const explicitKey = menuKey?.trim();
  let items: MenuItem[];

  if (menuSource === "header" && !explicitKey) {
    items = resolveMenuForSurface(headerWorkspace, "desktop");
  } else {
    const key = explicitKey || headerWorkspace.activeMenuKey;
    const menu = headerWorkspace.menusDatabase[key];
    if (!menu?.items?.length) return [];
    items = filterMenuItemsForSurface(menu.items, "desktop");
  }

  return flattenMenuItems(items);
}

function linksFromCatalog(
  catalog: HeaderBuilderCatalog | null,
  source: "category" | "collection",
): FooterLink[] {
  if (!catalog) return [];
  const collections =
    source === "category" ? rootCollections(catalog) : catalog.collections;
  return collections.map((c) => ({ label: c.name, href: `/collections/${c.slug}` }));
}

export function resolveMenuSourceLinks(
  column: FooterColumn,
  headerWorkspace: HeaderWorkspace | null,
  catalog: HeaderBuilderCatalog | null,
): FooterLink[] {
  const source = column.menuSource ?? "custom";
  switch (source) {
    case "header":
      return linksFromHeaderWorkspace(headerWorkspace, "header", column.headerMenuKey);
    case "footer":
      return linksFromHeaderWorkspace(headerWorkspace, "footer", column.headerMenuKey);
    case "category":
      return linksFromCatalog(catalog, "category");
    case "collection":
      return linksFromCatalog(catalog, "collection");
    case "custom":
    default:
      return column.links ?? [];
  }
}

export function resolveMenuLinks(
  column: FooterColumn,
  headerWorkspace: HeaderWorkspace | null,
  catalog: HeaderBuilderCatalog | null,
) {
  return resolveLinks(resolveMenuSourceLinks(column, headerWorkspace, catalog));
}
