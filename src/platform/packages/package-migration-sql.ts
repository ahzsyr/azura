/**
 * Pure SQL helpers for package migrations (no Prisma / server-only).
 */

/** Pair `001.down.sql` → `001.up.sql`. */
export function upFilenameForDown(downFilename: string): string {
  return downFilename.replace(/\.down\.sql$/, ".up.sql");
}

export function sqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith("--"));
}
