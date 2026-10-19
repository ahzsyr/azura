import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMysqlHostOverride,
  getDatabaseUrlProtocol,
  isDatabaseUrlMalformed,
  isHostingerMysqlRemoteHost,
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

test("isHostingerMysqlRemoteHost detects srv*.hstgr.io", () => {
  assert.equal(
    isHostingerMysqlRemoteHost("mysql://u:p@srv1761.hstgr.io:3306/db"),
    true,
  );
  assert.equal(isHostingerMysqlRemoteHost("mysql://u:p@localhost:3306/db"), false);
});

test("applyMysqlHostOverride rewrites Hostinger remote MySQL to localhost by default", () => {
  const previous = process.env.HOSTINGER_MYSQL_LOCALHOST;
  const previousHost = process.env.DATABASE_MYSQL_HOST;
  delete process.env.HOSTINGER_MYSQL_LOCALHOST;
  delete process.env.DATABASE_MYSQL_HOST;
  try {
    const rewritten = applyMysqlHostOverride(
      "mysql://u:p@srv1761.hstgr.io:3306/db",
    );
    assert.match(rewritten, /@localhost(?::3306)?\//);
  } finally {
    if (previous === undefined) delete process.env.HOSTINGER_MYSQL_LOCALHOST;
    else process.env.HOSTINGER_MYSQL_LOCALHOST = previous;
    if (previousHost === undefined) delete process.env.DATABASE_MYSQL_HOST;
    else process.env.DATABASE_MYSQL_HOST = previousHost;
  }
});

test("applyMysqlHostOverride keeps remote host when HOSTINGER_MYSQL_LOCALHOST=0", () => {
  const previous = process.env.HOSTINGER_MYSQL_LOCALHOST;
  const previousHost = process.env.DATABASE_MYSQL_HOST;
  process.env.HOSTINGER_MYSQL_LOCALHOST = "0";
  delete process.env.DATABASE_MYSQL_HOST;
  try {
    const kept = applyMysqlHostOverride("mysql://u:p@srv1761.hstgr.io:3306/db");
    assert.match(kept, /@srv1761\.hstgr\.io/);
  } finally {
    if (previous === undefined) delete process.env.HOSTINGER_MYSQL_LOCALHOST;
    else process.env.HOSTINGER_MYSQL_LOCALHOST = previous;
    if (previousHost === undefined) delete process.env.DATABASE_MYSQL_HOST;
    else process.env.DATABASE_MYSQL_HOST = previousHost;
  }
});
