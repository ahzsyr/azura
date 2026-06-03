import { unlink } from "fs/promises";
import { resolve } from "path";
import { UPLOAD_ROOT } from "@/lib/local-media-storage";

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
    throw error;
  }
}
