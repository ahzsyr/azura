/**
 * Applies User profile columns + PasswordResetToken when migrate deploy is blocked.
 * Run: node scripts/apply-customer-profile-columns.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const userColumns = [
  ["phone", "VARCHAR(191) NULL"],
  ["dateOfBirth", "DATE NULL"],
  ["addressLine1", "VARCHAR(191) NULL"],
  ["addressLine2", "VARCHAR(191) NULL"],
  ["city", "VARCHAR(191) NULL"],
  ["state", "VARCHAR(191) NULL"],
  ["postalCode", "VARCHAR(191) NULL"],
  ["country", "VARCHAR(191) NULL"],
  ["marketingOptIn", "BOOLEAN NOT NULL DEFAULT false"],
];

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function main() {
  for (const [col, def] of userColumns) {
    if (await columnExists("User", col)) {
      console.log(`User.${col} already exists`);
      continue;
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`User\` ADD COLUMN \`${col}\` ${def}`);
    console.log(`Added User.${col}`);
  }

  const tables = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PasswordResetToken'`
  );
  if (Number(tables[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`PasswordResetToken\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`tokenHash\` VARCHAR(191) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`usedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`PasswordResetToken_userId_idx\`(\`userId\`),
        INDEX \`PasswordResetToken_expiresAt_idx\`(\`expiresAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`PasswordResetToken\` ADD CONSTRAINT \`PasswordResetToken_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log("Created PasswordResetToken");
  } else {
    console.log("PasswordResetToken already exists");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
