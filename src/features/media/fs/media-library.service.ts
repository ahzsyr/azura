import { extname, join } from "path";
import { readdir, stat } from "fs/promises";
import "server-only";

import { deleteStoredUpload } from "@/lib/media-storage";
import { deleteLocalUploadFile, resolveLocalUploadDiskPath } from "@/lib/local-media-files";
import {
  addCatalogMediaTombstone,
  preferCatalogMediaJsonStore,
  readCatalogMediaMeta,
  readCatalogMediaTombstones,
  writeCatalogMediaMeta,
} from "./catalog-media-persistence";
import type { MediaLibraryMeta, MediaItem, MediaType } from "./types";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";
import { resolveLocalUploadsDiskDir } from "@/lib/local-public-path";

export const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
export const SVG_EXTS = new Set([".svg"]);
export const VID_EXTS = new Set([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"]);
export const AUD_EXTS = new Set([".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a"]);
export const DOC_EXTS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"]);
export const ZIP_EXTS = new Set([".zip", ".rar", ".7z", ".tar", ".gz"]);

export function getMediaType(ext: string): MediaType {
  if (IMG_EXTS.has(ext)) return "image";
  if (SVG_EXTS.has(ext)) return "svg";
  if (VID_EXTS.has(ext)) return "video";
  if (AUD_EXTS.has(ext)) return "audio";
  if (DOC_EXTS.has(ext)) return "document";
  if (ZIP_EXTS.has(ext)) return "zip";
  return "other";
}

export function getSubDir(type: MediaType): string {
  switch (type) {
    case "image": return "images";
    case "svg": return "images";
    case "video": return "videos";
    case "audio": return "audio";
    case "document": return "documents";
    case "zip": return "other";
    default: return "other";
  }
}

export const ALLOWED_EXTS = new Set([
  ...IMG_EXTS, ...SVG_EXTS, ...VID_EXTS, ...AUD_EXTS, ...DOC_EXTS, ...ZIP_EXTS,
  ".glb", ".gltf",
]);

export const MAX_SIZES: Record<string, number> = {
  ".mp4": 200 * 1024 * 1024,
  ".webm": 200 * 1024 * 1024,
  ".mov": 200 * 1024 * 1024,
  ".avi": 200 * 1024 * 1024,
  ".mkv": 200 * 1024 * 1024,
  ".pdf": 50 * 1024 * 1024,
};
export const DEFAULT_MAX_SIZE = 20 * 1024 * 1024;

export async function readMeta(): Promise<MediaLibraryMeta> {
  return readCatalogMediaMeta();
}

export async function writeMeta(meta: MediaLibraryMeta): Promise<void> {
  await writeCatalogMediaMeta(meta);
}

export async function scanFilesystem(): Promise<Array<{ filename: string; subDir: string; ext: string; size: number; url: string }>> {
  const results: Array<{ filename: string; subDir: string; ext: string; size: number; url: string }> = [];
  const subDirs = ["images", "videos", "documents", "audio", "svg", "other"];

  for (const sub of subDirs) {
    const dir = join(resolveLocalUploadsDiskDir(), sub);
    try {
      const files = await readdir(dir);
      for (const filename of files) {
        const filePath = join(dir, filename);
        try {
          const info = await stat(filePath);
          if (!info.isFile()) continue;
          const ext = extname(filename).toLowerCase();
          results.push({
            filename,
            subDir: sub,
            ext,
            size: info.size,
            url: `/uploads/${sub}/${filename}`,
          });
        } catch { /* skip */ }
      }
    } catch { /* dir doesn't exist */ }
  }

  return results;
}

function metaEntryToItem(filename: string, m: MediaLibraryMeta[string], fsEntry?: { ext: string; size: number; url: string }): MediaItem {
  const ext = m.ext ?? fsEntry?.ext ?? extname(filename).toLowerCase();
  const type = m.type ?? getMediaType(ext);
  return {
    id: m.id ?? filename,
    filename,
    originalName: m.originalName ?? filename,
    url: m.url ?? fsEntry?.url ?? `/uploads/${getSubDir(type)}/${filename}`,
    type,
    ext,
    size: m.size ?? fsEntry?.size ?? 0,
    uploadedAt: m.uploadedAt ?? new Date(0).toISOString(),
    title: m.title,
    alt: m.alt,
    description: m.description,
    tags: m.tags,
  };
}

function cmsMediaTypeToCatalog(ext: string): MediaType {
  const cms = ext.toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(cms)) return "image";
  if (cms === ".svg") return "svg";
  if ([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].includes(cms)) return "video";
  if ([".mp3", ".wav", ".aac", ".flac", ".m4a"].includes(cms)) return "audio";
  if ([".pdf", ".doc", ".docx", ".txt", ".csv"].includes(cms)) return "document";
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(cms)) return "zip";
  return "other";
}

