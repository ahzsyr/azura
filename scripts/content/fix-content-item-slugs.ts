/**
 * Normalize ContentItem.slug values that were stored with leading "/" characters
 * or with the ContentType.routePrefix prepended (e.g. "services/my-service" → "my-service").
 *
 * Run: npx tsx scripts/content/fix-content-item-slugs.ts
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeSlug(raw: string, routePrefix: string | null): string {
  let slug = raw.trim();
  // Strip leading slashes
  slug = slug.replace(/^\/+/, "");
  // Strip routePrefix/ prefix if present
  if (routePrefix) {
    const cleanPrefix = routePrefix.replace(/^\/+|\/+$/g, "");
    const prefixPattern = new RegExp(`^${cleanPrefix}/`);
    slug = slug.replace(prefixPattern, "");
  }
  return slug;
}

async function main() {
  console.log("Content item slug normalizer\n");

  const types = await prisma.contentType.findMany({
    select: { id: true, slug: true, routePrefix: true },
  });

  let total = 0;
  let fixed = 0;

  for (const type of types) {
    const items = await prisma.contentItem.findMany({
      where: { contentTypeId: type.id, slug: { not: null }, deletedAt: null },
      select: { id: true, slug: true },
    });

    for (const item of items) {
      if (!item.slug) continue;
      total++;

      const clean = normalizeSlug(item.slug, type.routePrefix);
      if (clean === item.slug) continue;

      console.log(
        `[${type.slug}] "${item.slug}" → "${clean}"  (id: ${item.id})`,
      );

      await prisma.contentItem.update({
        where: { id: item.id },
        data: { slug: clean },
      });
      fixed++;
    }
  }

  console.log(`\nDone. Checked ${total} slugs, fixed ${fixed}.`);
  if (fixed === 0) {
    console.log("All slugs are already clean.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
