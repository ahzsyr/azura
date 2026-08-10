/**
 * Ensures FaqSet.coverUrl exists (TEXT) when migrate deploy is blocked or behind.
 * Run: node scripts/apply-faq-set-cover-url.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isPostgres() {
  const url = process.env.DATABASE_URL ?? "";
  return /postgres/i.test(url);
}

async function mysqlColumnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function postgresColumnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    table,
    column
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function main() {
  if (isPostgres()) {
    if (await postgresColumnExists("FaqSet", "coverUrl")) {
      console.log("FaqSet.coverUrl already exists (postgres)");
      return;
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE "FaqSet" ADD COLUMN "coverUrl" TEXT`);
    console.log("Added FaqSet.coverUrl (postgres TEXT)");
    return;
  }

  if (!(await mysqlColumnExists("FaqSet", "coverUrl"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` ADD COLUMN \`coverUrl\` TEXT NULL`);
    console.log("Added FaqSet.coverUrl (mysql TEXT)");
    return;
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE \`FaqSet\` MODIFY \`coverUrl\` TEXT NULL`);
  console.log("Ensured FaqSet.coverUrl is TEXT (mysql)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
