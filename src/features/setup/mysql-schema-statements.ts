/** Split a MySQL schema script into single statements the app can run one at a time. */
export function mysqlSchemaStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) =>
      statement.replace(/^CREATE TABLE (?!IF NOT EXISTS\b)/i, "CREATE TABLE IF NOT EXISTS "),
    );
}

export function isIgnorableMysqlSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|Duplicate foreign key|Duplicate key name|Duplicate column name|errno:\s*(1050|1060|1061|1022|1826)\b/i.test(
    message,
  );
}
