import "server-only";

import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

/** Absolute disk path for the public static root (LOCAL_PUBLIC_DIR or cwd/public). */
export function resolveLocalPublicDiskDir(): string {
  const configured = process.env.LOCAL_PUBLIC_DIR?.trim();
  if (configured) return resolve(configured);
  return resolve(process.cwd(), "public");
}

/** Absolute disk path for CMS/catalog uploads (LOCAL_UPLOADS_DIR or public/uploads). */
export function resolveLocalUploadsDiskDir(): string {
  const uploadsOnly = process.env.LOCAL_UPLOADS_DIR?.trim();
  if (uploadsOnly) return resolve(uploadsOnly);
  return resolve(resolveLocalPublicDiskDir(), "uploads");
}

/** Whether uploads are stored outside the default cwd/public tree. */
export function usesConfiguredLocalPublicStorage(): boolean {
  return Boolean(
    process.env.LOCAL_PUBLIC_DIR?.trim() || process.env.LOCAL_UPLOADS_DIR?.trim(),
  );
}

/** True when LOCAL_PUBLIC_DIR / LOCAL_UPLOADS_DIR resolves inside process.cwd() (unsafe on Git redeploy). */
export function isLocalPersistenceInsideDeployRoot(): boolean {
  const configured =
    process.env.LOCAL_PUBLIC_DIR?.trim() || process.env.LOCAL_UPLOADS_DIR?.trim();
  if (!configured) return false;

  const cwd = resolve(process.cwd());
  const target = resolve(configured);
  if (target === cwd) return true;

  const cwdPrefix = cwd.endsWith(sep) ? cwd : `${cwd}${sep}`;
  return target.startsWith(cwdPrefix);
}

/** Prefix check for paths under the uploads disk root. */
export function isPathUnderUploadsRoot(absPath: string): boolean {
  const uploadsRoot = resolveLocalUploadsDiskDir();
  const rootPrefix = uploadsRoot.endsWith(sep) ? uploadsRoot : `${uploadsRoot}${sep}`;
  return absPath === uploadsRoot || absPath.startsWith(rootPrefix);
}

function readSymlinkTarget(linkPath: string): string | null {
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

/** Runtime layout of public/ symlinks (for admin diagnostics). */
export function getLocalPersistenceLayout(): {
  resolvedUploadsDiskDir: string;
  publicIsSymlink: boolean;
  publicSymlinkTarget: string | null;
  publicUploadsSymlinkTarget: string | null;
  publicWholeSymlinkRisk: boolean;
} {
  const cwd = process.cwd();
  const publicPath = join(cwd, "public");
  const uploadsPath = join(publicPath, "uploads");

  let publicIsSymlink = false;
  let publicSymlinkTarget: string | null = null;
  let publicUploadsSymlinkTarget: string | null = null;

  if (existsSync(publicPath)) {
    const stat = lstatSync(publicPath);
    if (stat.isSymbolicLink()) {
      publicIsSymlink = true;
      publicSymlinkTarget = readSymlinkTarget(publicPath);
    }
  }

  if (existsSync(uploadsPath)) {
    const stat = lstatSync(uploadsPath);
    if (stat.isSymbolicLink()) {
      publicUploadsSymlinkTarget = readSymlinkTarget(uploadsPath);
    }
  }

  return {
    resolvedUploadsDiskDir: resolveLocalUploadsDiskDir(),
    publicIsSymlink,
    publicSymlinkTarget,
    publicUploadsSymlinkTarget,
    publicWholeSymlinkRisk: publicIsSymlink,
  };
}
