#!/usr/bin/env node
/** Log LOCAL_PUBLIC_DIR / symlink layout at startup (Hostinger runtime debugging). */
import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const cwd = process.cwd();
const localPublicDir = process.env.LOCAL_PUBLIC_DIR?.trim() || null;
const localUploadsDir = process.env.LOCAL_UPLOADS_DIR?.trim() || null;

function readSymlinkTarget(linkPath) {
  try {
    return realpathSync(linkPath);
  } catch {
    try {
      return resolve(dirname(linkPath), readlinkSync(linkPath));
    } catch {
      return null;
    }
  }
}

function describePath(label, path) {
  if (!existsSync(path)) {
    console.log(`[prestart] ${label}: missing`);
    return;
  }
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    const target = readSymlinkTarget(path);
    console.log(`[prestart] ${label}: symlink -> ${target ?? "?"}`);
    return;
  }
  if (stat.isDirectory()) {
    console.log(`[prestart] ${label}: directory`);
    return;
  }
  console.log(`[prestart] ${label}: file`);
}

console.log(`[prestart] cwd=${cwd}`);
console.log(`[prestart] LOCAL_PUBLIC_DIR=${localPublicDir ?? "(unset)"}`);
console.log(`[prestart] LOCAL_UPLOADS_DIR=${localUploadsDir ?? "(unset)"}`);

let resolvedUploads = join(cwd, "public", "uploads");
if (localUploadsDir) {
  resolvedUploads = resolve(localUploadsDir);
} else if (localPublicDir) {
  resolvedUploads = resolve(localPublicDir, "uploads");
}
console.log(`[prestart] resolved uploads disk dir=${resolvedUploads}`);

describePath("public", join(cwd, "public"));
describePath("public/uploads", join(cwd, "public", "uploads"));

if (existsSync(join(cwd, "public"))) {
  const publicStat = lstatSync(join(cwd, "public"));
  if (publicStat.isSymbolicLink()) {
    console.warn(
      "[prestart] WARNING: entire public/ is symlinked — unsafe with Git Deploy; expect public/uploads symlink only",
    );
  }
}
