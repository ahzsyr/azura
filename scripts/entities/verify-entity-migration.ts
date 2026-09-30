#!/usr/bin/env tsx
/**
 * Verify Product → ContentItem migration parity.
 *
 * Usage: npm run entities:verify-migration
 */
import { PrismaClient } from "@prisma/client";
import { PRODUCT_CONTENT_TYPE_SLUG, isMigratedProductItem } from "@/features/entities/migration/metadata";

const prisma = new PrismaClient();

type Issue = { level: "error" | "warn"; message: string };
const issues: Issue[] = [];

function err(message: string) {
  issues.push({ level: "error", message });
}

function warn(message: string) {
  issues.push({ level: "warn", message });
}

async function main() {
  console.log("Entity migration verification\n");

  const productCount = await prisma.product.count();
  const contentType = await prisma.contentType.findUnique({
    where: { slug: PRODUCT_CONTENT_TYPE_SLUG },
  });

  if (!contentType) {
    err(`Missing ContentType: ${PRODUCT_CONTENT_TYPE_SLUG}`);
  } else {
    const items = await prisma.contentItem.findMany({
      where: { contentTypeId: contentType.id, deletedAt: null },
      select: { id: true, slug: true, metadata: true, attributes: true },
    });
    const migrated = items.filter((item) => isMigratedProductItem(item.metadata));

    console.log(`Product rows:              ${productCount}`);
    console.log(`ContentItem (products):    ${items.length}`);
    console.log(`ContentItem (migrated):    ${migrated.length}`);

    if (migrated.length < productCount) {
      warn(`Migrated count (${migrated.length}) < Product count (${productCount})`);
    }

    const productSlugs = new Set(
      (await prisma.product.findMany({ select: { canonicalSlug: true } })).map(
        (row) => row.canonicalSlug,
      ),
    );

    for (const item of migrated) {
      const slug = item.slug?.trim();
      const canonical = (item.metadata as { migration?: { canonicalSlug?: string } })?.migration
        ?.canonicalSlug;
      const checkSlug = slug ?? canonical;
      if (checkSlug && !productSlugs.has(checkSlug)) {
        warn(`Migrated item ${item.id} has no matching Product slug: ${checkSlug}`);
      }
      const attrs = item.attributes as Record<string, unknown>;
      if (!attrs || typeof attrs !== "object") {
        err(`Migrated item ${item.id} missing attributes`);
      }
    }

    const orphanProductTranslations = await prisma.entityTranslation.count({
      where: { entityType: "Product" },
    });
    if (orphanProductTranslations > 0) {
      warn(`${orphanProductTranslations} EntityTranslation rows still on entityType=Product`);
    }
  }

  console.log("\nIssues:");
  if (issues.length === 0) {
    console.log("  none");
  } else {
    for (const issue of issues) {
      console.log(`  [${issue.level}] ${issue.message}`);
    }
  }

  if (issues.some((issue) => issue.level === "error")) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
