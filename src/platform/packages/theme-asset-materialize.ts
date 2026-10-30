/**
 * Injectable materialize → cleanup orchestrator for theme ZIP binaries (M7.2).
 * Pass-1 validation must already have succeeded (zero uploads before this runs).
 */
import { createHash } from "node:crypto";
import { extname } from "node:path";
import type { MediaType } from "@prisma/client";
import { isThemeAssetZipPath } from "@/platform/packages/theme-asset-limits";
import { mimeTypeForUpload } from "@/lib/local-media-storage";

export type ThemeAssetZipEntry = {
  name: string;
  data: Buffer;
};

export type ThemeAssetInventoryRow = {
  zipPath: string;
  mediaId: string;
  url: string;
  sha256: string;
  byteLength: number;
  mediaType: MediaType;
  storageBackend: string;
  bucket: string;
  objectKey: string;
};

export type ThemeAssetCreated = {
  mediaId: string;
  storageBackend: string;
  bucket: string;
  objectKey: string;
};

export type ThemeAssetMaterializeDeps = {
  storeFile: (
    file: { name: string; type: string },
    buffer: Buffer,
    mediaType: MediaType,
  ) => Promise<{
    url: string;
    storage: string;
    bucket: string;
    objectKey: string;
  }>;
  persistRow: (input: {
    filename: string;
    url: string;
    mimeType: string;
    mediaType: MediaType;
    sizeBytes: number;
    storageBackend: string;
    bucket: string;
    objectKey: string;
  }) => Promise<{ id: string }>;
  deleteAsset: (identity: {
    mediaId: string;
    storageBackend: string;
    bucket: string;
    objectKey: string;
  }) => Promise<boolean>;
};

export type ThemeAssetMaterializeResult =
  | { ok: true; inventory: ThemeAssetInventoryRow[]; deleteFailures: number }
  | { ok: false; error: string; deleteFailures: number };

export function mediaTypeForThemeAssetPath(zipPath: string): MediaType {
  const ext = extname(zipPath).toLowerCase();
  if (ext === ".svg") return "SVG";
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") return "IMAGE";
  return "DOCUMENT";
}

/**
 * Materialize approved asset entries. On any failure after the first successful
 * create, compensate by deleting every entry in `created` (finally-style).
 */
export async function runThemeAssetMaterialize(
  entries: ThemeAssetZipEntry[],
  deps: ThemeAssetMaterializeDeps,
): Promise<ThemeAssetMaterializeResult> {
  const assetEntries = entries.filter((e) => isThemeAssetZipPath(e.name));
  const created: ThemeAssetCreated[] = [];
  const inventory: ThemeAssetInventoryRow[] = [];
  let deleteFailures = 0;

  const compensate = async () => {
    for (const row of [...created].reverse()) {
      try {
        const deleted = await deps.deleteAsset(row);
        if (!deleted) deleteFailures += 1;
      } catch {
        deleteFailures += 1;
      }
    }
    created.length = 0;
  };

  try {
    for (const entry of assetEntries) {
      const mediaType = mediaTypeForThemeAssetPath(entry.name);
      const basename = entry.name.split("/").pop() ?? entry.name;
      const mimeType = mimeTypeForUpload(basename, "", mediaType);
      const stored = await deps.storeFile(
        { name: basename, type: mimeType },
        entry.data,
        mediaType,
      );
      const row = await deps.persistRow({
        filename: basename,
        url: stored.url,
        mimeType,
        mediaType,
        sizeBytes: entry.data.byteLength,
        storageBackend: stored.storage,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
      });
      const createdRow: ThemeAssetCreated = {
        mediaId: row.id,
        storageBackend: stored.storage,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
      };
      created.push(createdRow);
      inventory.push({
        zipPath: entry.name,
        mediaId: row.id,
        url: stored.url,
        sha256: createHash("sha256").update(entry.data).digest("hex"),
        byteLength: entry.data.byteLength,
        mediaType,
        storageBackend: stored.storage,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
      });
    }
    return { ok: true, inventory, deleteFailures };
  } catch (error) {
    await compensate();
    const message = error instanceof Error ? error.message : String(error);
    const svgHint =
      /SVG|external|active content/i.test(message)
        ? " SVG references external resources; embed or remove them."
        : "";
    return {
      ok: false,
      error: `${message}${svgHint}`.trim(),
      deleteFailures,
    };
  }
}

/** Best-effort GC of prior inventory rows not present in the new inventory. */
export async function gcThemeAssetsNotIn(
  previous: ThemeAssetInventoryRow[] | undefined,
  next: ThemeAssetInventoryRow[],
  deleteAsset: ThemeAssetMaterializeDeps["deleteAsset"],
): Promise<{ attempted: number; failures: number }> {
  if (!previous?.length) return { attempted: 0, failures: 0 };
  const keep = new Set(next.map((r) => r.mediaId));
  let failures = 0;
  let attempted = 0;
  for (const row of previous) {
    if (keep.has(row.mediaId)) continue;
    attempted += 1;
    try {
      const deleted = await deleteAsset({
        mediaId: row.mediaId,
        storageBackend: row.storageBackend,
        bucket: row.bucket,
        objectKey: row.objectKey,
      });
      if (!deleted) failures += 1;
    } catch {
      failures += 1;
    }
  }
  return { attempted, failures };
}
