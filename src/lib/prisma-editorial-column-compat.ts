/**
 * Compatibility for a Prisma client that still SELECTs showAuthor/showPublishedAt
 * after those columns were reverted (flags live in composition.metadata JSON).
 */

export const EDITORIAL_DISPLAY_COLUMNS = ["showAuthor", "showPublishedAt"] as const;

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function isMissingEditorialDisplayColumn(error: unknown): boolean {
  const message = errorText(error);
  const code = (error as { code?: string })?.code;
  const mentionsField = /showAuthor|showPublishedAt/.test(message);
  if (!mentionsField) return false;
  return (
    code === "P2022" ||
    /does not exist|Unknown column|no such column|column .* (showAuthor|showPublishedAt)/i.test(
      message,
    )
  );
}

function stripEditorialKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEditorialKeys);
  if (!value || typeof value !== "object") return value;
  const next = { ...(value as Record<string, unknown>) };
  for (const key of EDITORIAL_DISPLAY_COLUMNS) {
    delete next[key];
  }
  return next;
}

export function withoutEditorialDisplayColumns<T extends Record<string, unknown>>(args: T): T {
  const next: Record<string, unknown> = { ...args };

  if (next.select && typeof next.select === "object" && !Array.isArray(next.select)) {
    next.select = stripEditorialKeys(next.select);
  } else {
    const omit =
      next.omit && typeof next.omit === "object" && !Array.isArray(next.omit)
        ? { ...(next.omit as Record<string, unknown>) }
        : {};
    next.omit = { ...omit, showAuthor: true, showPublishedAt: true };
  }

  if (next.data && typeof next.data === "object") {
    next.data = stripEditorialKeys(next.data);
  }

  return next as T;
}
