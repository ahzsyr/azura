import { existsSync } from "node:fs";
import { unlink } from "fs/promises";
import { resolve } from "path";
import {
  isPathUnderUploadsRoot,
  resolveLocalUploadsDiskDir,
} from "@/lib/local-public-path";
import { uploadFallbackUrls } from "@/lib/local-upload-urls";

export { uploadFallbackUrls } from "@/lib/local-upload-urls";

/** First existing file on disk for an upload URL, trying sibling folders. */
export function resolveExistingUploadDiskPath(url: string): string | null {
  for (const candidate of uploadFallbackUrls(url)) {
    const diskPath = resolveLocalUploadDiskPath(candidate);
    if (diskPath && existsSync(diskPath)) return diskPath;
  }
  return null;
}

/** Resolve a storage object path under the uploads disk root with traversal checks. */
export function resolveUploadObjectDiskPath(objectPath: string): string {
  if (
    !objectPath ||
    objectPath.includes("..") ||
    objectPath.startsWith("/") ||
    objectPath.includes("\\")
  ) {
    throw new Error("Invalid upload path");
  }

  const uploadsRoot = resolveLocalUploadsDiskDir();
  const absPath = resolve(uploadsRoot, objectPath);
  if (!isPathUnderUploadsRoot(absPath)) {
    throw new Error("Invalid upload path");
  }
  return absPath;
}

export function resolveLocalUploadDiskPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;

  const rel = url.slice("/uploads/".length);
  if (!rel || rel.includes("..") || rel.includes("\\")) return null;

  const uploadsRoot = resolveLocalUploadsDiskDir();
  const abs = resolve(uploadsRoot, rel);
  if (!isPathUnderUploadsRoot(abs)) return null;
  return abs;
}

export async function deleteLocalUploadFile(url: string): Promise<boolean> {
  const diskPath = resolveLocalUploadDiskPath(url);
  if (!diskPath) return false;

  try {
    await unlink(diskPath);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    if (code === "EROFS" || code === "EPERM" || code === "EACCES") return false;
    throw error;
  }
}
