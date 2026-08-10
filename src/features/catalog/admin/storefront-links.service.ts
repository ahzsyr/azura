import "server-only";

import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { ProductInternalLinkKind } from "@/features/products/lib/product-cta";
import { productsDataService } from "@/features/products/products-data.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { cmsRepository } from "@/repositories/cms.repository";
import { prisma } from "@/lib/prisma";

export type StorefrontLinkResult = {
  kind: ProductInternalLinkKind;
  slug: string;
  label: string;
  path: string;
};

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchesQuery(q: string, ...parts: (string | undefined | null)[]): boolean {
  if (!q) return true;
  const hay = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export async function searchStorefrontLinks(opts: {
  locale: string;
  q: string;
  limit: number;
}): Promise<StorefrontLinkResult[]> {
  const locale = opts.locale.trim() || "en";
  const q = opts.q.trim();
  const limit = Math.min(100, Math.max(1, opts.limit));
  const out: StorefrontLinkResult[] = [];
  const seen = new Set<string>();

  const push = (row: StorefrontLinkResult) => {
    const key = `${row.kind}:${row.slug}`;
    if (seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push(row);
  };

  const pages = await cmsRepository.listPages();
  const pageIds = pages.map((p) => p.id);
  const pageTitleRows =
    pageIds.length > 0
      ? await prisma.entityTranslation.findMany({
          where: { entityType: "CmsPage", entityId: { in: pageIds }, field: "title" },
        })
      : [];
  const titlesByPage = new Map<string, typeof pageTitleRows>();
  for (const row of pageTitleRows) {
    const list = titlesByPage.get(row.entityId) ?? [];
    list.push(row);
    titlesByPage.set(row.entityId, list);
  }

  for (const page of pages) {
    const title =
      resolveTranslation("title", locale, { translations: titlesByPage.get(page.id) }) ||
      humanizeSlug(page.slug);
    const path = getCmsPagePublicPath(page.slug);
    if (!matchesQuery(q, title, page.slug, path)) continue;
    push({ kind: "page", slug: page.slug, label: title, path });
  }

  const collections = await collectionsDataService.loadAll({ localePrefix: locale });
  for (const col of collections) {
    const path = `/collections/${col.slug}`;
    if (!matchesQuery(q, col.name, col.slug, path)) continue;
    push({ kind: "collection", slug: col.slug, label: col.name || col.slug, path });
  }

  const products = await productsDataService.listProductPickerEntries(locale, limit * 2);
  for (const product of products) {
    const path = `/products/${product.slug}`;
    if (!matchesQuery(q, product.name, product.slug, path)) continue;
    push({ kind: "product", slug: product.slug, label: product.name || product.slug, path });
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}
