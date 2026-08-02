function hasUrlProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+\-.]*:/i.test(value);
}

/**
 * Ensures favicon URLs resolve correctly from nested routes like `/ar/...`.
 * Theme values may be stored as `uploads/...` without a leading slash.
 */
export function resolveFaviconUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/") || trimmed.startsWith("//") || hasUrlProtocol(trimmed)) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}
