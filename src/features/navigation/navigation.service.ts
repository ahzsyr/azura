import { DEFAULT_BRAND_NAME } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { publishShellChange } from "@/services/publish-propagation";
import { contentPublicService } from "@/features/content/content-public.service";
import { loadTranslationsMap } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import {
  createEmptyWorkspace,
  mergeWorkspaceImport,
  mergeHeaderWorkspaceWithTheme,
} from "./defaults";
import { navigationRepository } from "./navigation.repository";
import type { HeaderBuilderCatalog, HeaderWorkspace } from "./types";
import { headerWorkspaceSchema } from "@/schemas/navigation";
import { enrichHeaderWorkspaceForSiteCached, enrichFlyoutMenuImagesOnly, stripLinkedMenuImagesFromWorkspace } from "./mega-menu-card-images";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";
import { localeService } from "@/features/i18n/locale.service";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { readCatalogBrandProfiles, readCatalogTaxonomy } from "@/features/catalog/admin/catalog-taxonomy";
import { tagNameToSlug } from "@/features/catalog/brand-tag-pages.service";
import { brandNameToSlug } from "@/features/catalog/types/catalog-brand-profile";

const STATIC_PAGES = [
  { slug: "home", title: "Home" },
  { slug: "about", title: "About" },
  { slug: "products", title: "Products" },
  { slug: "collections", title: "Collections" },
  { slug: "brands", title: "Brands" },
  { slug: "tags", title: "Tags" },
  { slug: "services", title: "Services" },
  { slug: "packages", title: "Packages" },
  { slug: "compare", title: "Compare" },
  { slug: "favorites", title: "Favorites" },
  { slug: "account", title: "Account" },
  { slug: "hotels-transport", title: "Hotels & Transport" },
  { slug: "gallery", title: "Gallery" },
  { slug: "testimonials", title: "Testimonials" },
  { slug: "contact", title: "Contact" },
  { slug: "blog", title: "Blog" },
];

export const navigationCatalogService = {
  async getCatalog(locale: string = "en"): Promise<HeaderBuilderCatalog> {
    await contentPublicService.ensureReady();
    const enabledLocales = await localeService.listEnabled();
    const defaultCode =
      enabledLocales.find((entry) => entry.isDefault)?.code ?? enabledLocales[0]?.code ?? "en";
    const languageCode = resolvePrefixToCode(locale, enabledLocales);
    const [cmsPages, collections, catalogItems, posts] = await Promise.all([
      prisma.cmsPage.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, slug: true },
        orderBy: { slug: "asc" },
      }),
      prisma.contentCollection.findMany({
        where: { contentType: { slug: "catalog-items" }, isPublished: true },
        select: { id: true, slug: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.contentItem.findMany({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          isVisible: true,
          contentType: { slug: "catalog-items" },
          slug: { not: null },
        },
        select: { id: true, slug: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, slug: true },
        orderBy: { publishedAt: "desc" },
        take: 100,
      }),
    ]);

    const [cmsTranslations, collectionTranslations, itemTranslations, postTranslations] =
      await Promise.all([
        loadTranslationsMap("CmsPage", cmsPages.map((p) => p.id)),
        loadTranslationsMap("ContentCollection", collections.map((c) => c.id)),
        loadTranslationsMap("ContentItem", catalogItems.map((i) => i.id)),
        loadTranslationsMap("Post", posts.map((p) => p.id)),
      ]);

    const pickTitle = (
      entityType: "CmsPage" | "ContentCollection" | "ContentItem" | "Post",
      id: string,
      slug: string,
      field: string
    ) => {
      const map =
        entityType === "CmsPage"
          ? cmsTranslations
          : entityType === "ContentCollection"
            ? collectionTranslations
            : entityType === "ContentItem"
              ? itemTranslations
              : postTranslations;
      return (
        resolveTranslation(field, languageCode, {
          translations: map.get(id) ?? [],
          enabledLocales,
          defaultCode,
        }) || slug
      );
    };

    const cmsSlugs = new Set(cmsPages.map((p) => p.slug));
    const staticPages = STATIC_PAGES.filter((p) => !cmsSlugs.has(p.slug));
    const pages = [
      ...staticPages,
      ...cmsPages.map((p) => ({
        slug: p.slug,
        title: pickTitle("CmsPage", p.id, p.slug, "title"),
      })),
    ];

    const [fsCollections, fsProducts, taxonomy, brandProfiles] = await Promise.all([
      collectionsDataService.loadAll({ localePrefix: locale }),
      productsDataService.listProductPickerEntries(locale, 400),
      readCatalogTaxonomy(locale),
      readCatalogBrandProfiles(locale),
    ]);

    const collectionSlugs = new Set<string>();
    const mergedCollections = [
      ...fsCollections
        .filter((c) => c.visible !== false)
        .map((c) => {
          collectionSlugs.add(c.slug);
          return { slug: c.slug, name: c.name };
        }),
      ...collections
        .filter((c) => !collectionSlugs.has(c.slug))
        .map((c) => ({
          slug: c.slug,
          name: pickTitle("ContentCollection", c.id, c.slug, "name"),
        })),
    ];

    const productSlugs = new Set(fsProducts.map((p) => p.slug));
    const mergedProducts = [
      ...fsProducts,
      ...catalogItems
        .filter((p) => p.slug && !productSlugs.has(p.slug))
        .map((p) => ({
          slug: p.slug!,
          name: pickTitle("ContentItem", p.id, p.slug!, "title"),
        })),
    ];

    const brandOptions = [
      ...brandProfiles.map((profile) => ({ slug: profile.slug, name: profile.name })),
      ...taxonomy.brands.map((name) => ({ slug: brandNameToSlug(name), name })),
    ];
    const brandSeen = new Set<string>();
    const brands = brandOptions.filter((brand) => {
      const slug = brand.slug.trim().toLowerCase();
      if (!slug || brandSeen.has(slug)) return false;
      brandSeen.add(slug);
      return true;
    });

    const tags = taxonomy.tags
      .map((name) => ({ slug: tagNameToSlug(name), name }))
      .filter((tag, index, arr) => {
        const slug = tag.slug.trim().toLowerCase();
        return Boolean(slug) && arr.findIndex((item) => item.slug.toLowerCase() === slug) === index;
      });

    return {
      pages,
      collections: mergedCollections,
      brands,
      tags,
      products: mergedProducts,
      posts: posts.map((p) => ({
        slug: p.slug,
        title: pickTitle("Post", p.id, p.slug, "title"),
      })),
    };
  },
};

