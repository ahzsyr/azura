#!/usr/bin/env node
/**
 * Diagnose src/app/api (and catalog) filesystem access before build.
 * Run: node scripts/deploy/diagnose-hostinger-fs.mjs
 */
import { accessSync, constants, lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";

const apiRoot = join(process.cwd(), "src", "app", "api");
const catalogDir = join(process.cwd(), "src", "data", "en-us", "products");

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

console.log("[diagnose] platform:", platform(), "cwd:", process.cwd());

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
