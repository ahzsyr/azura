import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw<
    { COLUMN_NAME: string; DATA_TYPE: string }[]
  >`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faq' ORDER BY ORDINAL_POSITION`;

  const count = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) as c FROM faq`;
  console.log("faq columns:", cols.map((c) => c.COLUMN_NAME).join(", "));
  console.log("faq row count:", count[0]?.c);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
