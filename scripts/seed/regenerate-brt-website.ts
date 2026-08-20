/**
 * Regenerate BRT CMS pages, company profile, and sample data without full seed.
 * Usage: npm run db:seed-demo-brt
 */
import { PrismaClient } from "@prisma/client";
import { seedBrtWebsite } from "../../prisma/seed-brt-website";

const prisma = new PrismaClient();

async function main() {
  await seedBrtWebsite(prisma);
  console.log("BRT demo website regenerated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
