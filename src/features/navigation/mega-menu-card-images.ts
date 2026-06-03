import { prisma } from "@/lib/prisma";
import {
  collectionMapFromList,
  resolveCollectionImages,
} from "@/features/collections/collection-navigation";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";
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

async function getCollectionImageUrl(slug: string, localeCode: string): Promise<string | undefined> {
  const col = await collectionsDataService.loadBySlug({ localePrefix: localeCode }, slug);
  if (!col) return undefined;
  const all = await collectionsDataService.loadAll({ localePrefix: localeCode });
  const bySlug = collectionMapFromList(all.filter((c) => c.visible !== false));
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

export async function resolveCardImageUrlForMenuItem(
  item: MenuItem,
  localeCode: string,
): Promise<string | undefined> {
  if (item.imageUrl?.trim()) return item.imageUrl.trim();
  switch (item.type) {
    case "collection":
    case "packageCategory": {
      const slug = (item.collectionId ?? item.packageCategoryId ?? "").trim();
      if (!slug) return undefined;
      return getCollectionImageUrl(slug, localeCode);
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
    case "image":
      return item.imageUrl?.trim() || undefined;
    default:
      return item.imageUrl?.trim() || undefined;
  }
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