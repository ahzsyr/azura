/**
 * One-time: disable all locales except English on the public site.
 * Run: npx tsx scripts/i18n/disable-non-english-locales.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.localeConfig.updateMany({
    where: { code: { not: "en" } },
    data: { isEnabled: false, isDefault: false },
  });
  await prisma.localeConfig.updateMany({
    where: { code: "en" },
    data: { isEnabled: true, isDefault: true },
  });
  console.log(`Disabled ${result.count} non-English locale(s). English is default and enabled.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
