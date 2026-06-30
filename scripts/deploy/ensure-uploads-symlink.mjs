#!/usr/bin/env node
/**
 * Persists CMS uploads across Hostinger Git redeploys via symlinks.
 *
 * Modes (opt-in, Linux only):
 * - LOCAL_PUBLIC_DIR  — link public/uploads → $LOCAL_PUBLIC_DIR/uploads (public/ stays a normal Git dir)
 * - LOCAL_UPLOADS_DIR — link public/uploads → LOCAL_UPLOADS_DIR
 *
 * Do NOT symlink entire public/ on Git Deploy hosts — checkout/clean can mutate persistent storage.
 *
 * Set SKIP_PUBLIC_SYMLINK=1 or SKIP_UPLOADS_SYMLINK=1 to disable.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { platform } from "node:os";
import {
  assertSafeToRemoveLink,
  isPathUnder,
  validatePersistencePaths,
} from "./local-persistence-paths.mjs";

const LOG = "[ensure-public-symlink]";

function log(message) {
  console.log(`${LOG} ${message}`);
}

function skip(reason) {
  log(reason);
  process.exit(0);
}

if (process.env.SKIP_PUBLIC_SYMLINK === "1" || process.env.SKIP_UPLOADS_SYMLINK === "1") {
  skip("SKIP_PUBLIC_SYMLINK / SKIP_UPLOADS_SYMLINK — skipping public symlink");
}

if (platform() !== "linux") {
  skip(`platform=${platform()} — symlinks only run on Linux (Hostinger)`);
}

const publicDirTarget = process.env.LOCAL_PUBLIC_DIR?.trim();
const uploadsOnlyTarget = process.env.LOCAL_UPLOADS_DIR?.trim();

if (!publicDirTarget && !uploadsOnlyTarget) {
  skip("LOCAL_PUBLIC_DIR and LOCAL_UPLOADS_DIR unset — skipping");
}

/**
 * @param {string} linkPath
 * @returns {string | null}
 */
function readSymlinkTarget(linkPath) {
  try {
    return realpathSync(linkPath);
  } catch {
    try {
      const raw = readlinkSync(linkPath);
      return resolve(dirname(linkPath), raw);
    } catch {
      return null;
    }
  }
}

/**
 * Remove legacy whole-public → persistent symlink and restore deploy public/ from persistent static assets.
 * @param {string} cwd
 * @param {string} persistentPublic
 */
function breakLegacyWholePublicSymlink(cwd, persistentPublic) {
  const publicPath = join(cwd, "public");
  if (!existsSync(publicPath)) return;

  const stat = lstatSync(publicPath);
  if (!stat.isSymbolicLink()) return;

  const target = readSymlinkTarget(publicPath);
  const resolvedPersistent = resolve(persistentPublic);
  if (!target) return;

  const isLegacyWholePublic =
    target === resolvedPersistent || isPathUnder(resolvedPersistent, target);

  if (!isLegacyWholePublic) {
    log(`public: removing unexpected whole-public symlink (${publicPath} -> ${target})`);
  } else {
    log(
      `public: breaking legacy whole-public symlink (${publicPath} -> ${target}) — Git Deploy must not symlink entire public/`,
    );
  }

  rmSync(publicPath);
  mkdirSync(publicPath, { recursive: true });

  if (existsSync(resolvedPersistent)) {
    log(`public: copying static assets from ${resolvedPersistent} (skipping uploads/)`);
    for (const name of readdirSyncSafe(resolvedPersistent)) {
      if (name === "uploads") continue;
      cpSync(join(resolvedPersistent, name), join(publicPath, name), {
        recursive: true,
        force: true,
      });
    }
  }
}

/** @param {string} dir */
function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * @param {{ linkPath: string; target: string; label: string }} options
 */
function ensureSymlink({ linkPath, target, label }) {
  const resolvedTarget = resolve(target);
  const resolvedLink = resolve(linkPath);
  const cwd = process.cwd();

  const validation = validatePersistencePaths({
    cwd,
    linkPath: resolvedLink,
    target: resolvedTarget,
    label,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  mkdirSync(resolvedTarget, { recursive: true });
  mkdirSync(dirname(resolvedLink), { recursive: true });

  let targetReal = resolvedTarget;
  try {
    targetReal = realpathSync(resolvedTarget);
  } catch {
    /* target may not exist yet */
  }

  if (existsSync(resolvedLink)) {
    const stat = lstatSync(resolvedLink);

    if (stat.isSymbolicLink()) {
      const current = readSymlinkTarget(resolvedLink);
      if (current && current === targetReal) {
        log(`${label}: OK ${resolvedLink} -> ${targetReal}`);
        return;
      }
      log(`${label}: replacing symlink (${current ?? "?"} -> ${targetReal})`);
      rmSync(resolvedLink);
    } else if (stat.isDirectory()) {
      log(`${label}: merging ${resolvedLink} into ${resolvedTarget}`);
      assertSafeToRemoveLink(resolvedLink, resolvedTarget);
      cpSync(resolvedLink, resolvedTarget, { recursive: true, force: true });
      rmSync(resolvedLink, { recursive: true, force: true });
    } else {
      log(`${label}: removing file at ${resolvedLink}`);
      rmSync(resolvedLink, { force: true });
    }
  }

  symlinkSync(resolvedTarget, resolvedLink);
  log(`${label}: linked ${resolvedLink} -> ${resolvedTarget}`);
}

try {
  const cwd = process.cwd();
  const publicPath = join(cwd, "public");

  let uploadsTarget;
  if (publicDirTarget) {
    breakLegacyWholePublicSymlink(cwd, publicDirTarget);
    mkdirSync(publicPath, { recursive: true });
    uploadsTarget = join(publicDirTarget, "uploads");
  } else {
    uploadsTarget = uploadsOnlyTarget;
    mkdirSync(publicPath, { recursive: true });
  }

  ensureSymlink({
    linkPath: join(publicPath, "uploads"),
    target: uploadsTarget,
    label: "public/uploads",
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${LOG} Failed: ${message}`);
  console.error(
    `${LOG} Set LOCAL_PUBLIC_DIR to an absolute path outside the Git deploy folder (e.g. /home/u637787491/persistent/public).`,
  );
  process.exit(1);
}
