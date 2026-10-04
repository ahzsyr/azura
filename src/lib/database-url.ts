const SUPPORTED_DATABASE_URL_RE = /^mysql:\/\//i;

/** @deprecated PostgreSQL is not supported. Always false for supported configs. */
export function isPostgresDatabaseUrl(url = process.env.DATABASE_URL ?? ""): boolean {
  return /^postgres(ql)?:\/\//i.test(sanitizeDatabaseUrl(url));
}

/** True when DATABASE_URL points at MySQL (Hostinger / Docker). */
export function isMysqlDatabaseUrl(url = process.env.DATABASE_URL ?? ""): boolean {
  return /^mysql:\/\//i.test(sanitizeDatabaseUrl(url));
}

/** Canonical protocol after sanitization. PostgreSQL URLs are rejected at runtime. */
export function getDatabaseUrlProtocol(url = process.env.DATABASE_URL ?? ""): "mysql" | "postgresql" | null {
  const sanitized = sanitizeDatabaseUrl(url);
  if (/^mysql:\/\//i.test(sanitized)) return "mysql";
  if (/^postgres(ql)?:\/\//i.test(sanitized)) return "postgresql";
  return null;
}

function isSupportedDatabaseUrl(url: string): boolean {
  return SUPPORTED_DATABASE_URL_RE.test(url);
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

  const mysqlMatch = url.match(/(mysql:\/\/[^\s"'<>]+)/i);
  if (mysqlMatch) {
    return mysqlMatch[1];
  }

  // Detect misconfigured PostgreSQL URLs so callers can reject them explicitly.
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

/** Host from a mysql/postgres URL for diagnostics (no credentials). */
export function getDatabaseHostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Hostinger Node apps on the same server as MySQL often cannot use srv*.hstgr.io.
 * Set DATABASE_MYSQL_HOST=localhost or HOSTINGER_MYSQL_LOCALHOST=1 in hPanel.
 */
export function applyMysqlHostOverride(url: string): string {
  if (!/^mysql:\/\//i.test(url)) return url;

  const override =
    process.env.DATABASE_MYSQL_HOST?.trim() ||
    (process.env.HOSTINGER_MYSQL_LOCALHOST === "1" ? "localhost" : "");
  if (!override) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === override) return url;
    parsed.hostname = override;
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Runtime Prisma datasource URL (sanitized + pool limit + optional MySQL host override). */
export function getRuntimeDatabaseUrl(): string {
  const sanitized = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  return normalizeConnectionLimit(applyMysqlHostOverride(sanitized));
}

/** True when env is set but no valid mysql:// URL can be parsed. */
export function isDatabaseUrlMalformed(raw = process.env.DATABASE_URL): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  const sanitized = sanitizeDatabaseUrl(trimmed);
  return !sanitized || !isSupportedDatabaseUrl(sanitized) || isPostgresDatabaseUrl(sanitized);
}

/** Raw env has copy-paste noise but sanitization yields a usable URL. */
export function hasFixableDatabaseUrlFormatting(raw = process.env.DATABASE_URL): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  const sanitized = sanitizeDatabaseUrl(trimmed);
  return sanitized !== trimmed && isSupportedDatabaseUrl(sanitized);
}
