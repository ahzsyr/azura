/** True when DATABASE_URL points at PostgreSQL (e.g. Supabase). */
export function isPostgresDatabaseUrl(url = process.env.DATABASE_URL ?? ""): boolean {
  return /^postgres(ql)?:\/\//i.test(sanitizeDatabaseUrl(url));
}

/**
 * Normalize DATABASE_URL copied from .env files into hPanel/Vercel.
 * Fixes values like `DATABASE_URL="postgresql://..."` stored as the literal env value.
 */
export function sanitizeDatabaseUrl(raw: string | undefined): string {
  let url = raw?.trim() ?? "";
  if (!url) return "";

  url = url.replace(/^DATABASE_URL\s*=\s*/i, "");
  while (/^["']/.test(url) || /["']$/.test(url)) {
    url = url.replace(/^["']+|["']+$/g, "").trim();
  }

  const postgresMatch = url.match(/(postgres(?:ql)?:\/\/[^\s"'<>]+)/i);
  if (postgresMatch) {
    return postgresMatch[1];
  }

  return url.trim();
}

/** Keep pooler connection_limit from env (use 1 on Vercel/Supabase serverless). */
export function normalizeConnectionLimit(url: string): string {
  return url;
}

/** Runtime Prisma datasource URL (sanitized + pool limit). */
export function getRuntimeDatabaseUrl(): string {
  const sanitized = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  return normalizeConnectionLimit(sanitized);
}

/** True when env is set but no valid postgresql:// URL can be parsed. */
export function isDatabaseUrlMalformed(raw = process.env.DATABASE_URL): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  const sanitized = sanitizeDatabaseUrl(trimmed);
  return !sanitized || !/^postgres(ql)?:\/\//i.test(sanitized);
}

/** Raw env has copy-paste noise but sanitization yields a usable URL. */
export function hasFixableDatabaseUrlFormatting(raw = process.env.DATABASE_URL): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  const sanitized = sanitizeDatabaseUrl(trimmed);
  return sanitized !== trimmed && /^postgres(ql)?:\/\//i.test(sanitized);
}
