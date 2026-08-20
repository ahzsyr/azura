/**
 * Production DBs can lag the Prisma client (P2022 unknown column).
 * Retry the same query after omitting the missing scalar(s).
 */

const MAX_IDENTIFIER = 64;

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

function isPrismaColumnError(error: unknown): boolean {
  const message = errorText(error);
  const code = (error as { code?: string })?.code;
  return (
    code === "P2022" ||
    /does not exist in the current database/i.test(message) ||
    /Unknown column/i.test(message) ||
    /no such column/i.test(message)
  );
}

function lastIdentifier(raw: string): string | null {
  const parts = raw.split(".").filter(Boolean);
  const name = parts[parts.length - 1]?.replace(/[^A-Za-z0-9_]/g, "");
  if (!name || name.length > MAX_IDENTIFIER) return null;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
  return name;
}

/** Scalar field names Prisma tried to read/write that are missing from the live DB. */
export function missingScalarColumnsFromPrismaError(error: unknown): string[] {
  if (!isPrismaColumnError(error)) return [];

  const found = new Set<string>();
  const message = errorText(error);
  const meta = (error as { meta?: { column?: unknown } })?.meta;

  const candidates = [
    typeof meta?.column === "string" ? meta.column : null,
    ...[...message.matchAll(/The column [`']?([\w.]+)[`']? does not exist/gi)].map((m) => m[1]),
    ...[...message.matchAll(/Unknown column [`']([\w.]+)[`']/gi)].map((m) => m[1]),
    ...[...message.matchAll(/no such column:? [`']?([\w.]+)[`']?/gi)].map((m) => m[1]),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const name = lastIdentifier(raw);
    if (name) found.add(name);
  }

  return [...found];
}

function stripKeys(value: unknown, columns: readonly string[]): unknown {
  if (Array.isArray(value)) return value.map((item) => stripKeys(item, columns));
  if (!value || typeof value !== "object") return value;
  const next = { ...(value as Record<string, unknown>) };
  for (const key of columns) {
    delete next[key];
  }
  return next;
}

export function withoutScalarColumns<T extends Record<string, unknown>>(
  args: T,
  columns: readonly string[],
): T {
  if (columns.length === 0) return args;
  const next: Record<string, unknown> = { ...args };

  if (next.select && typeof next.select === "object" && !Array.isArray(next.select)) {
    next.select = stripKeys(next.select, columns);
  } else {
    const omit =
      next.omit && typeof next.omit === "object" && !Array.isArray(next.omit)
        ? { ...(next.omit as Record<string, unknown>) }
        : {};
    for (const column of columns) {
      omit[column] = true;
    }
    next.omit = omit;
  }

  if (next.data && typeof next.data === "object") {
    next.data = stripKeys(next.data, columns);
  }

  return next as T;
}

/** @deprecated Use missingScalarColumnsFromPrismaError */
export function isMissingEditorialDisplayColumn(error: unknown): boolean {
  const columns = missingScalarColumnsFromPrismaError(error);
  return columns.includes("showAuthor") || columns.includes("showPublishedAt");
}

/** @deprecated Use withoutScalarColumns */
export function withoutEditorialDisplayColumns<T extends Record<string, unknown>>(args: T): T {
  return withoutScalarColumns(args, ["showAuthor", "showPublishedAt"]);
}
