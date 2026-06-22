#!/usr/bin/env tsx
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { getSeedAdminEmail, getSeedAdminPassword } from "../../src/config/site";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? getSeedAdminEmail();
  const password = process.argv[3] ?? getSeedAdminPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.deleteMany({ where: { role: "ADMIN" } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  const valid = await bcrypt.compare(password, user.passwordHash);
  console.log(`Admin reset: ${user.email} (verified: ${valid})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
