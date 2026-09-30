/**
 * Declarative source-family tree for menu item cascading selects.
 * Aligned with Admin Content sections + ContentType registry.
 */

import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import type { HeaderBuilderCatalog, MenuItemType, SourceFamilyNode } from "./types";

export type SourceLeafKind =
  | "pages"
  | "posts"
  | "products"
  | "packages"
  | "offerings"
  | "listings"
  | "collections"
  | "brands"
  | "tags"
  | "contentType"
  | "sitePage";

export type SourceTarget = {
  type: MenuItemType;
  label: string;
  pageId?: string;
  postId?: string;
  productId?: string;
  packageId?: string;
  collectionId?: string;
  brandSlug?: string;
  tagSlug?: string;
  url?: string;
};

const BUILTIN_CONTENT_TYPE_LEAF: Record<string, SourceLeafKind> = {
  products: "products",
  "catalog-items": "packages",
  offerings: "offerings",
  listings: "listings",
};

/** Static section → type tree (custom content types appended under Catalog at runtime). */
export const SOURCE_FAMILY_TREE: SourceFamilyNode[] = [
  {
    id: "core",
    label: "Core Pages",
    children: [
      { id: "core-pages", label: "CMS Pages", leafKind: "pages" },
      { id: "core-blog", label: "Blog posts", leafKind: "posts" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    children: [
      { id: "catalog-products", label: "Products", leafKind: "products" },
      { id: "catalog-services", label: "Services", leafKind: "offerings" },
      { id: "catalog-packages", label: "Packages", leafKind: "packages" },
      { id: "catalog-properties", label: "Properties", leafKind: "listings" },
      { id: "catalog-collections", label: "Categories", leafKind: "collections" },
      { id: "catalog-brands", label: "Brands", leafKind: "brands" },
      { id: "catalog-tags", label: "Tags", leafKind: "tags" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    children: [
      { id: "org-team", label: "Team", leafKind: "sitePage", sitePageSlug: "team" },
      { id: "org-partners", label: "Partners", leafKind: "sitePage", sitePageSlug: "partners" },
      {
        id: "org-knowledge",
        label: "Knowledge Base",
        leafKind: "sitePage",
        sitePageSlug: "knowledge-base",
      },
      {
        id: "org-pricing",
        label: "Pricing Plan",
        leafKind: "sitePage",
        sitePageSlug: "pricing",
      },
    ],
  },
  {
    id: "site",
    label: "Site content",
    children: [
      { id: "site-faqs", label: "FAQs", leafKind: "sitePage", sitePageSlug: "faqs" },
      {
        id: "site-testimonials",
        label: "Testimonials",
        leafKind: "sitePage",
        sitePageSlug: "testimonials",
      },
      { id: "site-gallery", label: "Galleries", leafKind: "sitePage", sitePageSlug: "gallery" },
      {
        id: "site-calculators",
        label: "Calculators",
        leafKind: "sitePage",
        sitePageSlug: "pricing-calculators",
      },
      {
        id: "site-policies",
        label: "Policies",
        leafKind: "sitePage",
        sitePageSlug: "privacy",
      },
      {
        id: "site-terms",
        label: "Terms & Conditions",
        leafKind: "sitePage",
        sitePageSlug: "terms",
      },
    ],
  },
];

export function buildSourceFamilies(
  contentTypes: { slug: string; name: string; routePrefix: string | null }[],
): SourceFamilyNode[] {
  const builtinSlugs = new Set(Object.keys(BUILTIN_CONTENT_TYPE_LEAF));
  const tree = SOURCE_FAMILY_TREE.map((section) => ({
    ...section,
    children: section.children ? [...section.children] : undefined,
  }));

  const catalog = tree.find((s) => s.id === "catalog");
  if (catalog?.children) {
    for (const ct of contentTypes) {
      if (builtinSlugs.has(ct.slug)) continue;
      catalog.children.push({
        id: `catalog-ct-${ct.slug}`,
        label: ct.name,
        leafKind: "contentType",
        contentTypeSlug: ct.slug,
        routePrefix: ct.routePrefix ?? ct.slug,
      });
    }
  }

  return tree;
}

export type CatalogOption = { value: string; label: string; subtitle?: string };

function withSlugSubtitle(value: string, label: string, extra?: string): CatalogOption {
  const path = `/${value}`;
  return {
    value,
    label,
    subtitle: extra ? `${path} · ${extra}` : path,
  };
}

export function optionsForLeaf(
  catalog: HeaderBuilderCatalog,
  leaf: SourceFamilyNode,
): CatalogOption[] {
  const kind = leaf.leafKind;
  if (!kind) return [];

  switch (kind) {
    case "pages":
      return catalog.pages.map((p) => pageOption(p.slug, p.title, p.status, p.kind));
    case "posts":
      return catalog.posts.map((p) => withSlugSubtitle(p.slug, p.title));
    case "products":
      return catalog.products.map((p) => withSlugSubtitle(p.slug, p.name));
    case "packages":
      return (catalog.contentByType["catalog-items"] ?? []).map((p) =>
        withSlugSubtitle(p.slug, p.name),
      );
    case "offerings":
      return (catalog.contentByType["offerings"] ?? []).map((p) =>
        withSlugSubtitle(p.slug, p.name),
      );
    case "listings":
      return (catalog.contentByType["listings"] ?? []).map((p) =>
        withSlugSubtitle(p.slug, p.name),
      );
    case "collections":
      return catalog.collections.map((c) => withSlugSubtitle(c.slug, c.name));
    case "brands":
      return catalog.brands.map((b) => withSlugSubtitle(b.slug, b.name));
    case "tags":
      return catalog.tags.map((t) => withSlugSubtitle(t.slug, t.name));
    case "contentType": {
      const slug = leaf.contentTypeSlug ?? "";
      return (catalog.contentByType[slug] ?? []).map((p) => withSlugSubtitle(p.slug, p.name));
    }
    case "sitePage": {
      const want = (leaf.sitePageSlug ?? "").toLowerCase();
      const matches = catalog.pages.filter(
        (p) =>
          p.slug.toLowerCase() === want ||
          p.slug.toLowerCase().includes(want) ||
          p.title.toLowerCase().includes(want.replace(/-/g, " ")),
      );
      if (matches.length) {
        return matches.map((p) => pageOption(p.slug, p.title, p.status, p.kind));
      }
      // Still offer the intended slug if present as a single option
      return want
        ? [{ value: leaf.sitePageSlug!, label: leaf.label, subtitle: `/${leaf.sitePageSlug}` }]
        : [];
    }
    default:
      return [];
  }
}

function pageOption(
  slug: string,
  title: string,
  status?: "DRAFT" | "PUBLISHED",
  kind?: "wired" | "cms",
): CatalogOption {
  const wiredPath = CMS_WIRED_MARKETING_SLUGS[slug];
  const path = wiredPath ?? `/${slug}`;
  const bits: string[] = [];
  if (wiredPath || kind === "wired") bits.push("catalog");
  if (status === "DRAFT") bits.push("draft");
  return {
    value: slug,
    label: title,
    subtitle: bits.length ? `${path} · ${bits.join(" · ")}` : path,
  };
}

export function resolveSourceTarget(
  catalog: HeaderBuilderCatalog,
  leaf: SourceFamilyNode,
  value: string,
): SourceTarget | null {
  const v = value.trim();
  if (!v || !leaf.leafKind) return null;
  const opts = optionsForLeaf(catalog, leaf);
  const label = opts.find((o) => o.value === v)?.label ?? v;

  switch (leaf.leafKind) {
    case "pages":
    case "sitePage":
      return { type: "page", pageId: v, label: label || v };
    case "posts":
      return { type: "post", postId: v, label };
    case "products":
      return { type: "product", productId: v, label };
    case "packages":
      return { type: "package", packageId: v, productId: v, label };
    case "collections":
      return { type: "collection", collectionId: v, label };
    case "brands":
      return { type: "brand", brandSlug: v, label };
    case "tags":
      return { type: "tag", tagSlug: v, label };
    case "offerings": {
      const prefix =
        catalog.contentTypes.find((t) => t.slug === "offerings")?.routePrefix ?? "services";
      return { type: "link", url: `/${prefix}/${v}`, label };
    }
    case "listings": {
      const prefix =
        catalog.contentTypes.find((t) => t.slug === "listings")?.routePrefix ??
        "hotels-transport";
      return { type: "link", url: `/${prefix}/${v}`, label };
    }
    case "contentType": {
      const ct = catalog.contentTypes.find((t) => t.slug === leaf.contentTypeSlug);
      const prefix = leaf.routePrefix ?? ct?.routePrefix ?? leaf.contentTypeSlug ?? "content";
      return { type: "link", url: `/${prefix}/${v}`, label };
    }
    default:
      return null;
  }
}

/** Root collections (no parent, or parent not in catalog). */
export function rootCollections(catalog: HeaderBuilderCatalog) {
  const slugs = new Set(catalog.collections.map((c) => c.slug));
  return catalog.collections.filter(
    (c) => !c.parentSlug?.trim() || !slugs.has(c.parentSlug.trim()),
  );
}

export function childCollections(catalog: HeaderBuilderCatalog, parentSlug: string) {
  const parent = parentSlug.trim();
  return catalog.collections.filter((c) => (c.parentSlug ?? "").trim() === parent);
}

/** Ancestor path from root → … → current (inclusive). */
export function collectionAncestorPath(
  catalog: HeaderBuilderCatalog,
  slug: string,
): string[] {
  const bySlug = new Map(catalog.collections.map((c) => [c.slug, c]));
  const path: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = slug.trim();
  while (cur && bySlug.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    path.unshift(cur);
    cur = bySlug.get(cur)?.parentSlug?.trim() || undefined;
    if (path.length > 64) break;
  }
  return path;
}

export function findLeafNode(
  families: SourceFamilyNode[],
  sectionId: string,
  typeId: string,
): SourceFamilyNode | null {
  const section = families.find((s) => s.id === sectionId);
  return section?.children?.find((c) => c.id === typeId) ?? null;
}

/** Derive cascade path from a stored menu item target. */
export function hydrateSourcePath(
  catalog: HeaderBuilderCatalog,
  item: {
    type: MenuItemType;
    pageId?: string;
    postId?: string;
    productId?: string;
    packageId?: string;
    collectionId?: string;
    brandSlug?: string;
    tagSlug?: string;
    url?: string;
  },
): { sectionId: string; typeId: string; value: string; collectionPath?: string[] } | null {
  const families = catalog.sourceFamilies;

  const tryMatch = (
    leafKind: SourceLeafKind,
    value: string,
    contentTypeSlug?: string,
  ): { sectionId: string; typeId: string; value: string } | null => {
    for (const section of families) {
      for (const child of section.children ?? []) {
        if (child.leafKind !== leafKind) continue;
        if (contentTypeSlug && child.contentTypeSlug !== contentTypeSlug) continue;
        const opts = optionsForLeaf(catalog, child);
        if (opts.some((o) => o.value === value) || leafKind === "sitePage") {
          return { sectionId: section.id, typeId: child.id, value };
        }
      }
    }
    // Fallback: first matching leafKind even if value not in list
    for (const section of families) {
      for (const child of section.children ?? []) {
        if (child.leafKind !== leafKind) continue;
        if (contentTypeSlug && child.contentTypeSlug !== contentTypeSlug) continue;
        return { sectionId: section.id, typeId: child.id, value };
      }
    }
    return null;
  };

  switch (item.type) {
    case "page": {
      const slug = item.pageId?.trim() ?? "";
      if (!slug) return null;
      // Prefer site content / org matches for known slugs first
      for (const section of families) {
        for (const child of section.children ?? []) {
          if (child.leafKind !== "sitePage") continue;
          const want = child.sitePageSlug?.toLowerCase() ?? "";
          if (
            slug.toLowerCase() === want ||
            slug.toLowerCase().includes(want) ||
            want.includes(slug.toLowerCase())
          ) {
            return { sectionId: section.id, typeId: child.id, value: slug };
          }
        }
      }
      return tryMatch("pages", slug);
    }
    case "post":
      return item.postId ? tryMatch("posts", item.postId) : null;
    case "product":
      return item.productId ? tryMatch("products", item.productId) : null;
    case "package":
      return item.packageId || item.productId
        ? tryMatch("packages", (item.packageId ?? item.productId)!)
        : null;
    case "collection":
    case "packageCategory": {
      const slug = item.collectionId?.trim() ?? "";
      if (!slug) return null;
      const matched = tryMatch("collections", slug);
      if (!matched) return null;
      return {
        ...matched,
        collectionPath: collectionAncestorPath(catalog, slug),
      };
    }
    case "brand":
      return item.brandSlug ? tryMatch("brands", item.brandSlug) : null;
    case "tag":
      return item.tagSlug ? tryMatch("tags", item.tagSlug) : null;
    case "link": {
      const url = (item.url ?? "").replace(/^\//, "");
      const [prefix, ...rest] = url.split("/");
      const slug = rest.join("/");
      if (!prefix || !slug) return null;
      const ct = catalog.contentTypes.find(
        (t) => (t.routePrefix ?? t.slug) === prefix || t.slug === prefix,
      );
      if (ct) {
        if (ct.slug === "offerings") return tryMatch("offerings", slug);
        if (ct.slug === "listings") return tryMatch("listings", slug);
        if (ct.slug === "catalog-items") return tryMatch("packages", slug);
        if (ct.slug === "products") return tryMatch("products", slug);
        return tryMatch("contentType", slug, ct.slug);
      }
      return null;
    }
    default:
      return null;
  }
}

export function cleanLabel(label: string): string {
  return label
    .replace(/ \(draft\)$/i, "")
    .replace(/ \(catalog · [^)]+\)$/i, "")
    .replace(/ \(custom\)$/i, "")
    .trim();
}
