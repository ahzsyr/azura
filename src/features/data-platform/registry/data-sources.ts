/**
 * Single source of truth for all data sources in the platform.
 *
 * This replaces the three hand-maintained registries that previously lived in
 * src/features/storage/constants.ts:
 *   - JSON_NAMESPACES   → storage: "json-store" sources
 *   - BROWSABLE_TABLES  → storage: "mysql" sources with browse capability
 *   - SCHEMA_MODELS     → prismaModelName + note metadata
 *
 * Prisma admin UI metadata (note, adminHref) lives separately in prisma-overlay.ts.
 * All 85 models from the Prisma schema are described in that overlay; only the
 * sources listed here with explicit query functions support browsing in Data Explorer.
 */

import { prisma } from "@/lib/prisma";
import type { DataSourceDefinition } from "./types";

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseQuery(page: number) {
  return {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: { updatedAt: "desc" as const },
  };
}

// ---------------------------------------------------------------------------
// MySQL / Prisma sources (browsable in Data Explorer)
// ---------------------------------------------------------------------------

const MYSQL_SOURCES: DataSourceDefinition[] = [
  {
    id: "FaqItem",
    storage: "mysql",
    prismaModelName: "FaqItem",
    category: "content",
    displayName: "FAQ items",
    adminHref: "/admin/faqs",
    deploymentNavItemId: "faqs",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { question?: unknown }).question ?? row.id),
      subtitle: (row) => {
        const r = row as { faqSet?: { slug?: unknown } };
        return r.faqSet?.slug ? String(r.faqSet.slug) : undefined as unknown as string;
      },
    },
    findMany: async ({ skip, take }) =>
      prisma.faqItem.findMany({
        skip, take,
        orderBy: { updatedAt: "desc" },
        include: { faqSet: { select: { id: true, slug: true } } },
      }),
    findUnique: (id) =>
      prisma.faqItem.findUnique({
        where: { id },
        include: { faqSet: { select: { slug: true } } },
      }),
    count: () => prisma.faqItem.count(),
    search: (query, limit) =>
      prisma.faqItem.findMany({
        where: { faqSet: { slug: { contains: query } } },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: { faqSet: { select: { id: true, slug: true } } },
      }),
    note: "FAQ — /admin/faqs",
  },
  {
    id: "FaqSet",
    storage: "mysql",
    prismaModelName: "FaqSet",
    category: "content",
    displayName: "FAQ sets",
    adminHref: "/admin/faqs",
    deploymentNavItemId: "faqs",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { title?: unknown; slug?: unknown }).title ?? (row as { slug?: unknown }).slug ?? row.id),
      subtitle: (row) => {
        const r = row as { _count?: { items?: number } };
        return r._count ? `${r._count.items ?? 0} items` : undefined as unknown as string;
      },
    },
    findMany: async ({ skip, take }) =>
      prisma.faqSet.findMany({
        skip, take,
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { items: true } } },
      }),
    findUnique: (id) =>
      prisma.faqSet.findUnique({
        where: { id },
        include: { _count: { select: { items: true } } },
      }),
    count: () => prisma.faqSet.count(),
    search: (query, limit) =>
      prisma.faqSet.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { items: true } } },
      }),
    note: "FAQ sets — /admin/faqs",
  },
  {
    id: "Testimonial",
    storage: "mysql",
    prismaModelName: "Testimonial",
    category: "content",
    displayName: "Testimonials",
    adminHref: "/admin/testimonials",
    deploymentNavItemId: "testimonials",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { author?: unknown; name?: unknown }).author ?? (row as { name?: unknown }).name ?? row.id),
    },
    findMany: ({ skip, take }) =>
      prisma.testimonial.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) => prisma.testimonial.findUnique({ where: { id } }),
    count: () => prisma.testimonial.count(),
    search: (query, limit) =>
      prisma.testimonial.findMany({
        where: { OR: [{ name: { contains: query } }, { location: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Testimonials — /admin/testimonials",
  },
  {
    id: "Gallery",
    storage: "mysql",
    prismaModelName: "Gallery",
    category: "content",
    displayName: "Gallery",
    adminHref: "/admin/gallery",
    deploymentNavItemId: "gallery",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { title?: unknown; slug?: unknown }).title ?? (row as { slug?: unknown }).slug ?? row.id),
    },
    findMany: ({ skip, take }) =>
      prisma.gallery.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) => prisma.gallery.findUnique({ where: { id } }),
    count: () => prisma.gallery.count(),
    search: (query, limit) =>
      prisma.gallery.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Gallery — /admin/gallery",
  },
  {
    id: "ContentItem",
    storage: "mysql",
    prismaModelName: "ContentItem",
    category: "catalog",
    displayName: "Content items",
    adminHref: "/admin/content",
    deploymentNavItemId: "content-types",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { title?: unknown }).title ?? row.id),
      subtitle: (row) => {
        const r = row as { contentType?: { slug?: unknown } };
        return r.contentType?.slug ? String(r.contentType.slug) : undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.contentItem.findMany({
        skip, take,
        orderBy: { updatedAt: "desc" },
        include: { contentType: { select: { slug: true } } },
      }),
    findUnique: (id) =>
      prisma.contentItem.findUnique({
        where: { id },
        include: { contentType: { select: { slug: true } } },
      }),
    count: () => prisma.contentItem.count(),
    search: (query, limit) =>
      prisma.contentItem.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: { contentType: { select: { slug: true } } },
      }),
    note: "Catalog items — /admin/content",
  },
  {
    id: "ContentType",
    storage: "mysql",
    prismaModelName: "ContentType",
    category: "catalog",
    displayName: "Content types",
    adminHref: "/admin/content/types",
    deploymentNavItemId: "content-types",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { name?: unknown; slug?: unknown }).name ?? (row as { slug?: unknown }).slug ?? row.id),
    },
    findMany: ({ skip, take }) =>
      prisma.contentType.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) => prisma.contentType.findUnique({ where: { id } }),
    count: () => prisma.contentType.count(),
    search: (query, limit) =>
      prisma.contentType.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Catalog types — /admin/content/types",
  },
  {
    id: "ContentCollection",
    storage: "mysql",
    prismaModelName: "ContentCollection",
    category: "catalog",
    displayName: "Content collections",
    adminHref: "/admin/content",
    deploymentNavItemId: "collections",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { title?: unknown; slug?: unknown }).title ?? (row as { slug?: unknown }).slug ?? row.id),
      subtitle: (row) => {
        const r = row as { contentType?: { slug?: unknown } };
        return r.contentType?.slug ? String(r.contentType.slug) : undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.contentCollection.findMany({
        skip, take,
        orderBy: { updatedAt: "desc" },
        include: { contentType: { select: { slug: true } } },
      }),
    findUnique: (id) =>
      prisma.contentCollection.findUnique({
        where: { id },
        include: { contentType: { select: { slug: true } } },
      }),
    count: () => prisma.contentCollection.count(),
    search: (query, limit) =>
      prisma.contentCollection.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: { contentType: { select: { slug: true } } },
      }),
    note: "Collections / categories",
  },

  // ---- Promoted from count-only in Phase 5 --------------------------------

  {
    id: "Post",
    storage: "mysql",
    prismaModelName: "Post",
    category: "content",
    displayName: "Blog posts",
    adminHref: "/admin/posts",
    deploymentNavItemId: "blog",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { slug?: unknown }).slug ?? row.id),
      subtitle: (row) => {
        const r = row as { status?: unknown; author?: { name?: unknown } };
        const parts = [r.status ? String(r.status) : null, r.author?.name ? String(r.author.name) : null];
        return parts.filter(Boolean).join(" · ") || undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.post.findMany({
        skip, take,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      }),
    findUnique: (id) =>
      prisma.post.findUnique({
        where: { id },
        include: { author: { select: { name: true } } },
      }),
    count: () => prisma.post.count(),
    search: (query, limit) =>
      prisma.post.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      }),
    note: "Blog — /admin/posts",
  },
  {
    id: "CmsPage",
    storage: "mysql",
    prismaModelName: "CmsPage",
    category: "content",
    displayName: "CMS pages",
    adminHref: "/admin/pages",
    deploymentNavItemId: "pages",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { slug?: unknown }).slug ?? row.id),
      subtitle: (row) => String((row as { status?: unknown }).status ?? ""),
    },
    findMany: ({ skip, take }) =>
      prisma.cmsPage.findMany({
        skip, take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, slug: true, templateKey: true, status: true,
          publishedAt: true, scheduledAt: true, createdAt: true,
        },
      }),
    findUnique: (id) =>
      prisma.cmsPage.findUnique({
        where: { id },
        select: {
          id: true, slug: true, templateKey: true, status: true,
          publishedAt: true, scheduledAt: true, createdAt: true,
        },
      }),
    count: () => prisma.cmsPage.count(),
    search: (query, limit) =>
      prisma.cmsPage.findMany({
        where: { slug: { contains: query } },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, slug: true, templateKey: true, status: true,
          publishedAt: true, scheduledAt: true, createdAt: true,
        },
      }),
    note: "CMS — blocks in DB JSON column",
  },
  {
    id: "Inquiry",
    storage: "mysql",
    prismaModelName: "Inquiry",
    category: "marketing",
    displayName: "Inquiries",
    adminHref: "/admin/inquiries",
    deploymentNavItemId: "inquiries",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { name?: unknown }).name ?? row.id),
      subtitle: (row) => {
        const r = row as { email?: unknown; status?: unknown };
        return [r.email, r.status].filter(Boolean).map(String).join(" · ") || undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.inquiry.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) =>
      prisma.inquiry.findUnique({ where: { id } }),
    count: () => prisma.inquiry.count(),
    search: (query, limit) =>
      prisma.inquiry.findMany({
        where: { OR: [{ name: { contains: query } }, { email: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "CRM — /admin/inquiries",
  },
  {
    id: "FormSubmission",
    storage: "mysql",
    prismaModelName: "FormSubmission",
    category: "marketing",
    displayName: "Form submissions",
    adminHref: "/admin/form-submissions",
    deploymentNavItemId: "form-submissions",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => {
        const r = row as { pageSlug?: unknown; blockType?: unknown };
        return String(r.pageSlug ?? r.blockType ?? row.id);
      },
      subtitle: (row) => String((row as { status?: unknown }).status ?? ""),
    },
    findMany: ({ skip, take }) =>
      prisma.formSubmission.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) =>
      prisma.formSubmission.findUnique({ where: { id } }),
    count: () => prisma.formSubmission.count(),
    search: (query, limit) =>
      prisma.formSubmission.findMany({
        where: { OR: [{ pageSlug: { contains: query } }, { locale: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Form inbox — /admin/form-submissions",
  },
  {
    id: "NewsletterSubscriber",
    storage: "mysql",
    prismaModelName: "NewsletterSubscriber",
    category: "marketing",
    displayName: "Newsletter subscribers",
    adminHref: "/admin/newsletter",
    deploymentNavItemId: "newsletter",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { email?: unknown }).email ?? row.id),
      subtitle: (row) => {
        const r = row as { status?: unknown; segment?: unknown };
        return [r.status, r.segment].filter(Boolean).map(String).join(" · ") || undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.newsletterSubscriber.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) =>
      prisma.newsletterSubscriber.findUnique({ where: { id } }),
    count: () => prisma.newsletterSubscriber.count(),
    search: (query, limit) =>
      prisma.newsletterSubscriber.findMany({
        where: { OR: [{ email: { contains: query } }, { name: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Newsletter — /admin/newsletter",
  },
  {
    id: "MediaAsset",
    storage: "mysql",
    prismaModelName: "MediaAsset",
    category: "system",
    displayName: "Media assets",
    adminHref: "/admin/media",
    deploymentNavItemId: "media-library",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { filename?: unknown }).filename ?? row.id),
      subtitle: (row) => String((row as { mimeType?: unknown }).mimeType ?? ""),
    },
    findMany: ({ skip, take }) =>
      prisma.mediaAsset.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
    findUnique: (id) =>
      prisma.mediaAsset.findUnique({ where: { id } }),
    count: () => prisma.mediaAsset.count(),
    search: (query, limit) =>
      prisma.mediaAsset.findMany({
        where: { OR: [{ filename: { contains: query } }, { url: { contains: query } }] },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    note: "Media library",
  },
  {
    id: "User",
    storage: "mysql",
    prismaModelName: "User",
    category: "system",
    displayName: "Users",
    adminHref: "/admin/users",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { name?: unknown }).name ?? (row as { email?: unknown }).email ?? row.id),
      subtitle: (row) => String((row as { email?: unknown }).email ?? ""),
    },
    // passwordHash is excluded from all projections for security.
    findMany: ({ skip, take }) =>
      prisma.user.findMany({
        skip, take,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, email: true, name: true, role: true,
          phone: true, city: true, country: true,
          marketingOptIn: true, createdAt: true, updatedAt: true,
        },
      }),
    findUnique: (id) =>
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true, email: true, name: true, role: true,
          phone: true, city: true, country: true, state: true,
          postalCode: true, addressLine1: true, addressLine2: true,
          marketingOptIn: true, createdAt: true, updatedAt: true,
        },
      }),
    count: () => prisma.user.count(),
    search: (query, limit) =>
      prisma.user.findMany({
        where: { OR: [{ email: { contains: query } }, { name: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true,
        },
      }),
    note: "Auth — edit via admin users only",
  },
  {
    id: "Product",
    storage: "mysql",
    prismaModelName: "Product",
    category: "catalog",
    displayName: "Products",
    adminHref: "/admin/products",
    deploymentNavItemId: "products",
    capabilities: { count: true, browse: true, inspect: true, edit: false, export: false },
    list: {
      title: (row) => String((row as { canonicalSlug?: unknown }).canonicalSlug ?? row.id),
      subtitle: (row) => {
        const r = row as { brand?: unknown; status?: unknown };
        return [r.brand, r.status].filter(Boolean).map(String).join(" · ") || undefined as unknown as string;
      },
    },
    findMany: ({ skip, take }) =>
      prisma.product.findMany({ skip, take, orderBy: { updatedAt: "desc" } }),
    findUnique: (id) =>
      prisma.product.findUnique({ where: { id } }),
    count: () => prisma.product.count(),
    search: (query, limit) =>
      prisma.product.findMany({
        where: { OR: [{ canonicalSlug: { contains: query } }, { brand: { contains: query } }] },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
    note: "Catalog products — /admin/products",
  },
];

// ---------------------------------------------------------------------------
// MySQL count-only sources (Overview only, not browsable)
// ---------------------------------------------------------------------------

const MYSQL_COUNT_ONLY: DataSourceDefinition[] = [
  {
    id: "SearchDocument",
    storage: "mysql",
    prismaModelName: "SearchDocument",
    category: "system",
    displayName: "Search documents",
    capabilities: { count: true, browse: false, inspect: false, edit: false, export: false },
    count: () => prisma.searchDocument.count(),
    note: "Search index",
  },
  {
    id: "FormTemplate",
    storage: "mysql",
    prismaModelName: "FormTemplate",
    category: "marketing",
    displayName: "Form templates",
    adminHref: "/admin/forms",
    deploymentNavItemId: "form-templates",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Conversion forms — /admin/forms",
  },
  {
    id: "Booking",
    storage: "mysql",
    prismaModelName: "Booking",
    category: "marketing",
    displayName: "Bookings",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "FK to user + content item",
  },
  {
    id: "SiteTheme",
    storage: "mysql",
    prismaModelName: "SiteTheme",
    category: "system",
    displayName: "Site theme",
    adminHref: "/admin/theme",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Theme SQL — /admin/theme",
  },
  {
    id: "SeoMeta",
    storage: "mysql",
    prismaModelName: "SeoMeta",
    category: "seo",
    displayName: "SEO meta",
    adminHref: "/admin/seo",
    deploymentNavItemId: "seo",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "SEO — /admin/seo",
  },
  {
    id: "SeoRedirect",
    storage: "mysql",
    prismaModelName: "SeoRedirect",
    category: "seo",
    displayName: "SEO redirects",
    deploymentNavItemId: "seo",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Redirects",
  },
  {
    id: "CompanyInfo",
    storage: "mysql",
    prismaModelName: "CompanyInfo",
    category: "system",
    displayName: "Company info",
    adminHref: "/admin/company",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Singleton settings row",
  },
  {
    id: "SiteSettings",
    storage: "mysql",
    prismaModelName: "SiteSettings",
    category: "system",
    displayName: "Site settings",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Per-locale site config payload",
  },
  {
    id: "SearchAnalyticsSnapshot",
    storage: "mysql",
    prismaModelName: "SearchAnalyticsSnapshot",
    category: "seo",
    displayName: "Search analytics snapshots",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Per-locale search analytics",
  },
  {
    id: "CatalogCollection",
    storage: "mysql",
    prismaModelName: "CatalogCollection",
    category: "catalog",
    displayName: "Catalog collections",
    deploymentNavItemId: "collections",
    capabilities: { count: false, browse: false, inspect: false, edit: false, export: false },
    note: "Catalog collections",
  },
];

// ---------------------------------------------------------------------------
// JSON store sources
// ---------------------------------------------------------------------------

const JSON_SOURCES: DataSourceDefinition[] = [
  {
    id: "json:block-presets",
    storage: "json-store",
    namespace: "block-presets",
    category: "content",
    displayName: "Block presets",
    description: "Reusable builder block presets",
    jsonCategory: "builder",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:block-templates",
    storage: "json-store",
    namespace: "block-templates",
    category: "content",
    displayName: "Block templates",
    description: "Full page block templates",
    jsonCategory: "builder",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:page-cache",
    storage: "json-store",
    namespace: "page-cache",
    category: "system",
    displayName: "Page cache",
    description: "Cached published CMS page payloads",
    jsonCategory: "cache",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:theme-presets",
    storage: "json-store",
    namespace: "theme-presets",
    category: "system",
    displayName: "Theme presets",
    description: "Theme preset tokens (draft copies)",
    jsonCategory: "theme",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:catalog-display-defaults",
    storage: "json-store",
    namespace: "catalog-display-defaults",
    category: "catalog",
    displayName: "Catalog display defaults",
    description: "Default card display settings for catalog blocks",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:catalog-collections",
    storage: "json-store",
    namespace: "catalog-collections",
    category: "catalog",
    displayName: "Catalog collections",
    description: "Product catalog collections overlay (serverless / read-only FS)",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:catalog-products",
    storage: "json-store",
    namespace: "catalog-products",
    category: "catalog",
    displayName: "Catalog products overlay",
    description: "Product JSON overlay for serverless / read-only filesystem deployments",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:catalog-media",
    storage: "json-store",
    namespace: "catalog-media",
    category: "catalog",
    displayName: "Catalog media overlay",
    description: "Site media metadata and tombstones for serverless deployments",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:catalog-collections-sync-report",
    storage: "json-store",
    namespace: "catalog-collections-sync-report",
    category: "catalog",
    displayName: "Catalog collections sync report",
    description: "Last collection sync report for admin product counts",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:settings",
    storage: "json-store",
    namespace: "settings",
    category: "system",
    displayName: "App settings",
    description: "Low-priority site settings key-value store",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:site-settings",
    storage: "json-store",
    namespace: "site-settings",
    category: "system",
    displayName: "Site settings overlay",
    description: "Vercel/serverless patches merged over bundled site.json",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:seo-global",
    storage: "json-store",
    namespace: "seo-global",
    category: "seo",
    displayName: "SEO global",
    description: "Robots.txt and global SEO config",
    jsonCategory: "seo",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:seo-structured",
    storage: "json-store",
    namespace: "seo-structured",
    category: "seo",
    displayName: "SEO structured data",
    description: "Global JSON-LD schemas",
    jsonCategory: "seo",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:header-workspace",
    storage: "json-store",
    namespace: "header-workspace",
    category: "system",
    displayName: "Header workspace",
    description: "Header builder menus and branding",
    jsonCategory: "navigation",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:footer-workspace",
    storage: "json-store",
    namespace: "footer-workspace",
    category: "system",
    displayName: "Footer workspace",
    description: "Footer builder columns and layout",
    jsonCategory: "navigation",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:personalization",
    storage: "json-store",
    namespace: "personalization",
    category: "system",
    displayName: "Personalization",
    description: "Visitor preset panel settings",
    jsonCategory: "theme",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:whatsapp",
    storage: "json-store",
    namespace: "whatsapp",
    category: "marketing",
    displayName: "WhatsApp",
    description: "Floating button and page button appearance settings",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:account",
    storage: "json-store",
    namespace: "account",
    category: "system",
    displayName: "Account",
    description: "Password reset email templates and visitor account settings",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:preview-tokens",
    storage: "json-store",
    namespace: "preview-tokens",
    category: "content",
    displayName: "Preview tokens",
    description: "CMS draft preview tokens",
    jsonCategory: "cms",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:demo-profiles",
    storage: "json-store",
    namespace: "demo-profiles",
    category: "system",
    displayName: "Demo profiles",
    description: "Custom demo website profile bundles",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:search-analytics",
    storage: "json-store",
    namespace: "search-analytics",
    category: "seo",
    displayName: "Search analytics",
    description: "Aggregated search metrics snapshot (legacy JsonStore bridge)",
    jsonCategory: "settings",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
  {
    id: "json:search-index-jobs",
    storage: "json-store",
    namespace: "search-index-jobs",
    category: "system",
    displayName: "Search index jobs",
    description: "Queued async search indexing jobs for CMS/content saves",
    jsonCategory: "cache",
    capabilities: { count: true, browse: true, inspect: true, edit: true, export: true },
  },
];

// ---------------------------------------------------------------------------
// Combined registry
// ---------------------------------------------------------------------------

export const DATA_SOURCES: DataSourceDefinition[] = [
  ...MYSQL_SOURCES,
  ...MYSQL_COUNT_ONLY,
  ...JSON_SOURCES,
];

/** Look up a source by id. */
export function getDataSource(id: string): DataSourceDefinition | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}

/** All MySQL sources with browse capability (equivalent of old BROWSABLE_TABLES). */
export const BROWSABLE_SOURCES = DATA_SOURCES.filter(
  (s) => s.storage === "mysql" && s.capabilities.browse
);

/** All JSON store sources (equivalent of old JSON_NAMESPACES). */
export const JSON_STORE_SOURCES = DATA_SOURCES.filter(
  (s) => s.storage === "json-store"
);

/** Sources that contribute to Overview counts. */
export const COUNTED_SOURCES = DATA_SOURCES.filter(
  (s) => s.capabilities.count && s.count
);
