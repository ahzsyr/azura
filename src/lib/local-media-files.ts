import { unlink } from "fs/promises";
import { resolve, sep } from "path";
import { UPLOAD_ROOT } from "@/lib/local-media-storage";

/** Resolve a storage object path under public/uploads with traversal checks. */
export function resolveUploadObjectDiskPath(objectPath: string): string {
  if (
    !objectPath ||
    objectPath.includes("..") ||
    objectPath.startsWith("/") ||
    objectPath.includes("\\")
  ) {
    throw new Error("Invalid upload path");
  }

  const uploadsRoot = resolve(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
  const absPath = resolve(uploadsRoot, objectPath);
  const rootPrefix = uploadsRoot.endsWith(sep) ? uploadsRoot : `${uploadsRoot}${sep}`;
  if (!absPath.startsWith(rootPrefix)) {
    throw new Error("Invalid upload path");
  }
  return absPath;
}

export function resolveLocalUploadDiskPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;

  const rel = url.replace(/^\//, "");
  const abs = resolve(process.cwd(), "public", rel);
  const uploadsRoot = resolve(process.cwd(), UPLOAD_ROOT);

  if (!abs.startsWith(uploadsRoot)) return null;
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
