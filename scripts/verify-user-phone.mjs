import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.user.findMany({
  where: { role: "CUSTOMER" },
  take: 1,
  select: { id: true, phone: true, city: true },
});
console.log("verify-ok", rows.length);
await prisma.$disconnect();
