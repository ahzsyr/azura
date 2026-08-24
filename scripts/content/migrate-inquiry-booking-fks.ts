import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Inquiry/Booking FK migration check…\n");

  const withoutItem = await prisma.inquiry.count({ where: { contentItemId: null, type: { in: ["CONTENT", "PACKAGE"] } } });
  if (withoutItem > 0) {
    console.warn(`${withoutItem} content-related inquiries missing contentItemId`);
  } else {
    console.log("All content inquiries have contentItemId (or none exist).");
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
