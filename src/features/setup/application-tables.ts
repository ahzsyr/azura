export const PRISMA_MIGRATIONS_TABLE = "_prisma_migrations";

const IDENTIFIER = /^[A-Za-z0-9_]+$/;

export function isSafeMysqlIdentifier(name: string): boolean {
  return IDENTIFIER.test(name);
}

/** Backtick-quote a table or column name. Rejects anything that is not a plain identifier. */
export function quoteMysqlIdentifier(name: string): string {
  if (!isSafeMysqlIdentifier(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

/** Application tables only. Migration history is preserved so the schema stays deployable. */
export function filterApplicationTables(names: readonly string[]): string[] {
  return names.filter((name) => name !== PRISMA_MIGRATIONS_TABLE && isSafeMysqlIdentifier(name));
}

export function readSqlName(row: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(key.toLowerCase()) && typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

/**
 * MySQL error 1701: TRUNCATE is rejected when another table has a foreign key
 * to this one, even with FOREIGN_KEY_CHECKS disabled. DELETE clears the rows.
 */
export function buildTruncateStatements(tables: readonly string[]): string[] {
  return filterApplicationTables(tables).map((table) => `DELETE FROM ${quoteMysqlIdentifier(table)}`);
}

export function escapeMysqlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u001a/g, "\\Z")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function formatMysqlDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/** SQL literal for a Prisma raw cell. */
export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${formatMysqlDateTime(value)}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (typeof value === "object") {
    const named = value as { constructor?: { name?: string }; toString?: () => string };
    if (named.constructor?.name === "Decimal" && typeof named.toString === "function") {
      return named.toString();
    }
    return `'${escapeMysqlString(JSON.stringify(value))}'`;
  }
  return `'${escapeMysqlString(String(value))}'`;
}

export function buildInsertStatement(
  table: string,
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): string {
  const quotedTable = quoteMysqlIdentifier(table);
  const quotedColumns = columns.map((column) => quoteMysqlIdentifier(column)).join(", ");
  const values = rows
    .map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(", ")})`)
    .join(",\n");
  return `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES\n${values};`;
}

const LIST_TABLES_SQL =
  "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'";

export async function listApplicationTableNames(
  query: (sql: string) => Promise<ReadonlyArray<Record<string, unknown>>>,
): Promise<string[]> {
  const rows = await query(LIST_TABLES_SQL);
  const names = rows
    .map((row) => readSqlName(row, ["tableName", "TABLE_NAME"]))
    .filter((name): name is string => Boolean(name));
  return filterApplicationTables(names);
}

export async function truncateApplicationTables(db: {
  query: (sql: string) => Promise<ReadonlyArray<Record<string, unknown>>>;
  execute: (sql: string) => Promise<unknown>;
}): Promise<void> {
  const statements = buildTruncateStatements(await listApplicationTableNames(db.query));
  await db.execute("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const statement of statements) {
      await db.execute(statement);
    }
  } finally {
    await db.execute("SET FOREIGN_KEY_CHECKS = 1");
  }
}
