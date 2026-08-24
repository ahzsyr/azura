/** Normalize SEO metadata URLs so Next.js metadata validation does not throw in production. */
export function sanitizeMetadataAbsoluteUrl(
  value: string | null | undefined,
  siteUrl: string,
): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  const base = siteUrl.replace(/\/$/, "");

  if (raw.startsWith("//")) {
    try {
      return new URL(`https:${raw}`).href;
    } catch {
      return undefined;
    }
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).href;
    } catch {
      return undefined;
    }
  }

  if (raw.startsWith("/")) {
    try {
      return new URL(raw, `${base}/`).href;
    } catch {
      return undefined;
    }
  }

  if (/[\s<>"]/.test(raw)) {
    return undefined;
  }

  try {
    return new URL(`/${raw.replace(/^\/+/, "")}`, `${base}/`).href;
  } catch {
    return undefined;
  }
}

export function normalizeTwitterCard(
  value: string | null | undefined,
): "summary" | "summary_large_image" {
  return value?.trim() === "summary" ? "summary" : "summary_large_image";
}
