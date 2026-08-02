import { prisma } from "@/lib/prisma";
import { jsonStoreProvider } from "../services/json-store-provider";
import type { DiagnosticCheck, DiagnosticResult } from "./types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeResult(
  checkId: string,
  overrides: Partial<DiagnosticResult>,
  start: number
): DiagnosticResult {
  return {
    checkId,
    status: "pass",
    message: "All clear",
    count: 0,
    durationMs: Date.now() - start,
    ...overrides,
  };
}

async function safeRun(
  checkId: string,
  fn: (start: number) => Promise<DiagnosticResult>
): Promise<DiagnosticResult> {
  const start = Date.now();
  try {
    return await fn(start);
  } catch (e) {
    return {
      checkId,
      status: "skipped",
      message: `Check failed to run: ${e instanceof Error ? e.message : String(e)}`,
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Integrity checks
// ---------------------------------------------------------------------------

const emptyFaqSets: DiagnosticCheck = {
  id: "empty-faq-sets",
  title: "Empty FAQ sets",
  description: "FAQ sets that have no items attached. These sets will render empty on the frontend.",
  category: "integrity",
  severity: "warning",
  deploymentNavItemId: "faqs",
  run: () =>
    safeRun("empty-faq-sets", async (start) => {
      const empty = await (prisma as unknown as {
        faqSet: {
          findMany: (args: unknown) => Promise<Array<{ id: string; slug: string }>>;
        };
      }).faqSet.findMany({
        where: { items: { none: {} } },
        select: { id: true, slug: true },
      });
      return makeResult(
        "empty-faq-sets",
        empty.length > 0
          ? {
              status: "warn",
              message: `${empty.length} FAQ set${empty.length !== 1 ? "s" : ""} have no items`,
              count: empty.length,
              items: empty.slice(0, 10).map((s) => ({
                id: s.id,
                label: s.slug,
                href: "/admin/faqs",
              })),
            }
          : { status: "pass", message: "All FAQ sets have items" },
        start
      );
    }),
};

const emptyGalleries: DiagnosticCheck = {
  id: "empty-galleries",
  title: "Empty galleries",
  description: "Published galleries with no media attached.",
  category: "integrity",
  severity: "warning",
  deploymentNavItemId: "gallery",
  run: () =>
    safeRun("empty-galleries", async (start) => {
      const empty = await (prisma as unknown as {
        gallery: {
          findMany: (args: unknown) => Promise<Array<{ id: string; slug: string }>>;
        };
      }).gallery.findMany({
        where: { isPublished: true, media: { none: {} } },
        select: { id: true, slug: true },
      });
      return makeResult(
        "empty-galleries",
        empty.length > 0
          ? {
              status: "warn",
              message: `${empty.length} published galerie${empty.length !== 1 ? "s" : ""} have no media`,
              count: empty.length,
              items: empty.slice(0, 10).map((g) => ({
                id: g.id,
                label: g.slug,
                href: "/admin/gallery",
              })),
            }
          : { status: "pass", message: "All published galleries have media" },
        start
      );
    }),
};

const emptyCollections: DiagnosticCheck = {
  id: "empty-collections",
  title: "Empty content collections",
  description: "Published content collections with no items assigned.",
  category: "integrity",
  severity: "info",
  deploymentNavItemId: "collections",
  run: () =>
    safeRun("empty-collections", async (start) => {
      const empty = await (prisma as unknown as {
        contentCollection: {
          findMany: (args: unknown) => Promise<Array<{ id: string; slug: string }>>;
        };
      }).contentCollection.findMany({
        where: { isPublished: true, items: { none: {} } },
        select: { id: true, slug: true },
      });
      return makeResult(
        "empty-collections",
        empty.length > 0
          ? {
              status: "warn",
              message: `${empty.length} published collection${empty.length !== 1 ? "s" : ""} have no items`,
              count: empty.length,
              items: empty.slice(0, 10).map((c) => ({
                id: c.id,
                label: c.slug,
                href: "/admin/content",
              })),
            }
          : { status: "pass", message: "All published collections have items" },
        start
      );
    }),
};

// ---------------------------------------------------------------------------
// Content checks
// ---------------------------------------------------------------------------

const contentStatusBreakdown: DiagnosticCheck = {
  id: "content-status-breakdown",
  title: "Content item status breakdown",
  description: "Count of content items by status (DRAFT, SCHEDULED, ARCHIVED). Large numbers may indicate stale content.",
  category: "content",
  severity: "info",
  deploymentNavItemId: "content-types",
  run: () =>
    safeRun("content-status-breakdown", async (start) => {
      const [draft, scheduled, archived] = await Promise.all([
        (prisma as unknown as { contentItem: { count: (a: unknown) => Promise<number> } }).contentItem.count({ where: { status: "DRAFT" } }),
        (prisma as unknown as { contentItem: { count: (a: unknown) => Promise<number> } }).contentItem.count({ where: { status: "SCHEDULED" } }),
        (prisma as unknown as { contentItem: { count: (a: unknown) => Promise<number> } }).contentItem.count({ where: { status: "ARCHIVED" } }),
      ]);
      const total = draft + scheduled + archived;
      return makeResult(
        "content-status-breakdown",
        {
          status: total > 50 ? "warn" : "pass",
          message: `${draft} draft · ${scheduled} scheduled · ${archived} archived`,
          count: total,
        },
        start
      );
    }),
};

const hiddenFaqItems: DiagnosticCheck = {
  id: "hidden-faq-items",
  title: "Hidden FAQ items",
  description: "FAQ items with isPublished=false. These are invisible on the frontend.",
  category: "content",
  severity: "info",
  deploymentNavItemId: "faqs",
  run: () =>
    safeRun("hidden-faq-items", async (start) => {
      const count = await (prisma as unknown as { faqItem: { count: (a: unknown) => Promise<number> } }).faqItem.count({
        where: { isPublished: false },
      });
      return makeResult(
        "hidden-faq-items",
        count > 0
          ? { status: "pass", message: `${count} hidden FAQ item${count !== 1 ? "s" : ""}`, count }
          : { status: "pass", message: "No hidden FAQ items" },
        start
      );
    }),
};

// ---------------------------------------------------------------------------
// Media checks
// ---------------------------------------------------------------------------

const testimonialsNoImage: DiagnosticCheck = {
  id: "testimonials-no-image",
  title: "Testimonials without image",
  description: "Published testimonials missing an imageUrl. These may render with a placeholder or look broken.",
  category: "media",
  severity: "warning",
  deploymentNavItemId: "testimonials",
  run: () =>
    safeRun("testimonials-no-image", async (start) => {
      const missing = await (prisma as unknown as {
        testimonial: { findMany: (a: unknown) => Promise<Array<{ id: string; name: string }>> };
      }).testimonial.findMany({
        where: { isPublished: true, imageUrl: null },
        select: { id: true, name: true },
      });
      return makeResult(
        "testimonials-no-image",
        missing.length > 0
          ? {
              status: "warn",
              message: `${missing.length} published testimonial${missing.length !== 1 ? "s" : ""} have no image`,
              count: missing.length,
              items: missing.slice(0, 10).map((t) => ({
                id: t.id,
                label: t.name,
                href: "/admin/testimonials",
              })),
            }
          : { status: "pass", message: "All published testimonials have images" },
        start
      );
    }),
};

const galleriesNoCover: DiagnosticCheck = {
  id: "galleries-no-cover",
  title: "Galleries without cover image",
  description: "Published galleries missing a coverUrl. The listing page may show a broken image.",
  category: "media",
  severity: "warning",
  deploymentNavItemId: "gallery",
  run: () =>
    safeRun("galleries-no-cover", async (start) => {
      const missing = await (prisma as unknown as {
        gallery: { findMany: (a: unknown) => Promise<Array<{ id: string; slug: string }>> };
      }).gallery.findMany({
        where: { isPublished: true, coverUrl: null },
        select: { id: true, slug: true },
      });
      return makeResult(
        "galleries-no-cover",
        missing.length > 0
          ? {
              status: "warn",
              message: `${missing.length} published galerie${missing.length !== 1 ? "s" : ""} have no cover image`,
              count: missing.length,
              items: missing.slice(0, 10).map((g) => ({
                id: g.id,
                label: g.slug,
                href: "/admin/gallery",
              })),
            }
          : { status: "pass", message: "All published galleries have a cover image" },
        start
      );
    }),
};

// ---------------------------------------------------------------------------
// Config checks
// ---------------------------------------------------------------------------

const emptyJsonNamespaces: DiagnosticCheck = {
  id: "empty-json-namespaces",
  title: "Empty JSON namespaces",
  description: "JSON store namespaces with zero records. May indicate un-initialized configuration.",
  category: "config",
  severity: "info",
  run: () =>
    safeRun("empty-json-namespaces", async (start) => {
      const counts = await jsonStoreProvider.getNamespaceCounts();
      const empty = counts.filter((n) => n.count === 0);
      return makeResult(
        "empty-json-namespaces",
        empty.length > 0
          ? {
              status: "warn",
              message: `${empty.length} namespace${empty.length !== 1 ? "s" : ""} have no records: ${empty.map((n) => n.namespace).join(", ")}`,
              count: empty.length,
              items: empty.slice(0, 10).map((n) => ({
                id: n.namespace,
                label: n.namespace,
                href: "/admin/database",
              })),
            }
          : { status: "pass", message: "All JSON namespaces are populated" },
        start
      );
    }),
};

const jsonStoreSize: DiagnosticCheck = {
  id: "json-store-size",
  title: "JSON store total size",
  description: "Total number of records in the JSON store. Useful as a baseline health indicator.",
  category: "config",
  severity: "info",
  run: () =>
    safeRun("json-store-size", async (start) => {
      const total = await jsonStoreProvider.getTotalCount();
      return makeResult(
        "json-store-size",
        { status: "pass", message: `${total} total JSON store record${total !== 1 ? "s" : ""}`, count: total },
        start
      );
    }),
};

// ---------------------------------------------------------------------------
// Content integrity checks (Phase 4)
// ---------------------------------------------------------------------------

const duplicateContentSlugs: DiagnosticCheck = {
  id: "duplicate-content-slugs",
  title: "Duplicate content item slugs",
  description:
    "ContentItem records sharing the same slug within the same content type. Duplicates will cause routing conflicts.",
  category: "integrity",
  severity: "error",
  deploymentNavItemId: "content-types",
  run: () =>
    safeRun("duplicate-content-slugs", async (start) => {
      const items = await (prisma as unknown as {
        contentItem: {
          findMany: (a: unknown) => Promise<Array<{ id: string; slug: string; contentTypeId: string }>>;
        };
      }).contentItem.findMany({
        select: { id: true, slug: true, contentTypeId: true },
      });

      const groups = new Map<string, string[]>();
      for (const item of items) {
        const key = `${item.contentTypeId}::${item.slug}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item.id);
      }
      const duplicateIds = Array.from(groups.values())
        .filter((ids) => ids.length > 1)
        .flat();

      return makeResult(
        "duplicate-content-slugs",
        duplicateIds.length > 0
          ? {
              status: "fail",
              message: `${duplicateIds.length} content item${duplicateIds.length !== 1 ? "s" : ""} share duplicate slugs`,
              count: duplicateIds.length,
              items: duplicateIds.slice(0, 10).map((id) => ({
                id,
                label: id,
                href: "/admin/content",
              })),
            }
          : { status: "pass", message: "No duplicate content item slugs" },
        start
      );
    }),
};

const duplicatePageSlugs: DiagnosticCheck = {
  id: "duplicate-page-slugs",
  title: "Duplicate CMS page slugs",
  description: "CmsPage records sharing the same slug. Will cause 404s or routing ambiguity.",
  category: "integrity",
  severity: "error",
  deploymentNavItemId: "pages",
  run: () =>
    safeRun("duplicate-page-slugs", async (start) => {
      const pages = await (prisma as unknown as {
        cmsPage: { findMany: (a: unknown) => Promise<Array<{ id: string; slug: string }>> };
      }).cmsPage.findMany({ select: { id: true, slug: true } });

      const slugMap = new Map<string, string[]>();
      for (const page of pages) {
        if (!slugMap.has(page.slug)) slugMap.set(page.slug, []);
        slugMap.get(page.slug)!.push(page.id);
      }
      const dups = Array.from(slugMap.entries()).filter(([, ids]) => ids.length > 1);
      const dupIds = dups.flatMap(([, ids]) => ids);

      return makeResult(
        "duplicate-page-slugs",
        dupIds.length > 0
          ? {
              status: "fail",
              message: `${dups.length} slug${dups.length !== 1 ? "s" : ""} used by ${dupIds.length} pages`,
              count: dupIds.length,
              items: dups.slice(0, 10).map(([slug, ids]) => ({
                id: ids[0],
                label: slug,
                href: "/admin/pages",
              })),
            }
          : { status: "pass", message: "No duplicate CMS page slugs" },
        start
      );
    }),
};

const staleFormSubmissions: DiagnosticCheck = {
  id: "stale-form-submissions",
  title: "Stale unread form submissions",
  description: "Form submissions with status NEW that are older than 7 days and have not been reviewed.",
  category: "content",
  severity: "warning",
  deploymentNavItemId: "form-submissions",
  run: () =>
    safeRun("stale-form-submissions", async (start) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const count = await (prisma as unknown as {
        formSubmission: { count: (a: unknown) => Promise<number> };
      }).formSubmission.count({
        where: { status: "NEW", createdAt: { lt: sevenDaysAgo } },
      });
      return makeResult(
        "stale-form-submissions",
        count > 0
          ? {
              status: "warn",
              message: `${count} form submission${count !== 1 ? "s" : ""} unread for more than 7 days`,
              count,
              items: [{ id: "stale", label: `${count} stale submissions`, href: "/admin/form-submissions" }],
            }
          : { status: "pass", message: "No stale unread form submissions" },
        start
      );
    }),
};

const highDraftRatio: DiagnosticCheck = {
  id: "high-draft-ratio",
  title: "High content draft ratio",
  description:
    "More than 40% of all content items are in DRAFT status. Indicates content may not be properly reviewed and published.",
  category: "content",
  severity: "warning",
  deploymentNavItemId: "content-types",
  run: () =>
    safeRun("high-draft-ratio", async (start) => {
      const p = prisma as unknown as { contentItem: { count: (a: unknown) => Promise<number> } };
      const [total, draft] = await Promise.all([
        p.contentItem.count({}),
        p.contentItem.count({ where: { status: "DRAFT" } }),
      ]);
      const ratio = total > 0 ? draft / total : 0;
      const pct = Math.round(ratio * 100);
      return makeResult(
        "high-draft-ratio",
        ratio > 0.4
          ? {
              status: "warn",
              message: `${pct}% of content items are DRAFT (${draft} of ${total})`,
              count: draft,
            }
          : {
              status: "pass",
              message: `Draft ratio is ${pct}% (${draft} of ${total} items)`,
              count: draft,
            },
        start
      );
    }),
};

// ---------------------------------------------------------------------------
// Export: ordered registry
// ---------------------------------------------------------------------------

export const DIAGNOSTIC_CHECKS: DiagnosticCheck[] = [
  // integrity
  emptyFaqSets,
  emptyGalleries,
  emptyCollections,
  duplicateContentSlugs,
  duplicatePageSlugs,
  // content
  contentStatusBreakdown,
  hiddenFaqItems,
  staleFormSubmissions,
  highDraftRatio,
  // media
  testimonialsNoImage,
  galleriesNoCover,
  // config
  emptyJsonNamespaces,
  jsonStoreSize,
];
