import { normalizeLocalMediaUrl } from "@/lib/config/next-image";

/**
 * Public pages may only emit upload URLs the anonymous upload route will serve:
 * a PUBLIC MediaAsset row for that exact path, and a file at that path.
 * Anything else is a 404 (and a wasted image preload).
 */
export function normalizedUploadUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const normalized = normalizeLocalMediaUrl(trimmed);
  return normalized.startsWith("/uploads/") ? normalized : null;
}

export function uniqueNormalizedUploadUrls(urls: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const url of urls) {
    const normalized = normalizedUploadUrl(url);
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}

/** Keep remote and non-upload URLs. Drop local uploads the public route will not serve. */
export function dropUnservableUploadUrl(
  url: string | null | undefined,
  servable: ReadonlySet<string>,
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const normalized = normalizedUploadUrl(trimmed);
  if (!normalized) return trimmed;
  return servable.has(normalized) ? normalized : undefined;
}

export async function retainServablePublicUploadUrls(
  urls: readonly (string | null | undefined)[],
): Promise<Set<string>> {
  const normalized = uniqueNormalizedUploadUrls(urls);
  if (normalized.length === 0) return new Set();

  let publicUrls: string[] = [];
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.mediaAsset.findMany({
      where: { url: { in: normalized }, visibility: "PUBLIC" },
      select: { url: true },
    });
    publicUrls = rows.map((row) => normalizeLocalMediaUrl(row.url));
  } catch {
    // Database unavailable: leave the URLs in place rather than stripping every logo.
    return new Set(normalized);
  }

  const { existsSync } = await import("node:fs");
  const { resolveLocalUploadDiskPath } = await import("@/lib/local-media-files");
  const publicSet = new Set(publicUrls);
  const servable = new Set<string>();
  for (const url of normalized) {
    const diskPath = resolveLocalUploadDiskPath(url);
    if (publicSet.has(url) && diskPath && existsSync(diskPath)) servable.add(url);
  }
  return servable;
}
