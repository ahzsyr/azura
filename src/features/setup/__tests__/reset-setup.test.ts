import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import {
  buildTruncateStatements,
  filterApplicationTables,
  quoteMysqlIdentifier,
  sqlLiteral,
  truncateApplicationTables,
} from "@/features/setup/application-tables";
import { RESET_SYSTEM_SETTINGS } from "@/features/setup/reset-setup.constants";
import { sanitizeZipEntryName, StoreZipWriter } from "@/features/setup/store-zip";

test("filterApplicationTables skips migrations and unsafe names", () => {
  assert.deepEqual(
    filterApplicationTables(["User", "_prisma_migrations", "CmsPage", "bad-name", "JsonStore"]),
    ["User", "CmsPage", "JsonStore"],
  );
});

test("quoteMysqlIdentifier backticks safe names and rejects others", () => {
  assert.equal(quoteMysqlIdentifier("CmsPage"), "`CmsPage`");
  assert.throws(() => quoteMysqlIdentifier("Cms Page"), /Unsafe SQL identifier/);
});

test("buildTruncateStatements quotes application tables only", () => {
  assert.deepEqual(buildTruncateStatements(["User", "_prisma_migrations", "CmsPage"]), [
    "TRUNCATE TABLE `User`",
    "TRUNCATE TABLE `CmsPage`",
  ]);
});

test("sqlLiteral escapes quotes and encodes buffers", () => {
  assert.equal(sqlLiteral(null), "NULL");
  assert.equal(sqlLiteral("a'b"), "'a\\'b'");
  assert.equal(sqlLiteral(Buffer.from([0x0a, 0xff])), "X'0aff'");
});

test("truncateApplicationTables disables foreign keys and skips migrations", async () => {
  const executed: string[] = [];
  await truncateApplicationTables({
    async query() {
      return [{ tableName: "User" }, { TABLE_NAME: "_prisma_migrations" }, { tableName: "JsonStore" }];
    },
    async execute(sql) {
      executed.push(sql);
    },
  });
  assert.deepEqual(executed, [
    "SET FOREIGN_KEY_CHECKS = 0",
    "TRUNCATE TABLE `User`",
    "TRUNCATE TABLE `JsonStore`",
    "SET FOREIGN_KEY_CHECKS = 1",
  ]);
});

test("reset settings leave setup incomplete and show coming soon", () => {
  assert.equal(RESET_SYSTEM_SETTINGS.setupComplete, false);
  assert.equal(RESET_SYSTEM_SETTINGS.comingSoonEnabled, true);
  assert.equal(RESET_SYSTEM_SETTINGS.registrationEnabled, true);
});

test("sanitizeZipEntryName drops parent segments", () => {
  assert.equal(sanitizeZipEntryName("media/../database.sql"), "media/database.sql");
  assert.throws(() => sanitizeZipEntryName("../"), /Invalid zip entry name/);
});

test("StoreZipWriter writes a local file header for the entry name", async () => {
  const dir = await mkdtemp(join(tmpdir(), "azura-zip-"));
  try {
    const filePath = join(dir, "note.txt");
    await writeFile(filePath, "hello", "utf8");
    const pass = new PassThrough();
    const chunks: Buffer[] = [];
    pass.on("data", (chunk: Buffer) => chunks.push(chunk));
    const zip = new StoreZipWriter(pass);
    await zip.addFile("media/note.txt", filePath);
    await zip.finish();
    const archive = Buffer.concat(chunks);
    assert.equal(archive.readUInt32LE(0), 0x04034b50);
    assert.ok(archive.includes(Buffer.from("media/note.txt")));
    assert.ok(archive.includes(Buffer.from("hello")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
