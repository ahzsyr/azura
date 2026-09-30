/**
 * Server-safe product page layout template resolver.
 * Priority: product → category → brand → site → default.
 *
 * Multi-category tie-break when several matching collections have templates:
 * 1. Match via product.categoryIds, then product.categories slugs, then product.category
 * 2. Keep only collections with an explicit pageLayoutTemplate
 * 3. Sort by sortOrder ascending, then slug lexicographic ascending
 * 4. Use the first candidate
 *
 * Every stored id is passed through validateTemplateId() before return.
 */
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import { brandNameToSlug } from "@/features/catalog/types/catalog-brand-profile";
import type { Collection } from "@/features/collections/types";
import {
  validateTemplateId,
  DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID,
} from "@/features/products/layout-templates/registry-meta";
import type {
  ProductPageLayoutTemplateId,
  ResolvedProductPageLayout,
} from "@/features/products/layout-templates/types";
import type { Product } from "@/features/products/types";

export type ResolveProductPageLayoutTemplateContext = {
  product: Product;
  site: Record<string, unknown>;
  collections: Collection[];
  brandProfiles: CatalogBrandProfile[];
};

function readProductTemplate(product: Product): string | null {
  const raw = product.page_layout_template;
  if (raw == null || raw === "") return null;
  return String(raw).trim() || null;
}

function readCollectionTemplate(collection: Collection): string | null {
  const raw = collection.pageLayoutTemplate;
  if (raw == null || raw === "") return null;
  return String(raw).trim() || null;
}

function readBrandTemplate(profile: CatalogBrandProfile): string | null {
  const raw = profile.pageLayoutTemplate;
  if (raw == null) return null;
  return raw;
}

function readSiteTemplate(site: Record<string, unknown>): string | null {
  const raw = site.productPageLayoutTemplate;
  if (raw == null || raw === "") return null;
  return String(raw).trim() || null;
}

function collectionSortKey(c: Collection): [number, string] {
  const order = typeof c.sortOrder === "number" ? c.sortOrder : 0;
  return [order, c.slug];
}

function resolveMatchingCollections(
  product: Product,
  collections: Collection[],
): Collection[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const bySlug = new Map(collections.map((c) => [c.slug, c]));

  const matched: Collection[] = [];
  const seen = new Set<string>();

  for (const id of product.categoryIds ?? []) {
    const col = byId.get(id);
    if (col && !seen.has(col.id)) {
      seen.add(col.id);
      matched.push(col);
    }
  }

  for (const slug of product.categories ?? []) {
    const col = bySlug.get(String(slug));
    if (col && !seen.has(col.id)) {
      seen.add(col.id);
      matched.push(col);
    }
  }

  if (typeof product.category === "string" && product.category.trim()) {
    const col = bySlug.get(product.category.trim());
    if (col && !seen.has(col.id)) {
      seen.add(col.id);
      matched.push(col);
    }
  }

  return matched;
}

function resolveCategoryAssignment(
  product: Product,
  collections: Collection[],
): { templateId: string; slug: string } | null {
  const candidates = resolveMatchingCollections(product, collections)
    .map((col) => ({ col, template: readCollectionTemplate(col) }))
    .filter((entry): entry is { col: Collection; template: string } => entry.template != null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const [orderA, slugA] = collectionSortKey(a.col);
    const [orderB, slugB] = collectionSortKey(b.col);
    if (orderA !== orderB) return orderA - orderB;
    return slugA.localeCompare(slugB);
  });

  const winner = candidates[0];
  return { templateId: winner.template, slug: winner.col.slug };
}

function resolveBrandAssignment(
  product: Product,
  brandProfiles: CatalogBrandProfile[],
): { templateId: string; slug: string } | null {
  const brandName = product.brand?.trim();
  if (!brandName) return null;

  const slug = brandNameToSlug(brandName);
  const profile =
    brandProfiles.find((p) => p.name.toLowerCase() === brandName.toLowerCase()) ??
    brandProfiles.find((p) => p.slug === slug);

  if (!profile) return null;
  const template = readBrandTemplate(profile);
  if (!template) return null;
  return { templateId: template, slug: profile.slug };
}

export function resolveProductPageLayoutTemplate(
  ctx: ResolveProductPageLayoutTemplateContext,
): ResolvedProductPageLayout {
  const productTemplate = readProductTemplate(ctx.product);
  if (productTemplate) {
    return {
      templateId: validateTemplateId(productTemplate),
      assignmentSource: "product",
    };
  }

  const categoryAssignment = resolveCategoryAssignment(ctx.product, ctx.collections);
  if (categoryAssignment) {
    return {
      templateId: validateTemplateId(categoryAssignment.templateId),
      assignmentSource: "category",
      assignmentDetail: categoryAssignment.slug,
    };
  }

  const brandAssignment = resolveBrandAssignment(ctx.product, ctx.brandProfiles);
  if (brandAssignment) {
    return {
      templateId: validateTemplateId(brandAssignment.templateId),
      assignmentSource: "brand",
      assignmentDetail: brandAssignment.slug,
    };
  }

  const siteTemplate = readSiteTemplate(ctx.site);
  if (siteTemplate) {
    return {
      templateId: validateTemplateId(siteTemplate),
      assignmentSource: "site",
    };
  }

  return {
    templateId: DEFAULT_PRODUCT_PAGE_LAYOUT_TEMPLATE_ID,
    assignmentSource: "default",
  };
}

export function validateStoredTemplateId(
  id: string | null | undefined,
): ProductPageLayoutTemplateId {
  return validateTemplateId(id);
}