async function buildMediaItemsFromDb(): Promise<MediaItem[]> {
  const { mediaRepository } = await import("@/repositories/media.repository");
  const assets = await mediaRepository.listAssets({ assetScope: "CATALOG" });
  return assets.map((asset) => {
    const ext = extname(asset.filename).toLowerCase() || extname(asset.url).toLowerCase();
    return {
      id: asset.id,
      filename: asset.filename,
      originalName: asset.filename,
      url: asset.url,
      type: cmsMediaTypeToCatalog(ext),
      ext,
      size: asset.sizeBytes,
      uploadedAt: asset.createdAt.toISOString(),
    };
  });
}

export async function buildMediaItems(meta: MediaLibraryMeta): Promise<MediaItem[]> {
  if (useDatabaseOnlyCatalog() || isCloudNativeProduction()) {
    return buildMediaItemsFromDb();
  }

  const tombstones = await readCatalogMediaTombstones();
  const fsFiles = await scanFilesystem();
  const fsByName = new Map(fsFiles.map((f) => [f.filename, f]));
  const items: MediaItem[] = [];
  const seen = new Set<string>();

  for (const f of fsFiles) {
    if (tombstones.has(f.filename)) continue;
    seen.add(f.filename);
    items.push(metaEntryToItem(f.filename, meta[f.filename] ?? { id: f.filename, originalName: f.filename, uploadedAt: new Date(0).toISOString() }, f));
  }

  for (const [filename, entry] of Object.entries(meta)) {
    if (seen.has(filename) || tombstones.has(filename)) continue;
    if (!entry.url && !fsByName.has(filename)) continue;
    if (fsByName.has(filename)) continue;
    items.push(metaEntryToItem(filename, entry));
  }

  return items;
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export function filenameFromStoredUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] ?? url;
}

export type CatalogMediaDeleteResult =
  | { ok: true; tombstoned?: boolean }
  | { ok: false; error: string; status: number };

/** Delete a catalog media file from storage and remove its metadata entry. */
export async function deleteCatalogMediaFile(filename: string): Promise<CatalogMediaDeleteResult> {
  if (useDatabaseOnlyCatalog() || isCloudNativeProduction()) {
    const { mediaRepository } = await import("@/repositories/media.repository");
    const assets = await mediaRepository.listAssets({ assetScope: "CATALOG" });
    const match =
      assets.find((a) => a.filename === filename || a.url.endsWith(`/${filename}`)) ??
      assets.find((a) => a.id === filename);

    if (!match) {
      return { ok: false, error: "File not found", status: 404 };
    }

    if (match.url) {
      await deleteStoredUpload(match.url);
    }
    await mediaRepository.deleteAssets([match.id]);
    return { ok: true };
  }

  const fsFiles = await scanFilesystem();
  const found = fsFiles.find((f) => f.filename === filename);
  const meta = await readMeta();
  const entry = meta[filename];

  if (!found && !entry) {
    return { ok: false, error: "File not found", status: 404 };
  }

  const url = entry?.url ?? found?.url;
  let tombstoned = false;

  if (url) {
    const deleted = await deleteStoredUpload(url);
    if (!deleted && url.startsWith("/uploads/")) {
      const diskPath = resolveLocalUploadDiskPath(url);
      if (diskPath) {
        try {
          await stat(diskPath);
          if (preferCatalogMediaJsonStore()) {
            await addCatalogMediaTombstone(filename);
            tombstoned = true;
          } else {
            return {
              ok: false,
              error: "Could not delete file. The server filesystem may be read-only.",
              status: 503,
            };
          }
        } catch {
          /* file already removed */
        }
      }
    } else if (!deleted && !url.startsWith("/uploads/")) {
      return {
        ok: false,
        error: "Could not delete file from cloud storage.",
        status: 503,
      };
    }
  } else if (found && preferCatalogMediaJsonStore()) {
    await addCatalogMediaTombstone(filename);
    tombstoned = true;
  }

  delete meta[filename];

  try {
    await writeMeta(meta);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      return {
        ok: false,
        error: "Cannot update media catalog on a read-only filesystem.",
        status: 503,
      };
    }
    throw error;
  }

  return { ok: true, tombstoned };
}
