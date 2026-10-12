import { unstable_cache } from "next/cache";
import { sha256Hex } from "@/lib/sha256-hex";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import {
  collectionMapFromList,
  isCollectionImageSrc,
  pickCollectionMenuMedia,
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
import { expandMegaMenuPanelSources } from "./mega-menu-panel-source";
import type { HeaderWorkspace, MenuItem, MenuRecord } from "./types";
import {
  pickBrandMenuMedia,
  shouldPreferStoredMenuImageUrl,
  usesLinkedMenuImageSource,
  type BrandMenuMedia,
} from "./mega-menu-linked-images";

export {
  shouldPreferStoredMenuImageUrl,
  stripLinkedMenuImagesFromWorkspace,
  usesLinkedMenuImageSource,
  pickBrandMenuImageUrl,
  pickBrandMenuMedia,
} from "./mega-menu-linked-images";

export type ResolvedMenuItemMedia = BrandMenuMedia & {
  resolvedIcon?: string;
};

function contentItemMenuMedia(item: {
  featuredImageUrl?: string | null;
  attributes?: unknown;
  media?: { url: string; isCover?: boolean }[];
} | null): ResolvedMenuItemMedia {
  if (!item) return {};
  const cover =
    item.media?.find((entry) => entry.isCover)?.url ??
    item.featuredImageUrl ??
    item.media?.[0]?.url;
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const logoRaw = typeof attrs.logo === "string" ? attrs.logo.trim() : typeof attrs.logoUrl === "string" ? attrs.logoUrl.trim() : "";
  const iconRaw = typeof attrs.icon === "string" ? attrs.icon.trim() : "";
  const iconIsUrl = Boolean(iconRaw && isCollectionImageSrc(iconRaw));
  const coverUrl = cover?.trim() || undefined;
  return {
    sourceLogoUrl: logoRaw && isCollectionImageSrc(logoRaw) ? logoRaw : undefined,
    sourceIconUrl: iconIsUrl ? iconRaw : undefined,
    sourceIconName: iconRaw && !iconIsUrl ? iconRaw : undefined,
    sourceImageUrl: coverUrl,
    photoUrl: coverUrl,
    iconImageUrl: iconIsUrl ? iconRaw : undefined,
    resolvedIcon: iconRaw && !iconIsUrl ? iconRaw : undefined,
  };
}

async function getCatalogItemMenuMedia(slug: string): Promise<ResolvedMenuItemMedia> {
  const item = await prisma.contentItem.findFirst({
    where: {
      slug,
      deletedAt: null,
      status: "PUBLISHED",
      contentType: { slug: "catalog-items" },
    },
    include: {
      media: { where: { isPublished: true, isHidden: false }, orderBy: { sortOrder: "asc" } },
    },
  });
  return contentItemMenuMedia(item);
}

async function getContentItemMenuMedia(
  typeSlug: string,
  itemSlug: string,
): Promise<ResolvedMenuItemMedia> {
  const item = await prisma.contentItem.findFirst({
    where: {
      slug: itemSlug,
      deletedAt: null,
      status: "PUBLISHED",
      contentType: { slug: typeSlug },
    },
    include: {
      media: { where: { isPublished: true, isHidden: false }, orderBy: { sortOrder: "asc" } },
    },
  });
  return contentItemMenuMedia(item);
}

/** Parse `/{routePrefix|typeSlug}/{itemSlug}` content links for icon and cover. */
async function getContentLinkMenuMedia(url: string | undefined): Promise<ResolvedMenuItemMedia> {
  const path = (url ?? "").trim().replace(/^\//, "");
  if (!path || path.startsWith("http")) return {};
  const [prefix, ...rest] = path.split("/");
  const itemSlug = rest.join("/");
  if (!prefix || !itemSlug || itemSlug.includes("/")) return {};

  const type = await prisma.contentType.findFirst({
    where: {
      isEnabled: true,
      OR: [{ slug: prefix }, { routePrefix: prefix }],
    },
    select: { slug: true },
  });
  if (!type) return {};
  return getContentItemMenuMedia(type.slug, itemSlug);
}

function getCollectionMenuMediaFromMap(
  slug: string,
  bySlug: Map<string, Collection>,
): ResolvedMenuItemMedia {
  const col = bySlug.get(slug);
  if (!col) return {};
  const media = pickCollectionMenuMedia(resolveCollectionImages(col, bySlug));
  return {
    sourceIconUrl: media.iconImageUrl,
    sourceImageUrl: media.photoUrl,
    sourceIconName: media.resolvedIcon,
    iconImageUrl: media.iconImageUrl,
    photoUrl: media.photoUrl,
    resolvedIcon: media.resolvedIcon,
  };
}

async function getProductImageUrl(slug: string, localeCode: string): Promise<string | undefined> {
  const loaded = await productsDataService.getProduct(localeCode, slug);
  if (loaded) {
    const images = loaded.product.media?.images ?? [];
    return images.find((img) => img.type === "main")?.url || images[0]?.url;
  }
  const media = await getCatalogItemMenuMedia(slug);
  return media.photoUrl;
}

async function getBrandMenuMedia(slug: string, localeCode: string): Promise<ResolvedMenuItemMedia> {
  const profiles = await readCatalogBrandProfiles(localeCode);
  const profile = profiles.find((entry) => entry.slug.trim().toLowerCase() === slug.toLowerCase());
  if (!profile) return {};
  const picked = pickBrandMenuMedia(profile);
  return {
    sourceLogoUrl: picked.iconImageUrl,
    sourceImageUrl: picked.photoUrl,
    photoUrl: picked.photoUrl,
  };
}

function withPhotoOverride(item: MenuItem, media: ResolvedMenuItemMedia): ResolvedMenuItemMedia {
  const override = item.megaMenuImageUrl?.trim();
  if (!override) return media;
  return { ...media, photoUrl: override };
}

export async function resolveMenuItemMedia(
  item: MenuItem,
  localeCode: string,
  collectionBySlug?: Map<string, Collection>,
): Promise<ResolvedMenuItemMedia> {
  if (item.type !== "link" && shouldPreferStoredMenuImageUrl(item)) {
    return withPhotoOverride(item, { photoUrl: item.imageUrl?.trim() });
  }
  switch (item.type) {
    case "collection":
    case "packageCategory": {
      const slug = (item.collectionId ?? item.packageCategoryId ?? "").trim();
      if (!slug) return withPhotoOverride(item, {});
      if (collectionBySlug) {
        return withPhotoOverride(item, getCollectionMenuMediaFromMap(slug, collectionBySlug));
      }
      const col = await collectionsDataService.loadBySlug({ localePrefix: localeCode }, slug);
      if (!col) return withPhotoOverride(item, {});
      const all = await collectionsDataService.loadAll({ localePrefix: localeCode });
      const bySlug = collectionMapFromList(all.filter((c) => c.visible !== false));
      return withPhotoOverride(item, getCollectionMenuMediaFromMap(slug, bySlug));
    }
    case "product":
    case "package": {
      const slug = (item.productId ?? item.packageId ?? "").trim();
      if (!slug) return withPhotoOverride(item, {});
      const photo =
        item.type === "product" || item.productId?.trim()
          ? await getProductImageUrl(item.productId?.trim() || slug, localeCode)
          : (await getCatalogItemMenuMedia(slug)).photoUrl;
      return withPhotoOverride(item, { photoUrl: photo, sourceImageUrl: photo });
    }
    case "brand": {
      const slug = (item.brandSlug ?? "").trim();
      if (!slug) return withPhotoOverride(item, {});
      return withPhotoOverride(item, await getBrandMenuMedia(slug, localeCode));
    }
    case "image":
      return withPhotoOverride(item, { photoUrl: item.imageUrl?.trim() || undefined });
    case "link": {
      if (item.imageUrl?.trim() && !item.url?.trim()) {
        return withPhotoOverride(item, { photoUrl: item.imageUrl.trim() });
      }
      const linked = await getContentLinkMenuMedia(item.url);
      if (item.imageUrl?.trim() && !linked.photoUrl) linked.photoUrl = item.imageUrl.trim();
      return withPhotoOverride(item, linked);
    }
    default:
      return withPhotoOverride(item, { photoUrl: item.imageUrl?.trim() || undefined });
  }
}

/** @deprecated Use resolveMenuItemMedia. Returns the cover/photo URL only. */
export async function resolveCardImageUrlForMenuItem(
  item: MenuItem,
  localeCode: string,
  collectionBySlug?: Map<string, Collection>,
): Promise<string | undefined> {
  const media = await resolveMenuItemMedia(item, localeCode, collectionBySlug);
  return media.photoUrl;
}

function applyResolvedMenuMedia(item: MenuItem, media: ResolvedMenuItemMedia): MenuItem {
  const linked = usesLinkedMenuImageSource(item.type);
  const sourceLogoUrl = media.sourceLogoUrl;
  const sourceIconUrl = media.sourceIconUrl;
  const sourceImageUrl = media.sourceImageUrl ?? media.photoUrl;
  const sourceIconName = media.sourceIconName ?? media.resolvedIcon;
  return {
    ...item,
    sourceLogoUrl,
    sourceIconUrl,
    sourceImageUrl,
    sourceIconName: item.icon?.trim() ? item.sourceIconName : sourceIconName,
    iconImageUrl: sourceIconUrl || sourceLogoUrl,
    photoUrl: sourceImageUrl,
    resolvedIcon: item.icon?.trim() ? undefined : sourceIconName,
    imageUrl: linked ? sourceImageUrl : item.imageUrl,
  };
}

async function enrichFlyoutChild(
  child: MenuItem,
  localeCode: string,
  collectionBySlug: Map<string, Collection>,
): Promise<MenuItem> {
  const resolved = await resolveMenuItemMedia(child, localeCode, collectionBySlug);
  return applyResolvedMenuMedia(child, resolved);
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
  // Include settings/actions/branding so icon visibility and other header
  // settings changes bust the site enrich cache (menus-only keys were stale).
  const payload = JSON.stringify({
    activeMenuKey: ws.activeMenuKey,
    menusDatabase: ws.menusDatabase,
    settings: ws.settings,
    headerActions: ws.headerActions,
    branding: ws.branding,
  });
  return sha256Hex(payload).slice(0, 24);
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
      const withSources = await expandMegaMenuPanelSources(localized, localeCode);
      return enrichFlyoutMenuImagesOnly(withSources, localeCode);
    },
    ["header-flyout-images-v3", localeCode, fingerprint],
    { tags: ["header-workspace", `header-flyout-${localeCode}`], revalidate: 300 },
  )();
}

async function enrichMenuItem(item: MenuItem, localeCode: string): Promise<MenuItem> {
  const children = await Promise.all((item.children ?? []).map((c) => enrichMenuItem(c, localeCode)));
  const resolved = await resolveMenuItemMedia(item, localeCode);
  return applyResolvedMenuMedia({ ...item, children }, resolved);
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