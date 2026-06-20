import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import {
  collectionMapFromList,
  resolveCollectionImages,
} from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";
import { readCatalogBrandProfiles } from "@/features/catalog/admin/catalog-taxonomy";
import { loadWorkspaceTranslations } from "@/features/translation/workspace-translation.service";
import {
  collectHeaderTranslationRefs,
  localizeHeaderWorkspaceWithBundle,
} from "./localize-menu-translations";
import type { HeaderWorkspace, MenuItem, MenuRecord } from "./types";

async function getCatalogItemImageUrlFromDb(slug: string): Promise<string | undefined> {
  const item = await prisma.contentItem.findFirst({
    where: {
      slug,
      deletedAt: null,
      status: "PUBLISHED",
      contentType: { slug: "catalog-items" },
    },
    include: {
      media: { where: { isPublished: true, isHidden: false }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  return item?.media[0]?.url ?? item?.featuredImageUrl ?? undefined;
}

function getCollectionImageUrlFromMap(
  slug: string,
  bySlug: Map<string, Collection>,
): string | undefined {
  const col = bySlug.get(slug);
  if (!col) return undefined;
  const media = resolveCollectionImages(col, bySlug);
  return media.coverImage ?? media.iconImage;
}

async function getProductImageUrl(slug: string, localeCode: string): Promise<string | undefined> {
  const loaded = await productsDataService.getProduct(localeCode, slug);
  if (loaded) {
    const images = loaded.product.media?.images ?? [];
    return images.find((img) => img.type === "main")?.url || images[0]?.url;
  }
  return getCatalogItemImageUrlFromDb(slug);
}

async function getBrandImageUrl(slug: string, localeCode: string): Promise<string | undefined> {
  const profiles = await readCatalogBrandProfiles(localeCode);
  const profile = profiles.find((entry) => entry.slug.trim().toLowerCase() === slug.toLowerCase());
  if (!profile) return undefined;
  return profile.bannerUrl?.trim() || profile.logoUrl?.trim() || undefined;
}

export async function resolveCardImageUrlForMenuItem(
  item: MenuItem,
  localeCode: string,
  collectionBySlug?: Map<string, Collection>,
): Promise<string | undefined> {
  if (item.imageUrl?.trim()) return item.imageUrl.trim();
  switch (item.type) {
    case "collection":
    case "packageCategory": {
      const slug = (item.collectionId ?? item.packageCategoryId ?? "").trim();
      if (!slug) return undefined;
      if (collectionBySlug) {
        return getCollectionImageUrlFromMap(slug, collectionBySlug);
      }
      const col = await collectionsDataService.loadBySlug({ localePrefix: localeCode }, slug);
      if (!col) return undefined;
      const all = await collectionsDataService.loadAll({ localePrefix: localeCode });
      const bySlug = collectionMapFromList(all.filter((c) => c.visible !== false));
      return getCollectionImageUrlFromMap(slug, bySlug);
    }
    case "product":
    case "package": {
      const slug = (item.productId ?? item.packageId ?? "").trim();
      if (!slug) return undefined;
      if (item.type === "product" || item.productId?.trim()) {
        return getProductImageUrl(item.productId?.trim() || slug, localeCode);
      }
      return getCatalogItemImageUrlFromDb(slug);
    }
    case "brand": {
      const slug = (item.brandSlug ?? "").trim();
      if (!slug) return undefined;
      return getBrandImageUrl(slug, localeCode);
    }
    case "image":
      return item.imageUrl?.trim() || undefined;
    default:
      return item.imageUrl?.trim() || undefined;
  }
}

async function enrichFlyoutChild(
  child: MenuItem,
  localeCode: string,
  collectionBySlug: Map<string, Collection>,
): Promise<MenuItem> {
  if (child.imageUrl?.trim()) return child;
  const resolved = await resolveCardImageUrlForMenuItem(child, localeCode, collectionBySlug);
  return {
    ...child,
    imageUrl: resolved ?? child.imageUrl,
  };
}

async function enrichFlyoutMenuRecord(
  record: MenuRecord,
  localeCode: string,
  collectionBySlug: Map<string, Collection>,
): Promise<MenuRecord> {
  const items = await Promise.all(
    record.items.map(async (item) => {
      if (!item.children?.length) return item;
      const children = await Promise.all(
        item.children.map((child) => enrichFlyoutChild(child, localeCode, collectionBySlug)),
      );
      return { ...item, children };
    }),
  );
  return { ...record, items };
}

/** Enrich only top-level flyout children (Collection/Brand/Product cards) — not the full menu tree. */
export async function enrichFlyoutMenuImagesOnly(
  ws: HeaderWorkspace,
  localeCode: string,
): Promise<HeaderWorkspace> {
  const allCollections = await collectionsDataService.loadAll({ localePrefix: localeCode });
  const collectionBySlug = collectionMapFromList(
    allCollections.filter((c) => c.visible !== false),
  );

  const menusDatabase = { ...ws.menusDatabase };
  for (const key of Object.keys(menusDatabase)) {
    menusDatabase[key] = await enrichFlyoutMenuRecord(
      menusDatabase[key],
      localeCode,
      collectionBySlug,
    );
  }
  return { ...ws, menusDatabase };
}

function workspaceFlyoutFingerprint(ws: HeaderWorkspace): string {
  const payload = JSON.stringify({
    activeMenuKey: ws.activeMenuKey,
    menusDatabase: ws.menusDatabase,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export async function enrichHeaderWorkspaceWithMenuTranslations(
  ws: HeaderWorkspace,
  localePrefix: string,
): Promise<HeaderWorkspace> {
  const enabledLocales = await localeService.listEnabled();
  const refs = collectHeaderTranslationRefs(ws);
  const bundle = await loadWorkspaceTranslations(refs);
  return localizeHeaderWorkspaceWithBundle(ws, localePrefix, enabledLocales, bundle);
}

export async function enrichHeaderWorkspaceForSiteCached(
  ws: HeaderWorkspace,
  localeCode: string,
): Promise<HeaderWorkspace> {
  const fingerprint = workspaceFlyoutFingerprint(ws);
  return unstable_cache(
    async () => {
      const localized = await enrichHeaderWorkspaceWithMenuTranslations(ws, localeCode);
      return enrichFlyoutMenuImagesOnly(localized, localeCode);
    },
    ["header-flyout-images", localeCode, fingerprint],
    { tags: ["header-workspace", `header-flyout-${localeCode}`], revalidate: 300 },
  )();
}

async function enrichMenuItem(item: MenuItem, localeCode: string): Promise<MenuItem> {
  const children = await Promise.all((item.children ?? []).map((c) => enrichMenuItem(c, localeCode)));
  const resolved = await resolveCardImageUrlForMenuItem(item, localeCode);
  return {
    ...item,
    imageUrl: resolved ?? item.imageUrl,
    children,
  };
}

async function enrichMenuRecord(record: MenuRecord, localeCode: string): Promise<MenuRecord> {
  return {
    ...record,
    items: await Promise.all(record.items.map((i) => enrichMenuItem(i, localeCode))),
  };
}

export async function enrichHeaderWorkspaceWithMegaCardImages(
  ws: HeaderWorkspace,
  localeCode: string,
): Promise<HeaderWorkspace> {
  const menusDatabase = { ...ws.menusDatabase };
  for (const key of Object.keys(menusDatabase)) {
    menusDatabase[key] = await enrichMenuRecord(menusDatabase[key], localeCode);
  }
  return { ...ws, menusDatabase };
}

/** Sync preview — uses existing imageUrl only */
export function enrichHeaderWorkspaceWithMegaCardImagesSync(
  ws: HeaderWorkspace,
  _localeCode: string,
): HeaderWorkspace {
  return ws;
}
