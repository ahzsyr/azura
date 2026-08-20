/**
 * Read-only page registry providers. Do not persist here — edits belong in
 * CMS / catalog save paths. Each provider maps existing source data into
 * UnifiedPageEntry rows.
 */
import type { CmsPage } from "@prisma/client";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { CMS_WIRED_PAGE_DEFINITIONS } from "@/features/cms/cms-wired-pages";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import type { Collection } from "@/features/collections/types";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";
import {
  formatLayoutAssignmentLabel,
  validateTemplateId,
} from "@/features/products/layout-templates/registry-meta";
import type { UnifiedPageEntry } from "./types";

export type PageProviderContext = {
  cmsPages: CmsPage[];
  cmsDisplayTitles?: Map<string, string>;
  collections: Collection[];
  brandProfiles: CatalogBrandProfile[];
  site: Record<string, unknown>;
};

function siteLayoutLabel(templateId: string | null | undefined): string {
  const id = validateTemplateId(templateId);
  return formatLayoutAssignmentLabel(id, templateId ? "site" : "default");
}

export function provideBasePages(ctx: PageProviderContext): UnifiedPageEntry[] {
  const entries: UnifiedPageEntry[] = [];
  const cmsBySlug = new Map(ctx.cmsPages.map((p) => [p.slug, p]));
  const wiredSlugs = new Set(Object.keys(CMS_WIRED_MARKETING_SLUGS));

  for (const [slug, path] of Object.entries(CMS_WIRED_MARKETING_SLUGS)) {
    const cms = cmsBySlug.get(slug);
    const def = CMS_WIRED_PAGE_DEFINITIONS.find((d) => d.slug === slug);
    entries.push({
      id: `base:${slug}`,
      kind: "base",
      title: ctx.cmsDisplayTitles?.get(cms?.id ?? "") || def?.defaultTitles.en || slug,
      slug,
      publicPath: path || "/",
      status: (cms?.status?.toLowerCase() as UnifiedPageEntry["status"]) ?? "system",
      pageTypeLabel: "Marketing Page",
      editHref: cms ? `/admin/pages/${cms.id}?tab=content` : `/admin/pages`,
      viewHref: path || "/",
      meta: {
        blockCount: Array.isArray(cms?.blocks) ? (cms.blocks as unknown[]).length : undefined,
        templateKey: cms?.templateKey ?? def?.templateKey,
        cmsPageId: cms?.id,
      },
    });
  }

  for (const page of STATIC_SEO_PAGES) {
    if (wiredSlugs.has(page.pageKey)) continue;
    const path = page.path || "/";
    entries.push({
      id: `base:static:${page.pageKey}`,
      kind: "base",
      title: page.label,
      slug: page.pageKey,
      publicPath: path,
      status: "system",
      pageTypeLabel: "Static Page",
      editHref: `/admin/seo?tab=pages`,
      viewHref: path,
    });
  }

  return entries;
}

export function provideCmsPages(ctx: PageProviderContext): UnifiedPageEntry[] {
  return ctx.cmsPages
    .filter((page) => !(page.slug in CMS_WIRED_MARKETING_SLUGS))
    .map((page) => ({
      id: `cms:${page.id}`,
      kind: "cms" as const,
      title: ctx.cmsDisplayTitles?.get(page.id) || page.slug,
      slug: page.slug,
      publicPath: getCmsPagePublicPath(page.slug),
      status: page.status.toLowerCase() as UnifiedPageEntry["status"],
      pageTypeLabel: "CMS Page",
      editHref: `/admin/pages/${page.id}?tab=content`,
      viewHref: getCmsPagePublicPath(page.slug),
      meta: {
        blockCount: Array.isArray(page.blocks) ? (page.blocks as unknown[]).length : undefined,
        templateKey: page.templateKey ?? undefined,
        cmsPageId: page.id,
      },
    }));
}

export function provideProductConfigPages(ctx: PageProviderContext): UnifiedPageEntry[] {
  const siteTemplate = ctx.site.productPageLayoutTemplate;
  const raw = typeof siteTemplate === "string" ? siteTemplate : null;
  return [
    {
      id: "product-config:site-default",
      kind: "product-config",
      title: "Product Page (Site Default)",
      slug: "product-page",
      publicPath: "/products/[slug]",
      status: "system",
      pageTypeLabel: "Product Page Config",
      layoutTemplate: validateTemplateId(raw),
      layoutAssignmentSource: raw ? "site" : "default",
      layoutAssignmentLabel: siteLayoutLabel(raw),
      editHref: "/admin/pages?tab=product",
      viewHref: "/products",
    },
  ];
}

export function provideCategoryPages(ctx: PageProviderContext): UnifiedPageEntry[] {
  return ctx.collections.map((col) => {
    const template = col.pageLayoutTemplate ?? null;
    return {
      id: `category:${col.slug}`,
      kind: "category" as const,
      title: col.name || col.slug,
      slug: col.slug,
      publicPath: `/categories/${col.slug}`,
      status: (col.visible === false ? "draft" : "published") as UnifiedPageEntry["status"],
      pageTypeLabel: "Category Page",
      layoutTemplate: template ? validateTemplateId(template) : null,
      layoutAssignmentSource: template ? "category" : "inherit",
      layoutAssignmentLabel: template
        ? formatLayoutAssignmentLabel(validateTemplateId(template), "category", col.slug)
        : "Inherit — site default",
      editHref: `/admin/categories`,
      viewHref: `/categories/${col.slug}`,
    };
  });
}

export function provideBrandPages(ctx: PageProviderContext): UnifiedPageEntry[] {
  return ctx.brandProfiles.map((brand) => {
    const template = brand.pageLayoutTemplate ?? null;
    return {
      id: `brand:${brand.slug}`,
      kind: "brand" as const,
      title: brand.name || brand.slug,
      slug: brand.slug,
      publicPath: `/brands/${brand.slug}`,
      status: "published" as const,
      pageTypeLabel: "Brand Page",
      layoutTemplate: template ? validateTemplateId(template) : null,
      layoutAssignmentSource: template ? "brand" : "inherit",
      layoutAssignmentLabel: template
        ? formatLayoutAssignmentLabel(validateTemplateId(template), "brand", brand.slug)
        : "Inherit — site default",
      editHref: `/admin/catalog-taxonomy`,
      viewHref: `/brands/${brand.slug}`,
    };
  });
}

/** Phase 4 stub — tags / content types / posts populate here later. */
export function provideOtherPages(_ctx: PageProviderContext): UnifiedPageEntry[] {
  return [];
}

export const PAGE_REGISTRY_PROVIDERS = [
  provideBasePages,
  provideCmsPages,
  provideProductConfigPages,
  provideCategoryPages,
  provideBrandPages,
  provideOtherPages,
] as const;
