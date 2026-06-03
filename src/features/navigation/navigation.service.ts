import { DEFAULT_BRAND_NAME } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { contentPublicService } from "@/features/content/content-public.service";
import { getLocalizedField } from "@/lib/utils";
import { createDefaultWorkspace, mergeWorkspaceImport, mergeHeaderWorkspaceWithTheme } from "./defaults";
import { navigationRepository } from "./navigation.repository";
import type { HeaderBuilderCatalog, HeaderWorkspace } from "./types";
import { headerWorkspaceSchema } from "@/schemas/navigation";
import { enrichHeaderWorkspaceWithMegaCardImages } from "./mega-menu-card-images";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";

const STATIC_PAGES = [
  { slug: "home", title: "Home" },
  { slug: "about", title: "About" },
  { slug: "packages", title: "Packages" },
  { slug: "visa", title: "Visa" },
  { slug: "hotels-transport", title: "Hotels & Transport" },
  { slug: "gallery", title: "Gallery" },
  { slug: "testimonials", title: "Testimonials" },
  { slug: "contact", title: "Contact" },
  { slug: "blog", title: "Blog" },
  { slug: "collections", title: "Collections" },
  { slug: "products", title: "Products" },
];

export const navigationCatalogService = {
  async getCatalog(locale: string = "en"): Promise<HeaderBuilderCatalog> {
    await contentPublicService.ensureReady();
    const [cmsPages, collections, catalogItems, posts] = await Promise.all([
      prisma.cmsPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, titleEn: true, titleAr: true },
        orderBy: { slug: "asc" },
      }),
      prisma.contentCollection.findMany({
        where: { contentType: { slug: "catalog-items" }, isPublished: true },
        select: { slug: true, nameEn: true, nameAr: true },
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
        select: { slug: true, titleEn: true, titleAr: true },
        orderBy: { titleEn: "asc" },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, titleEn: true, titleAr: true },
        orderBy: { publishedAt: "desc" },
        take: 100,
      }),
    ]);

    const pick = <T extends Record<string, unknown>>(item: T, field: string) =>
      getLocalizedField(item, field, locale);

    const cmsSlugs = new Set(cmsPages.map((p) => p.slug));
    const staticPages = STATIC_PAGES.filter((p) => !cmsSlugs.has(p.slug));
    const pages = [
      ...staticPages,
      ...cmsPages.map((p) => ({ slug: p.slug, title: pick(p, "title") })),
    ];

    const fsCollections = await collectionsDataService.loadAll({ localePrefix: locale });
    const fsProducts = await productsDataService.listProductPickerEntries(locale, 400);

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
        .map((c) => ({ slug: c.slug, name: pick(c, "name") })),
    ];

    const productSlugs = new Set(fsProducts.map((p) => p.slug));
    const mergedProducts = [
      ...fsProducts,
      ...catalogItems
        .filter((p) => p.slug && !productSlugs.has(p.slug))
        .map((p) => ({ slug: p.slug!, name: pick(p, "title") })),
    ];

    return {
      pages,
      collections: mergedCollections,
      products: mergedProducts,
      posts: posts.map((p) => ({
        slug: p.slug,
        title: pick(p, "title"),
      })),
    };
  },
};

export const navigationService = {
  async getWorkspace(): Promise<HeaderWorkspace> {
    const raw = await navigationRepository.getCached();
    if (!raw) {
      const defaults = createDefaultWorkspace();
      await navigationRepository.save(defaults);
      return defaults;
    }
    return mergeWorkspaceImport(raw);
  },

  async saveWorkspace(payload: unknown): Promise<HeaderWorkspace> {
    const merged = mergeWorkspaceImport(payload);
    const parsed = headerWorkspaceSchema.parse(merged);
    await navigationRepository.save(parsed as HeaderWorkspace);
    return parsed as HeaderWorkspace;
  },

  async getWorkspaceForSite(
    theme?: {
      logoUrl?: string | null;
      brandConfig?: import("./types").BrandingState;
      siteName?: string;
      tagline?: string;
    },
    localePrefix: string = "en",
  ): Promise<HeaderWorkspace> {
    const ws = await this.getWorkspace();
    const withTheme = theme
      ? mergeHeaderWorkspaceWithTheme(ws, {
          logoUrl: theme.logoUrl,
          brandConfig: theme.brandConfig,
          siteName: theme.siteName ?? theme.brandConfig?.brandName ?? DEFAULT_BRAND_NAME,
          tagline: theme.tagline ?? theme.brandConfig?.tagline,
        })
      : ws;
    return enrichHeaderWorkspaceWithMegaCardImages(withTheme, localePrefix);
  },
};
