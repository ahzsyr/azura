import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve, extname, join } from "path";
import { readdir, stat } from "fs/promises";
import "server-only";

import type { MediaLibraryMeta, MediaItem, MediaType } from "./types";

const META_PATH = resolve(process.cwd(), "src/data/media-library.json");
const UPLOADS_DIR = resolve(process.cwd(), "public/uploads");

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
  try {
    const raw = await readFile(META_PATH, "utf-8");
    return JSON.parse(raw) as MediaLibraryMeta;
  } catch {
    return {};
  }
}

export async function writeMeta(meta: MediaLibraryMeta): Promise<void> {
  await mkdir(resolve(process.cwd(), "src/data"), { recursive: true });
  await writeFile(META_PATH, JSON.stringify(meta, null, 2), "utf-8");
}

export async function scanFilesystem(): Promise<Array<{ filename: string; subDir: string; ext: string; size: number; url: string }>> {
  const results: Array<{ filename: string; subDir: string; ext: string; size: number; url: string }> = [];
  const subDirs = ["images", "videos", "documents", "audio", "other"];

  for (const sub of subDirs) {
    const dir = join(UPLOADS_DIR, sub);
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

export async function buildMediaItems(meta: MediaLibraryMeta): Promise<MediaItem[]> {
  const fsFiles = await scanFilesystem();
  const items: MediaItem[] = [];

  for (const f of fsFiles) {
    const m = meta[f.filename];
    const type = getMediaType(f.ext);
    items.push({
      id: m?.id ?? f.filename,
      filename: f.filename,
      originalName: m?.originalName ?? f.filename,
      url: f.url,
      type,
      ext: f.ext,
      size: f.size,
      uploadedAt: m?.uploadedAt ?? new Date(0).toISOString(),
      title: m?.title,
      alt: m?.alt,
      description: m?.description,
      tags: m?.tags,
    });
  }

  return items;
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}
