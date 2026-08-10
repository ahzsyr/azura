import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.$executeRaw`
    DELETE FROM _prisma_migrations
    WHERE migration_name = '20260531180000_multi_gallery_system'
      AND finished_at IS NULL
      AND rolled_back_at IS NOT NULL
  `;
  console.log(`Removed ${deleted} stale failed migration row(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
