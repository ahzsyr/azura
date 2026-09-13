/**
 * Shared path validation for LOCAL_PUBLIC_DIR / LOCAL_UPLOADS_DIR (Hostinger deploy).
 */
import { resolve, sep } from "node:path";

/** @param {string} path */
export function isAbsolutePersistencePath(path) {
  return path.startsWith("/");
}

/**
 * True when `child` equals `parent` or is a subdirectory of `parent`.
 * @param {string} parent
 * @param {string} child
 */
export function isPathUnder(parent, child) {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  if (resolvedChild === resolvedParent) return true;
  const prefix = resolvedParent.endsWith(sep) ? resolvedParent : `${resolvedParent}${sep}`;
  return resolvedChild.startsWith(prefix);
}

/**
 * @param {{ cwd: string; linkPath: string; target: string; label: string }} options
 * @returns {{ ok: true } | { ok: false; errors: string[] }}
 */
export function validatePersistencePaths({ cwd, linkPath, target, label }) {
  const resolvedCwd = resolve(cwd);
  const resolvedLink = resolve(linkPath);
  const resolvedTarget = resolve(target);
  const errors = [];

  if (!isAbsolutePersistencePath(target)) {
    errors.push(
      `${label}: LOCAL persistence path must be absolute (got ${JSON.stringify(target)}). ` +
        "Use e.g. /home/u637787491/persistent/public — not ./public or ../brt-data/public.",
    );
  }

  if (resolvedLink === resolvedTarget) {
    errors.push(`${label}: link path cannot equal target (${resolvedLink})`);
  }

  if (isPathUnder(resolvedLink, resolvedTarget)) {
    errors.push(
      `${label}: target is inside the link path (${resolvedTarget} under ${resolvedLink}). ` +
        "This can delete uploads when the deploy folder is removed.",
    );
  }

  if (isPathUnder(resolvedTarget, resolvedLink)) {
    errors.push(
      `${label}: link path is inside the target (${resolvedLink} under ${resolvedTarget}). ` +
        "Merge-then-delete would remove persisted files.",
    );
  }

  if (isPathUnder(resolvedCwd, resolvedTarget)) {
    errors.push(
      `${label}: target is inside the Git deploy folder (${resolvedTarget} under ${resolvedCwd}). ` +
        "CMS uploads will be wiped on redeploy. Use a path outside the app root, e.g. /home/u637787491/persistent/public.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

/**
 * @param {string} linkPath
 * @param {string} target
 */
export function assertSafeToRemoveLink(linkPath, target) {
  const resolvedLink = resolve(linkPath);
  const resolvedTarget = resolve(target);

  if (resolvedLink === resolvedTarget) {
    throw new Error(`refusing to remove link path that equals target (${resolvedLink})`);
  }

  if (isPathUnder(resolvedTarget, resolvedLink)) {
    throw new Error(
      `refusing to remove ${resolvedLink}: it is inside target ${resolvedTarget}`,
    );
  }
}
