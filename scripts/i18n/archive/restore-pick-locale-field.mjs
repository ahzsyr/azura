/**
 * Restore pickLocaleField calls stripped by fix-orphan-strings.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const FN = "pickLocaleField";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function gitHeadFile(relPath) {
  try {
    return execSync(`git show HEAD:"${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

let fixed = 0;
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const head = gitHeadFile(rel);
  if (!head) continue;

  const current = readFileSync(file, "utf8");
  const re = new RegExp(`${FN}\\([^)]+\\)`, "g");
  const headCalls = [...head.matchAll(re)].map((m) => m[0]);
  const currentCalls = [...current.matchAll(re)].map((m) => m[0]);
  if (headCalls.length === 0 || headCalls.length !== currentCalls.length) continue;

  let next = current;
  let changed = false;
  for (let i = 0; i < headCalls.length; i++) {
    if (headCalls[i] !== currentCalls[i]) {
      next = next.replace(currentCalls[i], headCalls[i]);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(file, next, "utf8");
    fixed++;
  }
}

console.log(`Restored ${FN} calls in ${fixed} files.`);