function summarizeWorkspace(workspace: HeaderWorkspace) {
  const active = workspace.menusDatabase[workspace.activeMenuKey];
  return {
    menuItemCount: active?.items?.length ?? 0,
    logoPresent: Boolean(workspace.branding.logoImageLightUrl || workspace.branding.logoImageDarkUrl),
    activeMenuKey: workspace.activeMenuKey,
  };
}

export function resolveWorkspaceFromRaw(raw: unknown | null): HeaderWorkspace {
  // Runtime read path stays pure: no migration or menu auto-population here.
  if (!raw) {
    return createEmptyWorkspace();
  }
  return mergeWorkspaceImport(raw);
}

export const navigationService = {
  async getWorkspace(): Promise<HeaderWorkspace> {
    const raw = await navigationRepository.getCached();
    const workspace = resolveWorkspaceFromRaw(raw);
    console.info("[navigation] workspace resolved", {
      source: raw ? "cache" : "fallback",
      reason: raw ? undefined : "missing-row",
      ...summarizeWorkspace(workspace),
    });
    return workspace;
  },

  async getWorkspaceForBuilder(localePrefix: string = "en"): Promise<HeaderWorkspace> {
    const ws = await navigationService.getWorkspace();
    return enrichFlyoutMenuImagesOnly(ws, localePrefix);
  },

  async saveWorkspace(payload: unknown): Promise<HeaderWorkspace> {
    const workspace = resolveWorkspaceFromRaw(payload);
    const parsed = headerWorkspaceSchema.parse(workspace) as HeaderWorkspace;
    const stripped = stripLinkedMenuImagesFromWorkspace(parsed);
    await navigationRepository.save(stripped);
    return enrichFlyoutMenuImagesOnly(stripped, "en");
  },

  async publishWorkspace(): Promise<import("@/services/publish-propagation").PublishResult> {
    const workspace = await navigationService.getWorkspace();
    return publishShellChange({ entityType: "header", headerWorkspace: workspace });
  },

  async patchWorkspace(changes: Record<string, unknown>): Promise<HeaderWorkspace> {
    const current = await navigationService.getWorkspace();
    const baseline = {
      menusDatabase: current.menusDatabase,
      activeMenuKey: current.activeMenuKey,
      brandingState: current.branding,
      headerActions: current.headerActions,
      settings: current.settings,
    };
    const { applyPatch, isEmptyPatch } = await import("@/lib/patch");
    if (isEmptyPatch(changes)) return current;
    const merged = applyPatch(baseline, changes);
    return navigationService.saveWorkspace(merged);
  },

  async getWorkspaceForSite(
    theme?: {
      logoUrl?: string | null;
      brandConfig?: import("./types").BrandingState;
      siteName?: string;
      tagline?: string;
    },
    localePrefix: string = "en"
  ): Promise<HeaderWorkspace> {
    const ws = await navigationService.getWorkspace();
    const withTheme = theme
      ? mergeHeaderWorkspaceWithTheme(ws, {
          logoUrl: theme.logoUrl,
          brandConfig: theme.brandConfig,
          siteName: theme.siteName ?? theme.brandConfig?.brandName ?? DEFAULT_BRAND_NAME,
          tagline: theme.tagline ?? theme.brandConfig?.tagline,
        })
      : ws;
    try {
      const enriched = await enrichHeaderWorkspaceForSiteCached(withTheme, localePrefix);
      const localizedTagline = theme?.tagline?.trim();
      if (localizedTagline) {
        const localizedWorkspace = {
          ...enriched,
          branding: {
            ...enriched.branding,
            tagline: localizedTagline,
            showTagline: enriched.branding.showTagline !== false,
          },
        };
        console.info("[navigation] workspace for site", {
          source: "cache",
          locale: localePrefix,
          ...summarizeWorkspace(localizedWorkspace),
        });
        return localizedWorkspace;
      }
      console.info("[navigation] workspace for site", {
        source: "cache",
        locale: localePrefix,
        ...summarizeWorkspace(enriched),
      });
      return enriched;
    } catch (error) {
      console.error("[navigation] header enrichment failed:", error);
      console.warn("[navigation] workspace for site fallback", {
        source: "fallback",
        reason: "enrichment-failed",
        locale: localePrefix,
        ...summarizeWorkspace(withTheme),
      });
      return withTheme;
    }
  },
};