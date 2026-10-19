/**
 * Regenerate Safar Al-Madina CMS pages, company profile, and sample data.
 * Usage: npm run db:seed-demo-safar
 */
import { createPrismaClient } from "../../src/lib/create-prisma-client";
import { seedSafarWebsite } from "../../prisma/seed-safar-website";

const prisma = createPrismaClient();

async function main() {
  await seedSafarWebsite(prisma);
  console.log("Safar Al-Madina demo website regenerated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
