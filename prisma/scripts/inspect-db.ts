import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw<
    { TABLE_NAME: string }[]
  >`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('Gallery', 'GalleryMedia', 'FAQ', 'FaqSet', 'FaqItem') ORDER BY TABLE_NAME`;

  const migrations = await prisma.$queryRaw<
    {
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
      logs: string | null;
    }[]
  >`SELECT migration_name, finished_at, rolled_back_at, LEFT(logs, 200) as logs FROM _prisma_migrations ORDER BY started_at DESC LIMIT 8`;

  console.log("Tables:", tables.map((t) => t.TABLE_NAME).join(", ") || "(none)");
  console.log("\nMigrations:");
  for (const m of migrations) {
    const status = m.finished_at
      ? "applied"
      : m.rolled_back_at
        ? "rolled_back"
        : "FAILED";
    console.log(`  ${m.migration_name}: ${status}`);
    if (m.logs && !m.finished_at) console.log(`    ${m.logs}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
