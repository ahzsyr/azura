import test from "node:test";
import assert from "node:assert/strict";
import {
  getDatabaseUrlProtocol,
  isDatabaseUrlMalformed,
  isMysqlDatabaseUrl,
  sanitizeDatabaseUrl,
} from "@/lib/database-url";

test("sanitizeDatabaseUrl accepts quoted mysql URLs", () => {
  const url = sanitizeDatabaseUrl(
    '"mysql://user:pass@srv1761.hstgr.io:3306/mydb"',
  );
  assert.equal(url, "mysql://user:pass@srv1761.hstgr.io:3306/mydb");
});

test("isDatabaseUrlMalformed accepts mysql URLs", () => {
  assert.equal(
    isDatabaseUrlMalformed("mysql://user:pass@localhost:3306/azura"),
    false,
  );
});

test("isDatabaseUrlMalformed rejects non-database URLs", () => {
  assert.equal(isDatabaseUrlMalformed("not-a-url"), true);
});

test("getDatabaseUrlProtocol detects mysql", () => {
  assert.equal(
    getDatabaseUrlProtocol("mysql://user:pass@localhost:3306/azura"),
    "mysql",
  );
});

test("isMysqlDatabaseUrl is true for mysql scheme", () => {
  assert.equal(isMysqlDatabaseUrl("mysql://user:pass@localhost:3306/azura"), true);
});
