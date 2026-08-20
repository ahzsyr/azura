import { PrismaClient } from "@prisma/client";

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
  console.log("Content platform verification\n");

  const types = await prisma.contentType.findMany({ where: { isEnabled: true } });
  if (types.length === 0) {
    err("No enabled ContentType rows — run seed or ensureBuiltinContentTypes");
  }

  const duplicateSlugs = await prisma.$queryRaw<{ contentTypeId: string; slug: string; c: bigint }[]>`
    SELECT contentTypeId, slug, COUNT(*) as c
    FROM ContentItem
    WHERE slug IS NOT NULL AND deletedAt IS NULL
    GROUP BY contentTypeId, slug
    HAVING c > 1
  `;
  if (duplicateSlugs.length > 0) {
    err(`Duplicate slugs found: ${duplicateSlugs.length} groups`);
  }

  for (const type of types) {
    const published = await prisma.contentItem.count({
      where: { contentTypeId: type.id, deletedAt: null, status: "PUBLISHED", isVisible: true },
    });
    console.log(`  ${type.slug}: ${published} published items`);
    if (type.routePrefix) {
      const conflict = types.find(
        (t) => t.id !== type.id && t.routePrefix === type.routePrefix && t.isEnabled
      );
      if (conflict) {
        warn(`Shared routePrefix "${type.routePrefix}" on ${type.slug} and ${conflict.slug}`);
      }
    }
  }

  const orphaned = await prisma.contentItem.count({
    where: {
      deletedAt: null,
      slug: { not: null },
      NOT: { contentType: { isEnabled: true } },
    },
  });
  if (orphaned > 0) {
    warn(`${orphaned} items belong to disabled content types`);
  }

  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN ";
    console.log(`${prefix}: ${issue.message}`);
  }

  const errors = issues.filter((i) => i.level === "error").length;
  console.log(`\nDone: ${errors} error(s), ${issues.length - errors} warning(s)`);
  if (errors > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
