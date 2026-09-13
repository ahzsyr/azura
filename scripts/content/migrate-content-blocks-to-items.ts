/**
 * Migrate block-builder page content from linked CmsPages into ContentItem.blocks.
 *
 * For "offerings" (Services):
 *   Each item may have attributes.ctaHref pointing to a CmsPage slug.
 *   This script copies that CmsPage.blocks → ContentItem.blocks
 *   (only when ContentItem.blocks is currently empty []).
 *
 * For "listings" (Properties):
 *   All items currently share the single "hotels-transport" CmsPage.
 *   Each listing gets an empty blocks array (clean slate for per-item content).
 *
 * Run: npx tsx scripts/content/migrate-content-blocks-to-items.ts
 * Idempotent — skips items that already have non-empty blocks.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("http")) return null;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // The wired slugs map — inline copy to avoid importing app code
  const WIRED: Record<string, string> = {
    "smart-home": "/smart-home",
    "security-solutions": "/security-solutions",
    "enterprise-wireless": "/enterprise-wireless",
    "why-choose-us": "/why-choose-us",
    services: "/services",
  };
  const matched = Object.entries(WIRED).find(([, v]) => v === path);
  if (matched) return matched[0];
  const segment = path.replace(/^\//, "").split("/")[0];
  return segment && segment in WIRED ? segment : segment || null;
}

function isEmptyBlocks(raw: unknown): boolean {
  if (!raw) return true;
  if (Array.isArray(raw)) return raw.length === 0;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length === 0;
    } catch {
      return false;
    }
  }
  return false;
}

async function migrateOfferings() {
  console.log("\n--- Migrating offerings (Services) ---");

  const offeringsType = await prisma.contentType.findUnique({
    where: { slug: "offerings" },
  });
  if (!offeringsType) {
    console.log("  offerings content type not found, skipping.");
    return;
  }

  const items = await prisma.contentItem.findMany({
    where: { contentTypeId: offeringsType.id, deletedAt: null },
    select: { id: true, slug: true, attributes: true, blocks: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const item of items) {
    if (!isEmptyBlocks(item.blocks)) {
      skipped++;
      continue;
    }

    const attrs = (item.attributes ?? {}) as Record<string, unknown>;
    const ctaHref = typeof attrs.ctaHref === "string" ? attrs.ctaHref : null;
    const cmsSlug = slugFromHref(ctaHref);

    if (!cmsSlug) {
      console.log(`  [SKIP] Item ${item.slug ?? item.id} — no ctaHref to resolve`);
      skipped++;
      continue;
    }

    const cmsPage = await prisma.cmsPage.findUnique({
      where: { slug: cmsSlug },
      select: { id: true, slug: true, blocks: true },
    });

    if (!cmsPage) {
      console.log(
        `  [SKIP] Item ${item.slug ?? item.id} — CmsPage "${cmsSlug}" not found`,
      );
      skipped++;
      continue;
    }

    await prisma.contentItem.update({
      where: { id: item.id },
      data: { blocks: cmsPage.blocks ?? [] },
    });

    console.log(
      `  [MIGRATED] ${item.slug ?? item.id} ← CmsPage "${cmsPage.slug}" (${Array.isArray(cmsPage.blocks) ? cmsPage.blocks.length : "?"} blocks)`,
    );
    migrated++;
  }

  console.log(`  Done: ${migrated} migrated, ${skipped} skipped.`);
}

async function migrateListings() {
  console.log("\n--- Migrating listings (Properties) ---");

  const listingsType = await prisma.contentType.findUnique({
    where: { slug: "listings" },
  });
  if (!listingsType) {
    console.log("  listings content type not found, skipping.");
    return;
  }

  const items = await prisma.contentItem.findMany({
    where: { contentTypeId: listingsType.id, deletedAt: null },
    select: { id: true, slug: true, blocks: true },
  });

  let skipped = 0;

  for (const item of items) {
    if (!isEmptyBlocks(item.blocks)) {
      skipped++;
      console.log(
        `  [SKIP] Item ${item.slug ?? item.id} — already has blocks`,
      );
    }
    // Listings get a clean empty slate; no shared page content to copy.
  }

  console.log(
    `  Done: ${items.length - skipped} items ready for per-item blocks, ${skipped} already had blocks.`,
  );
}

async function main() {
  console.log("Content block migration: CmsPage → ContentItem\n");

  await migrateOfferings();
  await migrateListings();

  console.log("\nMigration complete.");
  console.log(
    "Next step: Update code to always use ContentItem.blocks for these types.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
