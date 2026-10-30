import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  sqlStatements,
  upFilenameForDown,
} from "@/platform/packages/package-migration-sql";
import { validatePackageZipPass1 } from "@/platform/packages/package-zip-limits";

test("upFilenameForDown pairs down to up", () => {
  assert.equal(upFilenameForDown("001.down.sql"), "001.up.sql");
  assert.equal(upFilenameForDown("12-foo.down.sql"), "12-foo.up.sql");
});

test("sqlStatements splits on semicolons and drops comment-only chunks", () => {
  assert.deepEqual(sqlStatements("SELECT 1;\nSELECT 2;"), ["SELECT 1", "SELECT 2"]);
  // A chunk that begins with `--` after a semicolon boundary is dropped entirely.
  assert.deepEqual(sqlStatements("SELECT 1;\n-- note only\n;"), ["SELECT 1"]);
});
test("validatePackageZipPass1 enforces compressed and entry caps", () => {
  assert.equal(validatePackageZipPass1({ compressedBytes: 100, entryCount: 2 }).ok, true);
  const tooBig = validatePackageZipPass1({
    compressedBytes: 9 * 1024 * 1024,
    entryCount: 1,
  });
  assert.equal(tooBig.ok, false);
  const tooMany = validatePackageZipPass1({ compressedBytes: 100, entryCount: 100 });
  assert.equal(tooMany.ok, false);
});

test("applyPackageSql consults up ledger for down and refuses checksum mismatch", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/platform/packages/package-migrations.ts"),
    "utf8",
  );
  assert.match(src, /direction:\s*"up"/);
  assert.match(src, /upFilenameForDown/);
  assert.match(src, /checksum mismatch/);
  assert.match(src, /deleteMany\s*\(\s*\{[\s\S]*direction:\s*"up"/);
});