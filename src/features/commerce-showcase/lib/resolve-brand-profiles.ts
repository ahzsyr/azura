import "server-only";

import { readCatalogBrandProfiles } from "@/features/catalog/admin/catalog-taxonomy";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import type { z } from "zod";
import type { brandShowcasePropsSchema } from "@/features/commerce-showcase/schemas/showcase-blocks";
import {
  mergeBrandWithOverrides,
  orderedBrandSlugsFromProps,
  resolveBrandSelectionFromProps,
} from "@/features/commerce-showcase/lib/brand-selection";
import type { BrandShowcaseNode } from "@/features/commerce-showcase/types/brand-showcase-node";

export type { BrandShowcaseNode };

type BrandShowcaseConfig = Pick<
  z.infer<typeof brandShowcasePropsSchema>,
  "source" | "manualBrands" | "featuredSlugs" | "manualSlugs" | "sort" | "limit"
> &
  Partial<
    Pick<
      z.infer<typeof brandShowcasePropsSchema>,
      "brandSelection" | "selectedBrandSlugs" | "brandOverrides"
    >
  >;

function resolveBrandHref(href: string, localePrefix: string, brandName: string): string {
  const fallback = `/${localePrefix}/products?brand=${encodeURIComponent(brandName)}`;
  const trimmed = href.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http")) return trimmed;
  if (trimmed.startsWith(`/${localePrefix}/`)) return trimmed;
  if (trimmed.startsWith("/")) return `/${localePrefix}${trimmed}`;
  return trimmed;
}

function profileToNode(
  profile: CatalogBrandProfile,
  localePrefix: string,
  count?: number,
): BrandShowcaseNode {
  return {
    slug: profile.slug,
    name: profile.name,
    nameEn: profile.name,
    nameAr: profile.name,
    logoUrl: profile.logoUrl || undefined,
    bannerUrl: profile.bannerUrl || undefined,
    descriptionEn: profile.descriptionEn,
    descriptionAr: profile.descriptionAr,
    href: resolveBrandHref(profile.href, localePrefix, profile.name),
    count,
    featured: profile.featured,
  };
}

function countByBrand(records: Awaited<ReturnType<typeof loadListingRecords>>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of records) {
    const brand = r.brand?.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function orderNodesBySlugs(nodes: BrandShowcaseNode[], slugs: string[]): BrandShowcaseNode[] {
  const bySlug = new Map(nodes.map((n) => [n.slug.toLowerCase(), n]));
  const ordered: BrandShowcaseNode[] = [];
  for (const slug of slugs) {
    const node = bySlug.get(slug.toLowerCase());
    if (node) ordered.push(node);
  }
  return ordered;
}

function applyOverrides(
  nodes: BrandShowcaseNode[],
  overrides: BrandShowcaseConfig["brandOverrides"],
): BrandShowcaseNode[] {
  if (!overrides || Object.keys(overrides).length === 0) return nodes;
  return nodes.map((node) => {
    const override = overrides[node.slug] ?? overrides[node.slug.toLowerCase()];
    return mergeBrandWithOverrides(node, override);
  });
}

export async function resolveBrandShowcaseNodes(
  localePrefix: string,
  config: BrandShowcaseConfig,
): Promise<BrandShowcaseNode[]> {
  const records = await loadListingRecords(localePrefix);
  const counts = countByBrand(records);
  const selection = resolveBrandSelectionFromProps(config);
  const pickedSlugs = orderedBrandSlugsFromProps(config);
  const overrides = config.brandOverrides ?? {};

  let nodes: BrandShowcaseNode[] = [];

  if (selection === "manual") {
    nodes = (config.manualBrands ?? []).map((b) => {
      const name = b.nameEn || b.nameAr || b.slug;
      const href =
        b.href.trim() || `/${localePrefix}/products?brand=${encodeURIComponent(name)}`;
      return {
        slug: b.slug || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        nameEn: b.nameEn || name,
        nameAr: b.nameAr || name,
        logoUrl: b.logoUrl || undefined,
        bannerUrl: b.bannerUrl || undefined,
        descriptionEn: b.descriptionEn,
        descriptionAr: b.descriptionAr,
        href,
        count: counts.get(name.toLowerCase()),
        featured: b.featured,
      };
    });
  } else {
    const profiles = await readCatalogBrandProfiles(localePrefix);
    nodes = profiles.map((p) =>
      profileToNode(p, localePrefix, counts.get(p.name.toLowerCase())),
    );

    if (selection === "pick" && pickedSlugs.length > 0) {
      const allowed = new Set(pickedSlugs.map((s) => s.toLowerCase()));
      nodes = nodes.filter((n) => allowed.has(n.slug.toLowerCase()));
      if (config.sort === "manual") {
        nodes = orderNodesBySlugs(nodes, pickedSlugs);
      }
    }

    nodes = applyOverrides(nodes, overrides);
  }

  const featured = new Set((config.featuredSlugs ?? []).map((s) => s.toLowerCase()));
  if (featured.size > 0) {
    nodes = [
      ...nodes.filter((n) => featured.has(n.slug.toLowerCase())),
      ...nodes.filter((n) => !featured.has(n.slug.toLowerCase())),
    ];
  }

  switch (config.sort) {
    case "productCount":
      nodes.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
      break;
    case "featuredFirst":
      nodes.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
      break;
    case "manual":
      if (selection === "pick" && pickedSlugs.length > 0) {
        nodes = orderNodesBySlugs(nodes, pickedSlugs);
      }
      break;
    default:
      nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  const limit = Math.min(48, Math.max(1, config.limit ?? 12));
  return nodes.slice(0, limit);
}
