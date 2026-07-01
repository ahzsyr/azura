#!/usr/bin/env node
/**
 * Diagnose filesystem access and persistent media layout on Hostinger.
 * Run: npm run diagnose:hostinger
 */
import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { platform } from "node:os";
import { isPathUnder, validatePersistencePaths } from "./local-persistence-paths.mjs";

const cwd = process.cwd();
const apiRoot = join(cwd, "src", "app", "api");
const catalogDir = join(cwd, "src", "data", "en-us", "products");
const publicDir = join(cwd, "public");
const uploadsDir = join(publicDir, "uploads");
const localPublicDir = process.env.LOCAL_PUBLIC_DIR?.trim();
const localUploadsDir = process.env.LOCAL_UPLOADS_DIR?.trim();

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

function probeDir(label, dirPath) {
  let exists = false;
  let isDirectory = false;
  let readable = false;
  let scandirOk = false;
  let scandirError = null;
  let childCount = 0;

  try {
    const st = lstatSync(dirPath);
    exists = true;
    isDirectory = st.isDirectory();
  } catch (e) {
    scandirError = e instanceof Error ? e.code : String(e);
  }

  if (exists) {
    try {
      accessSync(dirPath, constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }
    if (isDirectory) {
      try {
        childCount = readdirSync(dirPath).length;
        scandirOk = true;
      } catch (e) {
        scandirError = e instanceof Error ? `${e.code}: ${e.message}` : String(e);
      }
    }
  }

  console.log(
    `[diagnose] ${label}: exists=${exists} readable=${readable} scandirOk=${scandirOk} children=${childCount}` +
      (scandirError ? ` error=${scandirError}` : ""),
  );

  return { label, scandirOk };
}

/** Count files recursively under uploads/images|videos|documents|... */
function countUploadFiles(uploadsRoot) {
  const subDirs = ["images", "videos", "documents", "audio", "svg", "other"];
  let count = 0;
  for (const sub of subDirs) {
    const dir = join(uploadsRoot, sub);
    try {
      for (const name of readdirSync(dir)) {
        try {
          const st = lstatSync(join(dir, name));
          if (st.isFile()) count += 1;
        } catch {
          /* skip */
        }
      }
    } catch {
      /* dir missing */
    }
  }
  return count;
}

function describeSymlink(label, path) {
  if (!existsSync(path)) {
    console.log(`[diagnose] ${label}: missing`);
    return null;
  }
  const st = lstatSync(path);
  if (st.isSymbolicLink()) {
    const target = readSymlinkTarget(path);
    console.log(`[diagnose] ${label}: symlink -> ${target ?? "?"}`);
    return target;
  }
  console.log(
    `[diagnose] ${label}: ${st.isDirectory() ? "directory (not symlink)" : "file"}`,
  );
  return null;
}

function diagnosePersistence() {
  console.log("\n[diagnose] --- persistent media ---");
  console.log("[diagnose] cwd:", cwd);
  console.log("[diagnose] LOCAL_PUBLIC_DIR:", localPublicDir ?? "(unset)");
  console.log("[diagnose] LOCAL_UPLOADS_DIR:", localUploadsDir ?? "(unset)");

  const persistenceTarget = localPublicDir || localUploadsDir;
  if (!persistenceTarget) {
    console.log("[diagnose] persistence: not configured — uploads may be lost on redeploy");
    return;
  }

  const resolvedTarget = localPublicDir
    ? resolve(localPublicDir, "uploads")
    : resolve(persistenceTarget);
  const resolvedCwd = resolve(cwd);
  const insideDeploy = isPathUnder(resolvedCwd, resolvedTarget);
  console.log("[diagnose] resolved uploads write path:", resolvedTarget);
  console.log("[diagnose] uploads target inside deploy cwd:", insideDeploy);
  if (insideDeploy) {
    console.warn(
      "[diagnose] WARNING: uploads persistence path is inside the Git deploy folder. " +
        "Use e.g. /home/u637787491/persistent/public/uploads",
    );
  }

  const validation = validatePersistencePaths({
    cwd: resolvedCwd,
    linkPath: resolve(uploadsDir),
    target: resolvedTarget,
    label: "public/uploads",
  });
  if (validation.ok) {
    console.log("[diagnose] path validation: OK");
  } else {
    console.warn("[diagnose] path validation FAILED:");
    for (const err of validation.errors) {
      console.warn(`  - ${err}`);
    }
  }

  const publicTarget = describeSymlink("public/", publicDir);
  if (publicTarget) {
    console.warn(
      "[diagnose] WARNING: entire public/ is symlinked — unsafe with Git Deploy. " +
        "Only public/uploads should be symlinked to persistent storage.",
    );
  }

  describeSymlink("public/uploads", uploadsDir);

  const targetUploadCount = existsSync(resolvedTarget) ? countUploadFiles(resolvedTarget) : 0;
  const publicUploadCount = existsSync(uploadsDir) ? countUploadFiles(uploadsDir) : 0;

  console.log(`[diagnose] upload files (persistence target): ${targetUploadCount}`);
  console.log(`[diagnose] upload files (cwd/public/uploads): ${publicUploadCount}`);
}

console.log("[diagnose] platform:", platform(), "cwd:", cwd);

probeDir("api.apply-preset", join(apiRoot, "apply-preset"));
probeDir("api.root", apiRoot);
probeDir("catalog.en-us.products", catalogDir);

let apiChildren = [];
try {
  apiChildren = readdirSync(apiRoot);
} catch (e) {
  console.error("[diagnose] api root scandir failed:", e instanceof Error ? e.message : e);
}

const blocked = [];
for (const name of apiChildren.slice(0, 40)) {
  const p = probeDir(`api.${name}`, join(apiRoot, name));
  if (!p.scandirOk) blocked.push(name);
}

console.log("[diagnose] api children:", apiChildren.length, "blocked:", blocked.length);

diagnosePersistence();
