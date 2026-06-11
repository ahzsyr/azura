import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const constantsPath = join(__dirname, "../src/features/storage/constants.ts");
const constantsSrc = readFileSync(constantsPath, "utf8");
const accountAllowed = /^\s*account:\s*\{/m.test(constantsSrc);

const prisma = new PrismaClient();

try {
  if (!accountAllowed) {
    throw new Error("account namespace missing from constants.ts");
  }
  console.log("namespace-account-ok");

  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });
  console.log("users-list-ok", users.length);

  const row = await prisma.jsonStore.findUnique({
    where: { namespace_key: { namespace: "account", key: "settings" } },
  });
  console.log("account-json-ok", row === null || row.data != null);

  console.log("all-checks-passed");
} catch (e) {
  console.error("FAIL", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
