import test from "node:test";
import assert from "node:assert/strict";
import {
  isIgnorableMysqlSchemaError,
  mysqlSchemaStatements,
} from "@/features/setup/mysql-schema-statements";

test("mysqlSchemaStatements drops comments and makes create idempotent", () => {
  const statements = mysqlSchemaStatements(`
-- header
SET FOREIGN_KEY_CHECKS = 0;
-- CreateTable
CREATE TABLE \`User\` (
    \`id\` VARCHAR(191) NOT NULL,
    PRIMARY KEY (\`id\`)
);
`);
  assert.deepEqual(statements, [
    "SET FOREIGN_KEY_CHECKS = 0",
    "CREATE TABLE IF NOT EXISTS `User` (\n    `id` VARCHAR(191) NOT NULL,\n    PRIMARY KEY (`id`)\n)",
  ]);
});

test("isIgnorableMysqlSchemaError accepts existing tables", () => {
  assert.equal(isIgnorableMysqlSchemaError(new Error("Table 'User' already exists")), true);
  assert.equal(isIgnorableMysqlSchemaError(new Error("Unknown column")), false);
});
